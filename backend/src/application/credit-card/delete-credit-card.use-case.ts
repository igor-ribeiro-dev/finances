import { AppError, CreditCardErrorCode } from '../../api/errors';
import { creditCardRepository } from '../../domain/credit-card/credit-card.repository';
import { loadCardOrThrow } from './credit-card-helpers';

export interface DeleteCreditCardInput {
  groupId: string;
  id: string;
}

/** FR-002: a card with any attached bill (purchase or fatura) cannot be deleted. */
export async function deleteCreditCardUseCase(input: DeleteCreditCardInput): Promise<void> {
  const { groupId, id } = input;
  await loadCardOrThrow(id, groupId);
  const billCount = await creditCardRepository.countBills(id);
  if (billCount > 0) {
    throw new AppError(
      CreditCardErrorCode.hasBills,
      'Este cartão possui contas vinculadas. Arquive-o em vez de excluí-lo.',
      409,
    );
  }
  await creditCardRepository.delete(id);
}
