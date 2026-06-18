import { recurringBillRepository } from '../../domain/recurring-bill/recurring-bill.repository';

/**
 * Feature 012: when a recurring-bill instance is paid, its template (conta fixa)
 * learns the payment method, card, and actual amount paid so future materialized
 * instances inherit them (subscription pre-fill). Faturas are skipped.
 * Cash/debit clears the card. Best-effort — never blocks the payment.
 */
export async function learnRecurringPaymentProfile(
  recurringBillId: string | null,
  isFatura: boolean,
  paymentMethod: 'CASH_OR_DEBIT' | 'CREDIT_CARD',
  creditCardId: string | null,
  actualAmountCents: number,
): Promise<void> {
  if (!recurringBillId || isFatura) return;
  await recurringBillRepository.learnPaymentProfile(
    recurringBillId,
    paymentMethod,
    paymentMethod === 'CREDIT_CARD' ? creditCardId : null,
    actualAmountCents,
  );
}
