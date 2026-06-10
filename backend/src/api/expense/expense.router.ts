import { Router, type Request, type Response } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireMembership } from '../../middleware/require-membership.middleware';
import { AppError, sendError, sendValidationError, type FieldError } from '../errors';
import {
  createExpenseBody,
  idempotencyKeyHeader,
  listExpensesQuery,
  updateExpenseBody,
  zodErrorToFieldErrors,
} from './expense.validators';
import { createExpenseUseCase } from '../../application/expense/create-expense.use-case';
import { listExpensesUseCase } from '../../application/expense/list-expenses.use-case';
import { getExpenseUseCase } from '../../application/expense/get-expense.use-case';
import { updateExpenseUseCase } from '../../application/expense/update-expense.use-case';
import { deleteExpenseUseCase } from '../../application/expense/delete-expense.use-case';
import { mapExpenseToResponse } from './expense.serializer';

export const expenseRouter = Router();

expenseRouter.use(authMiddleware, requireMembership);

function logMutation(event: {
  action: 'create' | 'update' | 'delete';
  outcome: 'success' | 'not_found' | 'validation_error' | 'conflict' | 'error';
  userId: string;
  groupId: string;
  expenseId?: string;
  durationMs: number;
}): void {
  // Structured JSON log — Constitution V. Never includes amountCents/description in clear text.
  console.log(JSON.stringify({ event: 'expense.mutation', ...event }));
}

expenseRouter.post('/', async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string;
  const groupId = res.locals['groupId'] as string;
  const t0 = Date.now();

  const rawKey = req.header('Idempotency-Key');
  const keyParse = idempotencyKeyHeader.safeParse(rawKey ?? undefined);
  if (!keyParse.success) {
    sendError(res, 400, 'invalid_idempotency_key', 'Idempotency-Key inválida (deve ser UUID v4).');
    logMutation({
      action: 'create',
      outcome: 'validation_error',
      userId,
      groupId,
      durationMs: Date.now() - t0,
    });
    return;
  }
  const idempotencyKey = keyParse.data;

  const bodyParse = createExpenseBody.safeParse(req.body);
  if (!bodyParse.success) {
    sendValidationError(res, zodErrorToFieldErrors(bodyParse.error));
    logMutation({
      action: 'create',
      outcome: 'validation_error',
      userId,
      groupId,
      durationMs: Date.now() - t0,
    });
    return;
  }

  try {
    const result = await createExpenseUseCase({
      userId,
      groupId,
      idempotencyKey,
      body: bodyParse.data,
    });
    const payload = mapExpenseToResponse(result.expense, groupId, result.warnings);
    const status = result.status === 'created' ? 201 : 200;
    res.status(status).json(payload);
    logMutation({
      action: 'create',
      outcome: 'success',
      userId,
      groupId,
      expenseId: result.expense.id,
      durationMs: Date.now() - t0,
    });
  } catch (err) {
    if (err instanceof AppError) {
      if (
        err.code === 'idempotency.conflict' ||
        err.code === 'idempotency.cross_resource_conflict'
      ) {
        sendError(res, 409, err.code, err.message);
        logMutation({
          action: 'create',
          outcome: 'conflict',
          userId,
          groupId,
          durationMs: Date.now() - t0,
        });
        return;
      }
      if (err.code === 'owner_not_in_group') {
        const fieldErrors: FieldError[] = [
          { field: 'ownerMemberId', code: err.code, message: err.message },
        ];
        sendValidationError(res, fieldErrors);
        logMutation({
          action: 'create',
          outcome: 'validation_error',
          userId,
          groupId,
          durationMs: Date.now() - t0,
        });
        return;
      }
      sendError(res, 400, err.code, err.message);
      logMutation({
        action: 'create',
        outcome: 'validation_error',
        userId,
        groupId,
        durationMs: Date.now() - t0,
      });
      return;
    }
    sendError(res, 500, 'INTERNAL_ERROR', 'Erro interno.');
    logMutation({
      action: 'create',
      outcome: 'error',
      userId,
      groupId,
      durationMs: Date.now() - t0,
    });
  }
});

