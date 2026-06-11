import { AppError } from '../../api/errors';
import { prisma } from '../../infra/prisma';
import { recurringBillRepository } from '../../domain/recurring-bill/recurring-bill.repository';
import type { RecurrenceInterval } from '../../domain/recurring-bill/recurring-bill.repository';
import { materializeWindowUseCase } from './materialize-window.use-case';

export interface CreateRecurringBillInput {
  userId: string;
  groupId: string;
  body: {
    description: string;
    expectedAmountCents: number;
    dueDay: number;
    interval: RecurrenceInterval;
    startMonth: string; // YYYY-MM
    includeStartMonth?: boolean;
    categoryId?: string | null;
    ownerMemberId?: string | null;
  };
}

function parseMonthDate(month: string): Date {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y as number, (m as number) - 1, 1));
}

function addOneMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

export async function createRecurringBillUseCase(input: CreateRecurringBillInput) {
  const { body, groupId } = input;

  if (body.dueDay < 1 || body.dueDay > 31) {
    throw new AppError('invalid_due_day', 'O dia de vencimento deve estar entre 1 e 31.', 400);
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

  const startMonth = parseMonthDate(body.startMonth);
  const activeFromMonth = body.includeStartMonth ? startMonth : addOneMonth(startMonth);

  const template = await recurringBillRepository.create({
    groupId,
    description: body.description.trim(),
    expectedAmountCents: body.expectedAmountCents,
    dueDay: body.dueDay,
    interval: body.interval,
    startMonth,
    activeFromMonth,
    categoryId: body.categoryId ?? null,
    ownerMemberId: body.ownerMemberId ?? null,
  });

  // Catch-up: materialize bills for current and next month
  await materializeWindowUseCase(groupId);

  return template;
}
