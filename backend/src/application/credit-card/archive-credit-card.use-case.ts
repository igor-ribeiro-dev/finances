import type { CreditCard } from '@prisma/client';
import { creditCardRepository } from '../../domain/credit-card/credit-card.repository';
import { loadCardOrThrow } from './credit-card-helpers';

export interface ArchiveCreditCardInput {
  groupId: string;
  id: string;
}

/** FR-002: archiving removes the card from new-spending pickers but preserves history. */
export async function archiveCreditCardUseCase(input: ArchiveCreditCardInput): Promise<CreditCard> {
  const { groupId, id } = input;
  await loadCardOrThrow(id, groupId);
  return creditCardRepository.archive(id);
}