expenseRouter.get('/', async (req: Request, res: Response) => {
  const groupId = res.locals['groupId'] as string;

  const queryParse = listExpensesQuery.safeParse(req.query);
  if (!queryParse.success) {
    sendValidationError(res, zodErrorToFieldErrors(queryParse.error));
    return;
  }
  const { limit, cursor } = queryParse.data;

  try {
    const result = await listExpensesUseCase({ groupId, limit, cursor });
    res.status(200).json({
      items: result.items.map((e) => mapExpenseToResponse(e, groupId)),
      nextCursor: result.nextCursor,
    });
  } catch (err) {
    if (err instanceof AppError && err.code === 'invalid_cursor') {
      sendError(res, 400, err.code, err.message);
      return;
    }
    sendError(res, 500, 'INTERNAL_ERROR', 'Erro interno.');
  }
});

expenseRouter.get('/:id', async (req: Request, res: Response) => {
  const groupId = res.locals['groupId'] as string;
  const id = req.params['id'] as string;
  try {
    const expense = await getExpenseUseCase({ groupId, id });
    res.status(200).json(mapExpenseToResponse(expense, groupId));
  } catch (err) {
    if (err instanceof AppError && err.code === 'not_found') {
      sendError(res, 404, err.code, err.message);
      return;
    }
    sendError(res, 500, 'INTERNAL_ERROR', 'Erro interno.');
  }
});

expenseRouter.patch('/:id', async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string;
  const groupId = res.locals['groupId'] as string;
  const id = req.params['id'] as string;
  const t0 = Date.now();

  const bodyParse = updateExpenseBody.safeParse(req.body);
  if (!bodyParse.success) {
    sendValidationError(res, zodErrorToFieldErrors(bodyParse.error));
    logMutation({
      action: 'update',
      outcome: 'validation_error',
      userId,
      groupId,
      expenseId: id,
      durationMs: Date.now() - t0,
    });
    return;
  }

  try {
    const { expense, warnings } = await updateExpenseUseCase({
      userId,
      groupId,
      id,
      body: bodyParse.data,
    });
    res.status(200).json(mapExpenseToResponse(expense, groupId, warnings));
    logMutation({
      action: 'update',
      outcome: 'success',
      userId,
      groupId,
      expenseId: id,
      durationMs: Date.now() - t0,
    });
  } catch (err) {
    if (err instanceof AppError) {
      if (err.code === 'not_found') {
        sendError(res, 404, err.code, err.message);
        logMutation({
          action: 'update',
          outcome: 'not_found',
          userId,
          groupId,
          expenseId: id,
          durationMs: Date.now() - t0,
        });
        return;
      }
      if (err.code === 'owner_not_in_group') {
        const fieldErrors: FieldError[] = [
          { field: 'ownerMemberId', code: err.code, message: err.message },
        ];
        sendValidationError(res, fieldErrors);
        logMutation({
          action: 'update',
          outcome: 'validation_error',
          userId,
          groupId,
          expenseId: id,
          durationMs: Date.now() - t0,
        });
        return;
      }
      sendError(res, 400, err.code, err.message);
      logMutation({
        action: 'update',
        outcome: 'validation_error',
        userId,
        groupId,
        expenseId: id,
        durationMs: Date.now() - t0,
      });
      return;
    }
    sendError(res, 500, 'INTERNAL_ERROR', 'Erro interno.');
    logMutation({
      action: 'update',
      outcome: 'error',
      userId,
      groupId,
      expenseId: id,
      durationMs: Date.now() - t0,
    });
  }
});

expenseRouter.delete('/:id', async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string;
  const groupId = res.locals['groupId'] as string;
  const id = req.params['id'] as string;
  const t0 = Date.now();

  try {
    await deleteExpenseUseCase({ groupId, id });
    res.status(204).send();
    logMutation({
      action: 'delete',
      outcome: 'success',
      userId,
      groupId,
      expenseId: id,
      durationMs: Date.now() - t0,
    });
  } catch (err) {
    if (err instanceof AppError && err.code === 'not_found') {
      sendError(res, 404, err.code, err.message);
      logMutation({
        action: 'delete',
        outcome: 'not_found',
        userId,
        groupId,
        expenseId: id,
        durationMs: Date.now() - t0,
      });
      return;
    }
    sendError(res, 500, 'INTERNAL_ERROR', 'Erro interno.');
    logMutation({
      action: 'delete',
      outcome: 'error',
      userId,
      groupId,
      expenseId: id,
      durationMs: Date.now() - t0,
    });
  }
});
