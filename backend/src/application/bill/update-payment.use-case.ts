import { AppError } from '../../api/errors';
import { billRepository } from '../../domain/bill/bill.repository';
import { resolveCreditCardForSpending } from './credit-card-link';
import { learnRecurringPaymentProfile } from './learn-recurring-payment';

export interface UpdatePaymentInput {
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

  // FR-011: editing a credit-card purchase may move it to another card; a fatura
  // keeps its own card link.
  const creditCardId = existing.isFatura
    ? existing.creditCardId
    : await resolveCreditCardForSpending(groupId, body.paymentMethod, body.creditCardId);

  const bill = await billRepository.update(id, {
    paidDate: new Date(`${body.paidDate}T00:00:00Z`),
    actualAmountCents: body.actualAmountCents,
    paidByMemberId: body.paidByMemberId,
    paymentMethod: body.paymentMethod,
    creditCardId,
    updatedById: userId,
  });
  // Correcting the payment updates what the parent conta fixa learned.
  await learnRecurringPaymentProfile(
    existing.recurringBillId,
    existing.isFatura,
    body.paymentMethod,
    creditCardId,
    body.actualAmountCents,
  );
  return bill;
}
