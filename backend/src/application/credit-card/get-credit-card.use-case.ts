import { creditCardRepository } from '../../domain/credit-card/credit-card.repository';
import { loadCardOrThrow } from './credit-card-helpers';
import { currentCycleCloseIso } from './credit-card-cycle';
import {
  type CreditCardDetailResponse,
  type OpenChargeResponse,
} from '../../api/credit-card/credit-card.serializer';

export interface GetCreditCardInput {
  groupId: string;
  id: string;
}

/** FR-006: per-card view — the card plus its open charges and running total. */
export async function getCreditCardUseCase(
  input: GetCreditCardInput,
): Promise<CreditCardDetailResponse> {
  const { groupId, id } = input;
  const card = await loadCardOrThrow(id, groupId);
  const charges = await creditCardRepository.openChargesList(id, groupId);

  const openCharges: OpenChargeResponse[] = charges.map((b) => ({
    id: b.id,
    description: b.description,
    actualAmountCents: b.actualAmountCents ?? 0,
    paidDate: (b.paidDate ?? b.dueDate).toISOString().slice(0, 10),
    paidByMember: b.paidByMember ? { id: b.paidByMember.id, name: b.paidByMember.name } : null,
    category: b.category ? { id: b.category.id, name: b.category.name } : null,
  }));
  const openChargesCents = openCharges.reduce((sum, c) => sum + c.actualAmountCents, 0);

  return {
    id: card.id,
    name: card.name,
    closingDay: card.closingDay,
    status: card.status,
    openChargesCents,
    cycleCloseDate: currentCycleCloseIso(card.closingDay),
    openCharges,
  };
}
