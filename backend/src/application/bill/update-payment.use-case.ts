import { AppError } from '../../api/errors';
import { billRepository } from '../../domain/bill/bill.repository';

export interface UpdatePaymentInput {
  userId: string;
  groupId: string;
  id: string;
  body: {
    paidDate: string;
    actualAmountCents: number;
    paidByMemberId: string;
    paymentMethod: 'CASH_OR_DEBIT' | 'CREDIT_CARD';
  };
}

export async function updatePaymentUseCase(input: UpdatePaymentInput) {
  const { groupId, id, body, userId } = input;

  const existing = await billRepository.findById(id, groupId);
  if (!existing) throw new AppError('bill.not_found', 'Conta não encontrada.', 404);
  if (existing.status !== 'PAID') {
    throw new AppError(
      'bill.invalid_transition',
      'Apenas contas Pagas podem ter o pagamento editado.',
      409,
    );
  }

  return billRepository.update(id, {
    paidDate: new Date(`${body.paidDate}T00:00:00Z`),
    actualAmountCents: body.actualAmountCents,
    paidByMemberId: body.paidByMemberId,
    paymentMethod: body.paymentMethod,
    updatedById: userId,
  });
}
