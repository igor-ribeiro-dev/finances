import { Router, type Request, type Response } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireMembership } from '../../middleware/require-membership.middleware';
import { AppError, BudgetErrorCode, sendError, sendValidationError } from '../errors';
import {
  monthQuery,
  upsertMonthBudgetBody,
  copyMonthBudgetBody,
  zodErrorToFieldErrors,
} from './budget.validators';
import { getMonthBudgetUseCase } from '../../application/budget/get-month-budget.use-case';
import { upsertMonthBudgetUseCase } from '../../application/budget/upsert-month-budget.use-case';
import { copyPreviousMonthUseCase } from '../../application/budget/copy-previous-month.use-case';

export const budgetRouter = Router();

// Auth + membership gate every budget route (injects res.locals.userId/groupId).
budgetRouter.use(authMiddleware, requireMembership);

function logMutation(event: {
  action: 'upsert' | 'copy';
  outcome: 'success' | 'validation_error' | 'not_found' | 'error';
  userId: string;
  groupId: string;
  month?: string;
  durationMs: number;
}): void {
  // Structured JSON log — Constitution V. No monetary values in clear text.
  console.log(JSON.stringify({ event: 'budget.mutation', ...event }));
}

/** Maps an AppError (or unknown) onto the flat error envelope. */
function sendAppError(res: Response, err: unknown): 'handled' | 'internal' {
  if (err instanceof AppError) {
    sendError(res, err.status ?? 400, err.code, err.message, err.fieldErrors);
    return 'handled';
  }
  sendError(res, 500, 'INTERNAL_ERROR', 'Erro interno.');
  return 'internal';
}

budgetRouter.get('/', async (req: Request, res: Response) => {
  const groupId = res.locals['groupId'] as string;
  const monthParse = monthQuery.safeParse(req.query);
  if (!monthParse.success) {
    sendError(res, 400, BudgetErrorCode.invalidMonth, 'Mês inválido (use YYYY-MM).');
    return;
  }
  try {
    const result = await getMonthBudgetUseCase({ groupId, month: monthParse.data.month });
    res.status(200).json(result);
  } catch (err) {
    sendAppError(res, err);
  }
});

budgetRouter.put('/', async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string;
  const groupId = res.locals['groupId'] as string;
  const t0 = Date.now();

  const monthParse = monthQuery.safeParse(req.query);
  if (!monthParse.success) {
    sendError(res, 400, BudgetErrorCode.invalidMonth, 'Mês inválido (use YYYY-MM).');
    return;
  }
  const bodyParse = upsertMonthBudgetBody.safeParse(req.body);
  if (!bodyParse.success) {
    sendValidationError(res, zodErrorToFieldErrors(bodyParse.error));
    logMutation({
      action: 'upsert',
      outcome: 'validation_error',
      userId,
      groupId,
      month: monthParse.data.month,
      durationMs: Date.now() - t0,
    });
    return;
  }

  try {
    const result = await upsertMonthBudgetUseCase({
      groupId,
      month: monthParse.data.month,
      body: bodyParse.data,
    });
    res.status(200).json(result);
    logMutation({
      action: 'upsert',
      outcome: 'success',
      userId,
      groupId,
      month: monthParse.data.month,
      durationMs: Date.now() - t0,
    });
  } catch (err) {
    const outcome = sendAppError(res, err);
    logMutation({
      action: 'upsert',
      outcome: outcome === 'internal' ? 'error' : 'not_found',
      userId,
      groupId,
      month: monthParse.data.month,
      durationMs: Date.now() - t0,
    });
  }
});

budgetRouter.post('/copy', async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string;
  const groupId = res.locals['groupId'] as string;
  const t0 = Date.now();

  const bodyParse = copyMonthBudgetBody.safeParse(req.body);
  if (!bodyParse.success) {
    sendError(res, 400, BudgetErrorCode.invalidMonth, 'Mês inválido (use YYYY-MM).');
    return;
  }

  try {
    const result = await copyPreviousMonthUseCase({
      groupId,
      fromMonth: bodyParse.data.fromMonth,
      toMonth: bodyParse.data.toMonth,
    });
    res.status(200).json(result);
    logMutation({
      action: 'copy',
      outcome: 'success',
      userId,
      groupId,
      month: bodyParse.data.toMonth,
      durationMs: Date.now() - t0,
    });
  } catch (err) {
    const outcome = sendAppError(res, err);
    logMutation({
      action: 'copy',
      outcome: outcome === 'internal' ? 'error' : 'not_found',
      userId,
      groupId,
      month: bodyParse.data.toMonth,
      durationMs: Date.now() - t0,
    });
  }
});
