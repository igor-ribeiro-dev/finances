import type { Prisma, CreditCard } from '@prisma/client';
import { prisma } from '../../infra/prisma';

export interface CreateCreditCardData {
  groupId: string;
  name: string;
  closingDay: number;
}

export interface UpdateCreditCardData {
  name?: string;
  closingDay?: number;
}

/** Open-charges sum per card (feature 012, US3). */
export interface OpenChargesByCard {
  creditCardId: string;
  openChargesCents: number;
}

export const creditCardRepository = {
  async create(data: CreateCreditCardData, tx?: Prisma.TransactionClient): Promise<CreditCard> {
    const client = tx ?? prisma;
    return client.creditCard.create({ data });
  },

  async findByIdInGroup(id: string, groupId: string): Promise<CreditCard | null> {
    return prisma.creditCard.findFirst({ where: { id, groupId } });
  },

  /** All cards for the group (active + archived), active first then by name. */
  async listByGroup(groupId: string): Promise<CreditCard[]> {
    return prisma.creditCard.findMany({
      where: { groupId },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    });
  },

  async update(
    id: string,
    data: UpdateCreditCardData,
    tx?: Prisma.TransactionClient,
  ): Promise<CreditCard> {
    const client = tx ?? prisma;
    return client.creditCard.update({ where: { id }, data });
  },

  async archive(id: string): Promise<CreditCard> {
    return prisma.creditCard.update({ where: { id }, data: { status: 'ARCHIVED' } });
  },

  /** Bills (purchases or faturas) attached to the card — blocks deletion (FR-002). */
  async countBills(creditCardId: string): Promise<number> {
    return prisma.bill.count({ where: { creditCardId } });
  },

  async delete(id: string): Promise<void> {
    await prisma.creditCard.delete({ where: { id } });
  },

  /**
   * Open-charges sum per card (US3): PAID credit-card purchases not yet settled
   * by a paid fatura. groupBy over the (creditCardId) index.
   */
  async openChargesByCard(groupId: string): Promise<OpenChargesByCard[]> {
    const rows = await prisma.bill.groupBy({
      by: ['creditCardId'],
      where: {
        groupId,
        isFatura: false,
        paymentMethod: 'CREDIT_CARD',
        status: 'PAID',
        settledByFaturaId: null,
        creditCardId: { not: null },
      },
      _sum: { actualAmountCents: true },
    });
    return rows
      .filter((r) => r.creditCardId !== null)
      .map((r) => ({
        creditCardId: r.creditCardId as string,
        openChargesCents: r._sum.actualAmountCents ?? 0,
      }));
  },

  /** Open-charge purchases for one card (US3 per-card view). */
  async openChargesList(creditCardId: string, groupId: string) {
    return prisma.bill.findMany({
      where: {
        groupId,
        creditCardId,
        isFatura: false,
        paymentMethod: 'CREDIT_CARD',
        status: 'PAID',
        settledByFaturaId: null,
      },
      orderBy: [{ paidDate: 'asc' }, { createdAt: 'asc' }],
      include: {
        paidByMember: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    });
  },
};
