import { AppError } from '../../api/errors';
import { prisma } from '../../infra/prisma';
import { billRepository } from '../../domain/bill/bill.repository';

export async function revertPaymentUseCase(groupId: string, id: string) {
  const existing = await billRepository.findById(id, groupId);
  if (!existing) throw new AppError('bill.not_found', 'Conta não encontrada.', 404);
  if (existing.status !== 'PAID') {
    throw new AppError(
      'bill.invalid_transition',
      'Apenas contas Pagas podem ter o pagamento revertido.',
      409,
    );
  }

  return prisma.$transaction(async (tx) => {
    if (existing.expenseId) {
      await tx.expense.delete({ where: { id: existing.expenseId } });
    }
    return billRepository.update(
      id,
      {
        status: 'PENDING',
        paidDate: null,
        actualAmountCents: null,
        paidByMemberId: null,
        paymentMethod: null,
        expenseId: null,
      },
      tx,
    );
  });
}
