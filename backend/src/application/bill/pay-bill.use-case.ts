import { AppError } from '../../api/errors';
import { billRepository } from '../../domain/bill/bill.repository';

export interface PayBillInput {
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

export async function payBillUseCase(input: PayBillInput) {
  const { groupId, id, body, userId } = input;

  const existing = await billRepository.findById(id, groupId);
  if (!existing) throw new AppError('bill.not_found', 'Conta não encontrada.', 404);
  if (existing.status !== 'PENDING') {
    throw new AppError('bill.invalid_transition', 'Apenas contas Pendentes podem ser pagas.', 409);
  }

  return billRepository.update(id, {
    status: 'PAID',
    paidDate: new Date(`${body.paidDate}T00:00:00Z`),
    actualAmountCents: body.actualAmountCents,
    paidByMemberId: body.paidByMemberId,
    paymentMethod: body.paymentMethod,
    updatedById: userId,
  });
}
