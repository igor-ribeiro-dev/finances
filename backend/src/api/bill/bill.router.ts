import { Router, type Request, type Response } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireMembership } from '../../middleware/require-membership.middleware';
import { AppError, sendError, sendValidationError } from '../errors';
import {
  monthQuerySchema,
  createBillBody,
  updateBillBody,
  payBillBody,
  updatePaymentBody,
  copyBillsBody,
  zodErrorToFieldErrors,
} from './bill.validators';
import { listMonthBillsUseCase } from '../../application/bill/list-month-bills.use-case';
import { createBillUseCase } from '../../application/bill/create-bill.use-case';
import { updateBillUseCase } from '../../application/bill/update-bill.use-case';
import { deleteBillUseCase } from '../../application/bill/delete-bill.use-case';
import { copyPreviousMonthUseCase } from '../../application/bill/copy-previous-month.use-case';
import { payBillUseCase } from '../../application/bill/pay-bill.use-case';
import { updatePaymentUseCase } from '../../application/bill/update-payment.use-case';
import { revertPaymentUseCase } from '../../application/bill/revert-payment.use-case';
import {
  cancelBillUseCase,
  reactivateBillUseCase,
} from '../../application/bill/cancel-bill.use-case';
import { mapBillToResponse } from './bill.serializer';

export const billRouter = Router();

billRouter.use(authMiddleware, requireMembership);

function logMutation(event: {
  action: string;
  outcome: string;
  userId: string;
  groupId: string;
  billId?: string;
  durationMs: number;
}): void {
  console.log(JSON.stringify({ event: 'bill.mutation', ...event }));
}

billRouter.get('/', async (req: Request, res: Response) => {
  const groupId = res.locals['groupId'] as string;

  const q = monthQuerySchema.safeParse(req.query);
  if (!q.success) {
    sendValidationError(res, zodErrorToFieldErrors(q.error));
    return;
  }

  try {
    const result = await listMonthBillsUseCase({ groupId, month: q.data.month });
    res.json(result);
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.status ?? 500, err.code, err.message);
      return;
    }
    console.error(err);
    sendError(res, 500, 'internal_error', 'Erro interno.');
  }
});

billRouter.post('/copy', async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string;
  const groupId = res.locals['groupId'] as string;
  const t0 = Date.now();

  const body = copyBillsBody.safeParse(req.body);
  if (!body.success) {
    sendValidationError(res, zodErrorToFieldErrors(body.error));
    return;
  }

  try {
    const result = await copyPreviousMonthUseCase({
      groupId,
      fromMonth: body.data.fromMonth,
      toMonth: body.data.toMonth,
      dryRun: body.data.dryRun,
    });
    logMutation({
      action: 'copy',
      outcome: 'success',
      userId,
      groupId,
      durationMs: Date.now() - t0,
    });
    res.json(result);
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.status ?? 500, err.code, err.message);
      return;
    }
    console.error(err);
    sendError(res, 500, 'internal_error', 'Erro interno.');
  }
});

billRouter.post('/', async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string;
  const groupId = res.locals['groupId'] as string;
  const t0 = Date.now();

  const body = createBillBody.safeParse(req.body);
  if (!body.success) {
    sendValidationError(res, zodErrorToFieldErrors(body.error));
    return;
  }

  try {
    const bill = await createBillUseCase({ userId, groupId, body: body.data });
    logMutation({
      action: 'create',
      outcome: 'success',
      userId,
      groupId,
      billId: bill.id,
      durationMs: Date.now() - t0,
    });
    res.status(201).json({ bill: mapBillToResponse(bill) });
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.status ?? 400, err.code, err.message);
      return;
    }
    console.error(err);
    sendError(res, 500, 'internal_error', 'Erro interno.');
  }
});

billRouter.patch('/:id', async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string;
  const groupId = res.locals['groupId'] as string;
  const { id } = req.params;
  const t0 = Date.now();

  const body = updateBillBody.safeParse(req.body);
  if (!body.success) {
    sendValidationError(res, zodErrorToFieldErrors(body.error));
    return;
  }

  try {
    const bill = await updateBillUseCase({ groupId, id: id as string, body: body.data });
    logMutation({
      action: 'update',
      outcome: 'success',
      userId,
      groupId,
      billId: id,
      durationMs: Date.now() - t0,
    });
    res.json({ bill: mapBillToResponse(bill) });
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.status ?? 400, err.code, err.message);
      return;
    }
    console.error(err);
    sendError(res, 500, 'internal_error', 'Erro interno.');
  }
});

