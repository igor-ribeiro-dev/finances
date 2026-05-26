import { Router, type Request, type Response } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireMembership } from '../../middleware/require-membership.middleware';
import { AppError, sendError, sendValidationError, type FieldError } from '../errors';
import {
  createExpenseBody,
  idempotencyKeyHeader,
  zodErrorToFieldErrors,
} from './expense.validators';
import { createExpenseUseCase } from '../../application/expense/create-expense.use-case';
import { mapExpenseToResponse } from './expense.serializer';

export const expenseRouter = Router();

expenseRouter.use(authMiddleware, requireMembership);

expenseRouter.post('/', async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string;
  const groupId = res.locals['groupId'] as string;

  // Validate Idempotency-Key header (optional)
  const rawKey = req.header('Idempotency-Key');
  const keyParse = idempotencyKeyHeader.safeParse(rawKey ?? undefined);
  if (!keyParse.success) {
    sendError(res, 400, 'invalid_idempotency_key', 'Idempotency-Key inválida (deve ser UUID v4).');
    return;
  }
  const idempotencyKey = keyParse.data;

  // Validate body
  const bodyParse = createExpenseBody.safeParse(req.body);
  if (!bodyParse.success) {
    sendValidationError(res, zodErrorToFieldErrors(bodyParse.error));
    return;
  }

  try {
    const result = await createExpenseUseCase({
      userId,
      groupId,
      idempotencyKey,
      body: bodyParse.data,
    });
    const payload = mapExpenseToResponse(result.expense, groupId);
    const status = result.status === 'created' ? 201 : 200;
    res.status(status).json(payload);
  } catch (err) {
    if (err instanceof AppError) {
      if (err.code === 'idempotency_key_conflict') {
        sendError(res, 409, err.code, err.message);
        return;
      }
      if (err.code === 'owner_not_in_group') {
        const fieldErrors: FieldError[] = [
          { field: 'ownerMemberId', code: err.code, message: err.message },
        ];
        sendValidationError(res, fieldErrors);
        return;
      }
      sendError(res, 400, err.code, err.message);
      return;
    }
    sendError(res, 500, 'INTERNAL_ERROR', 'Erro interno.');
  }
});

const notImplemented = (_req: Request, res: Response): void => {
  res.status(501).json({ code: 'not_implemented', message: 'Em implementação.' });
};

expenseRouter.get('/', notImplemented);
expenseRouter.get('/:id', notImplemented);
expenseRouter.patch('/:id', notImplemented);
expenseRouter.delete('/:id', notImplemented);
