import { AppError } from '../../api/errors';
import { prisma } from '../../infra/prisma';
import { billRepository } from '../../domain/bill/bill.repository';

export async function revertPaymentUseCase(groupId: string, id: string, userId: string) {
  const existing = await billRepository.findById(id, groupId);
  if (!existing) throw new AppError('bill.not_found', 'Conta não encontrada.', 404);
  if (existing.status !== 'PAID') {
    throw new AppError(
      'bill.invalid_transition',
      'Apenas contas Pagas podem ter o pagamento revertido.',
      409,
    );
  }

  const revertData = {
    status: 'PENDING' as const,
    paidDate: null,
    actualAmountCents: null,
    paidByMemberId: null,
    paymentMethod: null,
    updatedById: userId,
  };

  // FR-009: reverting a fatura restores exactly the charges it had settled,
  // atomically with the revert.
  if (existing.isFatura) {
    return prisma.$transaction(async (tx) => {
      const bill = await billRepository.update(id, revertData, tx);
      await billRepository.unsettleByFatura(id, tx);
      return bill;
    });
  }

  return billRepository.update(id, revertData);
}