billRouter.delete('/:id', async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string;
  const groupId = res.locals['groupId'] as string;
  const { id } = req.params;
  const t0 = Date.now();

  try {
    await deleteBillUseCase(groupId, id as string);
    logMutation({
      action: 'delete',
      outcome: 'success',
      userId,
      groupId,
      billId: id,
      durationMs: Date.now() - t0,
    });
    res.status(204).send();
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.status ?? 400, err.code, err.message);
      return;
    }
    console.error(err);
    sendError(res, 500, 'internal_error', 'Erro interno.');
  }
});

billRouter.post('/:id/pay', async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string;
  const groupId = res.locals['groupId'] as string;
  const { id } = req.params;
  const t0 = Date.now();

  const body = payBillBody.safeParse(req.body);
  if (!body.success) {
    sendValidationError(res, zodErrorToFieldErrors(body.error));
    return;
  }

  try {
    const bill = await payBillUseCase({ userId, groupId, id: id as string, body: body.data });
    logMutation({
      action: 'pay',
      outcome: 'success',
      userId,
      groupId,
      billId: id,
      durationMs: Date.now() - t0,
    });
    res.json({ bill: mapBillToResponse(bill) });
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.status ?? 400, err.code, err.message);
      return;
    }
    console.error(err);
    sendError(res, 500, 'internal_error', 'Erro interno.');
  }
});

billRouter.patch('/:id/payment', async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string;
  const groupId = res.locals['groupId'] as string;
  const { id } = req.params;
  const t0 = Date.now();

  const body = updatePaymentBody.safeParse(req.body);
  if (!body.success) {
    sendValidationError(res, zodErrorToFieldErrors(body.error));
    return;
  }

  try {
    const bill = await updatePaymentUseCase({ userId, groupId, id: id as string, body: body.data });
    logMutation({
      action: 'update_payment',
      outcome: 'success',
      userId,
      groupId,
      billId: id,
      durationMs: Date.now() - t0,
    });
    res.json({ bill: mapBillToResponse(bill) });
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.status ?? 400, err.code, err.message);
      return;
    }
    console.error(err);
    sendError(res, 500, 'internal_error', 'Erro interno.');
  }
});

billRouter.delete('/:id/payment', async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string;
  const groupId = res.locals['groupId'] as string;
  const { id } = req.params;
  const t0 = Date.now();

  try {
    const bill = await revertPaymentUseCase(groupId, id as string);
    logMutation({
      action: 'revert_payment',
      outcome: 'success',
      userId,
      groupId,
      billId: id,
      durationMs: Date.now() - t0,
    });
    res.json({ bill: mapBillToResponse(bill) });
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.status ?? 400, err.code, err.message);
      return;
    }
    console.error(err);
    sendError(res, 500, 'internal_error', 'Erro interno.');
  }
});

billRouter.post('/:id/cancel', async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string;
  const groupId = res.locals['groupId'] as string;
  const { id } = req.params;
  const t0 = Date.now();

  try {
    const bill = await cancelBillUseCase(groupId, id as string);
    logMutation({
      action: 'cancel',
      outcome: 'success',
      userId,
      groupId,
      billId: id,
      durationMs: Date.now() - t0,
    });
    res.json({ bill: mapBillToResponse(bill) });
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.status ?? 400, err.code, err.message);
      return;
    }
    console.error(err);
    sendError(res, 500, 'internal_error', 'Erro interno.');
  }
});

billRouter.post('/:id/reactivate', async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string;
  const groupId = res.locals['groupId'] as string;
  const { id } = req.params;
  const t0 = Date.now();

  try {
    const bill = await reactivateBillUseCase(groupId, id as string);
    logMutation({
      action: 'reactivate',
      outcome: 'success',
      userId,
      groupId,
      billId: id,
      durationMs: Date.now() - t0,
    });
    res.json({ bill: mapBillToResponse(bill) });
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.status ?? 400, err.code, err.message);
      return;
    }
    console.error(err);
    sendError(res, 500, 'internal_error', 'Erro interno.');
  }
});
