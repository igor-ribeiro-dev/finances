import { AppError, CreditCardErrorCode } from '../../api/errors';
import { creditCardRepository } from '../../domain/credit-card/credit-card.repository';

/**
 * Resolves and validates the creditCardId for a spending given its payment
 * method (FR-003). Returns the value to persist on the bill: the card id for a
 * credit-card purchase, or null for cash/debit.
 *
 *  - CASH_OR_DEBIT + a card        → credit_card.not_allowed (400)
 *  - CREDIT_CARD without a card    → credit_card.required (400)
 *  - CREDIT_CARD + unknown card    → credit_card.not_found (404)
 *  - CREDIT_CARD + archived card   → credit_card.not_active (400)
 */
export async function resolveCreditCardForSpending(
  groupId: string,
  paymentMethod: 'CASH_OR_DEBIT' | 'CREDIT_CARD',
  creditCardId: string | null | undefined,
): Promise<string | null> {
  if (paymentMethod === 'CASH_OR_DEBIT') {
    if (creditCardId) {
      throw new AppError(
        CreditCardErrorCode.notAllowed,
        'Pagamento em dinheiro/débito não pode ter cartão de crédito.',
        400,
      );
    }
    return null;
  }

  if (!creditCardId) {
    throw new AppError(
      CreditCardErrorCode.required,
      'Selecione o cartão de crédito utilizado.',
      400,
    );
  }
  const card = await creditCardRepository.findByIdInGroup(creditCardId, groupId);
  if (!card) {
    throw new AppError(CreditCardErrorCode.notFound, 'Cartão não encontrado.', 404);
  }
  if (card.status !== 'ACTIVE') {
    throw new AppError(
      CreditCardErrorCode.notActive,
      'Este cartão está arquivado. Reative-o ou escolha outro.',
      400,
    );
  }
  return creditCardId;
}
