import { AppError } from '../../api/errors';
import { prisma } from '../../infra/prisma';
import { billRepository } from '../../domain/bill/bill.repository';
import { resolveCreditCardForSpending } from './credit-card-link';

export interface PayBillInput {
  userId: string;
  groupId: string;
  id: string;
  body: {
    paidDate: string;
    actualAmountCents: number;
    paidByMemberId: string;
    paymentMethod: 'CASH_OR_DEBIT' | 'CREDIT_CARD';
    creditCardId?: string | null;
  };
}

export async function payBillUseCase(input: PayBillInput) {
  const { groupId, id, body, userId } = input;

  const existing = await billRepository.findById(id, groupId);
  if (!existing) throw new AppError('bill.not_found', 'Conta não encontrada.', 404);
  if (existing.status !== 'PENDING') {
    throw new AppError('bill.invalid_transition', 'Apenas contas Pendentes podem ser pagas.', 409);
  }

  // A fatura keeps its own creditCardId (the card it settles); for a regular
  // bill, paying by credit card links it to the chosen card (FR-003).
  const creditCardId = existing.isFatura
    ? existing.creditCardId
    : await resolveCreditCardForSpending(groupId, body.paymentMethod, body.creditCardId);

  const payData = {
    status: 'PAID' as const,
    paidDate: new Date(`${body.paidDate}T00:00:00Z`),
    actualAmountCents: body.actualAmountCents,
    paidByMemberId: body.paidByMemberId,
    paymentMethod: body.paymentMethod,
    creditCardId,
    updatedById: userId,
  };

  // FR-009: paying a fatura settles, by snapshot, all of the card's currently
  // open charges — atomically with the payment itself.
  if (existing.isFatura && existing.creditCardId) {
    const cardId = existing.creditCardId;
    return prisma.$transaction(async (tx) => {
      const bill = await billRepository.update(id, payData, tx);
      await billRepository.settleOpenCharges(cardId, id, groupId, tx);
      return bill;
    });
  }

  return billRepository.update(id, payData);
}
