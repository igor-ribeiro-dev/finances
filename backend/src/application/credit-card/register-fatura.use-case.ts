import { AppError, FaturaErrorCode } from '../../api/errors';
import { billRepository, type BillWithRelations } from '../../domain/bill/bill.repository';
import { loadCardOrThrow } from './credit-card-helpers';
import type { RegisterFaturaBody } from '../../api/credit-card/credit-card.validators';

export interface RegisterFaturaInput {
  groupId: string;
  userId: string;
  cardId: string;
  body: RegisterFaturaBody;
}

/**
 * FR-005/FR-008: register a card's fatura as a PENDING bill (isFatura=true) via
 * the dedicated action. Accepts an active OR archived card (FR-002 edge case).
 * FR-012a: at most one pending fatura per card.
 */
export async function registerFaturaUseCase(
  input: RegisterFaturaInput,
): Promise<BillWithRelations> {
  const { groupId, userId, cardId, body } = input;

  const card = await loadCardOrThrow(cardId, groupId);

  const pending = await billRepository.countPendingFaturas(cardId, groupId);
  if (pending > 0) {
    throw new AppError(
      FaturaErrorCode.pendingExists,
      'Já existe uma fatura pendente para este cartão. Pague ou cancele a fatura atual antes de registrar outra.',
      409,
    );
  }

  const dueDate = new Date(`${body.dueDate}T00:00:00Z`);
  const [y, m] = body.dueDate.split('-').map(Number);
  const month = new Date(Date.UTC(y as number, (m as number) - 1, 1));

  return billRepository.create({
    groupId,
    description: body.description?.trim() || `Fatura ${card.name}`,
    expectedAmountCents: body.expectedAmountCents,
    dueDate,
    month,
    status: 'PENDING',
    creditCardId: cardId,
    isFatura: true,
    createdById: userId,
    updatedById: userId,
  });
}
