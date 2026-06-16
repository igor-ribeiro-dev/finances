import { AppError } from '../../api/errors';
import { prisma } from '../../infra/prisma';
import { billRepository } from '../../domain/bill/bill.repository';
import type { LogSpendingBody } from '../../api/bill/bill.validators';

export interface LogSpendingInput {
  userId: string;
  groupId: string;
  body: LogSpendingBody;
}

export async function logSpendingUseCase(input: LogSpendingInput) {
  const { userId, groupId, body } = input;

  const member = await prisma.user.findFirst({
    where: { id: body.paidByMemberId, familyGroupId: groupId },
    select: { id: true },
  });
  if (!member) {
    throw new AppError('owner_not_in_group', 'Membro responsável não pertence ao grupo.', 400);
  }

  const date = new Date(`${body.date}T00:00:00Z`);
  const [y, m] = body.date.split('-').map(Number);
  const month = new Date(Date.UTC(y as number, (m as number) - 1, 1));

  return billRepository.create({
    groupId,
    description: body.description,
    expectedAmountCents: body.amountCents,
    dueDate: date,
    month,
    status: 'PAID',
    paidDate: date,
    actualAmountCents: body.amountCents,
    paidByMemberId: body.paidByMemberId,
    paymentMethod: body.paymentMethod,
    categoryId: body.categoryId ?? null,
    ownerMemberId: null,
    recurringBillId: null,
    createdById: userId,
    updatedById: userId,
  });
}
