import type { CreditCard } from '@prisma/client';
import { prisma } from '../../infra/prisma';
import { creditCardRepository } from '../../domain/credit-card/credit-card.repository';
import { duplicateNameError, isPrismaErrorCode } from './credit-card-helpers';
import type { CreateCardBody } from '../../api/credit-card/credit-card.validators';

export interface CreateCreditCardInput {
  groupId: string;
  body: CreateCardBody;
}

export async function createCreditCardUseCase(input: CreateCreditCardInput): Promise<CreditCard> {
  const { groupId, body } = input;
  // DB-enforced uniqueness among ACTIVE cards (partial unique index) → P2002
  // mapped to credit_card.duplicate_name (race-safe).
  return prisma.$transaction(async (tx) => {
    try {
      return await creditCardRepository.create(
        { groupId, name: body.name, closingDay: body.closingDay },
        tx,
      );
    } catch (err) {
      if (isPrismaErrorCode(err, 'P2002')) throw duplicateNameError();
      throw err;
    }
  });
}
