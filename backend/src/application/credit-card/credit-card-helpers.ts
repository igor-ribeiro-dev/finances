import { AppError, CreditCardErrorCode, type FieldError } from '../../api/errors';
import { creditCardRepository } from '../../domain/credit-card/credit-card.repository';
import type { CreditCard } from '@prisma/client';

/** Narrowing helper for Prisma known-request errors (e.g. 'P2002'). */
export function isPrismaErrorCode(err: unknown, code: string): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === code;
}

function fieldError(field: string, code: string, message: string): FieldError[] {
  return [{ field, code, message }];
}

/** 422 thrown when a P2002 unique violation is caught (name clash among active cards). */
export function duplicateNameError(): AppError {
  const message = 'Já existe um cartão ativo com esse nome.';
  return new AppError(
    CreditCardErrorCode.duplicateName,
    message,
    422,
    fieldError('name', CreditCardErrorCode.duplicateName, message),
  );
}

/** Loads a card scoped to the group or throws 404. */
export async function loadCardOrThrow(id: string, groupId: string): Promise<CreditCard> {
  const card = await creditCardRepository.findByIdInGroup(id, groupId);
  if (!card) {
    throw new AppError(CreditCardErrorCode.notFound, 'Cartão não encontrado.', 404);
  }
  return card;
}
