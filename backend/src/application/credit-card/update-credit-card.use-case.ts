import type { CreditCard } from '@prisma/client';
import { prisma } from '../../infra/prisma';
import { creditCardRepository } from '../../domain/credit-card/credit-card.repository';
import { duplicateNameError, isPrismaErrorCode, loadCardOrThrow } from './credit-card-helpers';
import type { UpdateCardBody } from '../../api/credit-card/credit-card.validators';

export interface UpdateCreditCardInput {
  groupId: string;
  id: string;
  body: UpdateCardBody;
}

export async function updateCreditCardUseCase(input: UpdateCreditCardInput): Promise<CreditCard> {
  const { groupId, id, body } = input;
  await loadCardOrThrow(id, groupId);
  return prisma.$transaction(async (tx) => {
    try {
      return await creditCardRepository.update(
        id,
        {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.closingDay !== undefined ? { closingDay: body.closingDay } : {}),
        },
        tx,
      );
    } catch (err) {
      if (isPrismaErrorCode(err, 'P2002')) throw duplicateNameError();
      throw err;
    }
  });
}
