import { creditCardRepository } from '../../domain/credit-card/credit-card.repository';
import {
  mapCreditCardToResponse,
  type CreditCardResponse,
} from '../../api/credit-card/credit-card.serializer';

export interface ListCreditCardsInput {
  groupId: string;
}

/** FR-007: lists cards with each card's accumulated open charges. */
export async function listCreditCardsUseCase(
  input: ListCreditCardsInput,
): Promise<CreditCardResponse[]> {
  const { groupId } = input;
  const [cards, openCharges] = await Promise.all([
    creditCardRepository.listByGroup(groupId),
    creditCardRepository.openChargesByCard(groupId),
  ]);
  const openByCard = new Map(openCharges.map((o) => [o.creditCardId, o.openChargesCents]));
  return cards.map((card) => mapCreditCardToResponse(card, openByCard.get(card.id) ?? 0));
}
