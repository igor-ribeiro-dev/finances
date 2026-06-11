import { AppError } from '../../api/errors';
import { prisma } from '../../infra/prisma';
import { billRepository } from '../../domain/bill/bill.repository';

export interface CreateBillInput {
  userId: string;
  groupId: string;
  body: {
    description: string;
    expectedAmountCents: number;
    dueDate: string;
    categoryId?: string | null;
    ownerMemberId?: string | null;
  };
}

export async function createBillUseCase(input: CreateBillInput) {
  const { body, groupId } = input;

  if (body.ownerMemberId) {
    const member = await prisma.user.findFirst({
      where: { id: body.ownerMemberId, familyGroupId: groupId },
      select: { id: true },
    });
    if (!member) {
      throw new AppError('owner_not_in_group', 'Membro responsável não pertence ao grupo.', 400);
    }
  }

  const dueDate = new Date(`${body.dueDate}T00:00:00Z`);
  const month = new Date(Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), 1));

  return billRepository.create({
    groupId,
    description: body.description.trim(),
    expectedAmountCents: body.expectedAmountCents,
    dueDate,
    month,
    categoryId: body.categoryId ?? null,
    ownerMemberId: body.ownerMemberId ?? null,
  });
}
