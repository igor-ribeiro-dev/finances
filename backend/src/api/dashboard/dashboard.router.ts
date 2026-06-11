import { Router, type Request, type Response } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireMembership } from '../../middleware/require-membership.middleware';
import { AppError, DashboardErrorCode, sendError } from '../errors';
import { dashboardMonthQuery } from './dashboard.validators';
import { getMonthDashboardUseCase } from '../../application/dashboard/get-month-dashboard.use-case';

export const dashboardRouter = Router();

// Auth + membership gate (injects res.locals.userId/groupId) — FR-019.
dashboardRouter.use(authMiddleware, requireMembership);

function logAccess(event: {
  outcome: 'success' | 'validation_error' | 'error';
  userId: string;
  groupId: string;
  month?: string;
  durationMs: number;
}): void {
  // Structured JSON log — Constitution V. No monetary values in clear text.
  console.log(JSON.stringify({ event: 'dashboard.read', ...event }));
}

dashboardRouter.get('/', async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string;
  const groupId = res.locals['groupId'] as string;
  const t0 = Date.now();

  const parse = dashboardMonthQuery.safeParse(req.query);
  if (!parse.success) {
    sendError(res, 400, DashboardErrorCode.invalidMonth, 'Mês inválido. Use o formato YYYY-MM.', [
      { field: 'month', code: 'invalid_format', message: 'Informe o mês no formato YYYY-MM.' },
    ]);
    logAccess({ outcome: 'validation_error', userId, groupId, durationMs: Date.now() - t0 });
    return;
  }

  try {
    const result = await getMonthDashboardUseCase({ groupId, month: parse.data.month });
    res.status(200).json(result);
    logAccess({
      outcome: 'success',
      userId,
      groupId,
      month: parse.data.month,
      durationMs: Date.now() - t0,
    });
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.status ?? 400, err.code, err.message, err.fieldErrors);
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'Erro interno.');
    }
    logAccess({
      outcome: 'error',
      userId,
      groupId,
      month: parse.data.month,
      durationMs: Date.now() - t0,
    });
  }
});
