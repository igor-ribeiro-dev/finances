import { AppError } from '../../api/errors';
import { prisma } from '../../infra/prisma';
import { recurringBillRepository } from '../../domain/recurring-bill/recurring-bill.repository';
import { clampDueDay } from './recurrence-engine';

export interface UpdateRecurringBillInput {
  userId: string;
  groupId: string;
  id: string;
  body: {
    description?: string;
    expectedAmountCents?: number;
    dueDay?: number;
    categoryId?: string | null;
    ownerMemberId?: string | null;
  };
}

function getCurrentMonthDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function updateRecurringBillUseCase(input: UpdateRecurringBillInput) {
  const { id, groupId, body } = input;

  const existing = await recurringBillRepository.findById(id, groupId);
  if (!existing) {
    throw new AppError('recurring_bill_not_found', 'Conta recorrente não encontrada.', 404);
  }

  if (existing.status === 'STOPPED' || existing.deletedAt !== null) {
    throw new AppError(
      'recurring_bill_not_editable',
      'Não é possível editar uma conta recorrente parada ou excluída.',
      409,
    );
  }

  if (body.ownerMemberId) {
    const member = await prisma.user.findFirst({
      where: { id: body.ownerMemberId, familyGroupId: groupId },
      select: { id: true },
    });
    if (!member) {
      throw new AppError('owner_not_in_group', 'Membro responsável não pertence ao grupo.', 400);
    }
  }

  const updated = await recurringBillRepository.update(id, {
    description: body.description !== undefined ? body.description.trim() : undefined,
    expectedAmountCents: body.expectedAmountCents,
    dueDay: body.dueDay,
    categoryId: body.categoryId,
    ownerMemberId: body.ownerMemberId,
  });

  const currentMonthDate = getCurrentMonthDate();

  // Propagate changes to future PENDING bills
  if (body.dueDay !== undefined && body.dueDay !== existing.dueDay) {
    // dueDay changed: update each future pending bill's dueDate individually
    const futurePendingBills = await prisma.bill.findMany({
      where: {
        recurringBillId: id,
        status: 'PENDING',
        month: { gt: currentMonthDate },
      },
      select: { id: true, month: true },
    });

    for (const bill of futurePendingBills) {
      const year = bill.month.getUTCFullYear();
      const monthIndex = bill.month.getUTCMonth();
      const clampedDay = clampDueDay(body.dueDay, year, monthIndex);
      const newDueDate = new Date(Date.UTC(year, monthIndex, clampedDay));
      await prisma.bill.update({
        where: { id: bill.id },
        data: { dueDate: newDueDate },
      });
    }
  }

  // Propagate other changed fields to future PENDING bills
  const propagateData: Record<string, unknown> = {};
  if (body.description !== undefined) propagateData['description'] = body.description.trim();
  if (body.expectedAmountCents !== undefined)
    propagateData['expectedAmountCents'] = body.expectedAmountCents;
  if (body.categoryId !== undefined) propagateData['categoryId'] = body.categoryId;
  if (body.ownerMemberId !== undefined) propagateData['ownerMemberId'] = body.ownerMemberId;

  if (Object.keys(propagateData).length > 0) {
    await prisma.bill.updateMany({
      where: {
        recurringBillId: id,
        status: 'PENDING',
        month: { gt: currentMonthDate },
      },
      data: propagateData,
    });
  }

  return updated;
}
