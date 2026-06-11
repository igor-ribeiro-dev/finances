import { AppError } from '../../api/errors';
import { billRepository } from '../../domain/bill/bill.repository';

export interface UpdateBillInput {
  groupId: string;
  id: string;
  body: {
    description?: string;
    expectedAmountCents?: number;
    dueDate?: string;
    categoryId?: string | null;
    ownerMemberId?: string | null;
  };
}

export async function updateBillUseCase(input: UpdateBillInput) {
  const existing = await billRepository.findById(input.id, input.groupId);
  if (!existing) throw new AppError('bill.not_found', 'Conta não encontrada.', 404);
  if (existing.status !== 'PENDING') {
    throw new AppError(
      'bill.invalid_transition',
      'Só é possível editar contas com status Pendente.',
      409,
    );
  }

  const data: Parameters<typeof billRepository.update>[1] = {};
  if (input.body.description !== undefined) data.description = input.body.description.trim();
  if (input.body.expectedAmountCents !== undefined)
    data.expectedAmountCents = input.body.expectedAmountCents;
  if (input.body.categoryId !== undefined) data.categoryId = input.body.categoryId ?? null;
  if (input.body.ownerMemberId !== undefined) data.ownerMemberId = input.body.ownerMemberId ?? null;

  if (input.body.dueDate !== undefined) {
    const dueDate = new Date(`${input.body.dueDate}T00:00:00Z`);
    data.dueDate = dueDate;
    data.month = new Date(Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), 1));
  }

  return billRepository.update(input.id, data);
}
