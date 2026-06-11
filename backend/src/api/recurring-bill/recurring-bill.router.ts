import { Router, type Request, type Response } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireMembership } from '../../middleware/require-membership.middleware';
import { AppError, sendError, sendValidationError } from '../errors';
import {
  createRecurringBillBody,
  updateRecurringBillBody,
  zodErrorToFieldErrors,
} from './recurring-bill.validators';
import { recurringBillRepository } from '../../domain/recurring-bill/recurring-bill.repository';
import { createRecurringBillUseCase } from '../../application/recurring-bill/create-recurring-bill.use-case';
import { updateRecurringBillUseCase } from '../../application/recurring-bill/update-recurring-bill.use-case';
import { deleteRecurringBillUseCase } from '../../application/recurring-bill/delete-recurring-bill.use-case';
import {
  pauseRecurringBillUseCase,
  resumeRecurringBillUseCase,
} from '../../application/recurring-bill/pause-resume.use-case';
import { stopRecurringBillUseCase } from '../../application/recurring-bill/stop-recurring-bill.use-case';
import { mapRecurringBillToResponse } from './recurring-bill.serializer';

export const recurringBillRouter = Router();

recurringBillRouter.use(authMiddleware, requireMembership);

function logMutation(event: {
  action: string;
  outcome: string;
  userId: string;
  groupId: string;
  recurringBillId?: string;
  durationMs: number;
}): void {
  console.log(JSON.stringify({ event: 'recurring_bill.mutation', ...event }));
}

// GET / — list all recurring bills for the group
recurringBillRouter.get('/', async (req: Request, res: Response) => {
  const groupId = res.locals['groupId'] as string;

  try {
    const templates = await recurringBillRepository.listByGroup(groupId);
    res.json({ recurringBills: templates.map(mapRecurringBillToResponse) });
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.status ?? 500, err.code, err.message);
      return;
    }
    console.error(err);
    sendError(res, 500, 'internal_error', 'Erro interno.');
  }
});

// POST / — create a new recurring bill
recurringBillRouter.post('/', async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string;
  const groupId = res.locals['groupId'] as string;
  const t0 = Date.now();

  const body = createRecurringBillBody.safeParse(req.body);
  if (!body.success) {
    sendValidationError(res, zodErrorToFieldErrors(body.error));
    return;
  }

  try {
    const template = await createRecurringBillUseCase({ userId, groupId, body: body.data });
    logMutation({
      action: 'create',
      outcome: 'success',
      userId,
      groupId,
      recurringBillId: template.id,
      durationMs: Date.now() - t0,
    });
    res.status(201).json({ recurringBill: mapRecurringBillToResponse(template) });
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.status ?? 400, err.code, err.message);
      return;
    }
    console.error(err);
    sendError(res, 500, 'internal_error', 'Erro interno.');
  }
});

// GET /:id — get a single recurring bill
recurringBillRouter.get('/:id', async (req: Request, res: Response) => {
  const groupId = res.locals['groupId'] as string;
  const { id } = req.params;

  try {
    const template = await recurringBillRepository.findById(id as string, groupId);
    if (!template) {
      sendError(res, 404, 'recurring_bill_not_found', 'Conta recorrente não encontrada.');
      return;
    }
    res.json({ recurringBill: mapRecurringBillToResponse(template) });
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.status ?? 500, err.code, err.message);
      return;
    }
    console.error(err);
    sendError(res, 500, 'internal_error', 'Erro interno.');
  }
});

// PATCH /:id — update a recurring bill
recurringBillRouter.patch('/:id', async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string;
  const groupId = res.locals['groupId'] as string;
  const { id } = req.params;
  const t0 = Date.now();

  const body = updateRecurringBillBody.safeParse(req.body);
  if (!body.success) {
    sendValidationError(res, zodErrorToFieldErrors(body.error));
    return;
  }

  try {
    const template = await updateRecurringBillUseCase({
      userId,
      groupId,
      id: id as string,
      body: body.data,
    });
    logMutation({
      action: 'update',
      outcome: 'success',
      userId,
      groupId,
      recurringBillId: id,
      durationMs: Date.now() - t0,
    });
    res.json({ recurringBill: mapRecurringBillToResponse(template) });
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.status ?? 400, err.code, err.message);
      return;
    }
    console.error(err);
    sendError(res, 500, 'internal_error', 'Erro interno.');
  }
});

// DELETE /:id — soft-delete a recurring bill
recurringBillRouter.delete('/:id', async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string;
  const groupId = res.locals['groupId'] as string;
  const { id } = req.params;
  const t0 = Date.now();

  try {
    await deleteRecurringBillUseCase(groupId, id as string);
    logMutation({
      action: 'delete',
      outcome: 'success',
      userId,
      groupId,
      recurringBillId: id,
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

// POST /:id/pause — pause a recurring bill
recurringBillRouter.post('/:id/pause', async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string;
  const groupId = res.locals['groupId'] as string;
  const { id } = req.params;
  const t0 = Date.now();

  try {
    const template = await pauseRecurringBillUseCase(groupId, id as string);
    logMutation({
      action: 'pause',
      outcome: 'success',
      userId,
      groupId,
      recurringBillId: id,
      durationMs: Date.now() - t0,
    });
    res.json({ recurringBill: mapRecurringBillToResponse(template) });
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.status ?? 400, err.code, err.message);
      return;
    }
    console.error(err);
    sendError(res, 500, 'internal_error', 'Erro interno.');
  }
});

// POST /:id/resume — resume a paused recurring bill
recurringBillRouter.post('/:id/resume', async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string;
  const groupId = res.locals['groupId'] as string;
  const { id } = req.params;
  const t0 = Date.now();

  try {
    const template = await resumeRecurringBillUseCase(groupId, id as string);
    logMutation({
      action: 'resume',
      outcome: 'success',
      userId,
      groupId,
      recurringBillId: id,
      durationMs: Date.now() - t0,
    });
    res.json({ recurringBill: mapRecurringBillToResponse(template) });
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.status ?? 400, err.code, err.message);
      return;
    }
    console.error(err);
    sendError(res, 500, 'internal_error', 'Erro interno.');
  }
});

// POST /:id/stop — stop (terminal) a recurring bill
recurringBillRouter.post('/:id/stop', async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string;
  const groupId = res.locals['groupId'] as string;
  const { id } = req.params;
  const t0 = Date.now();

  try {
    const template = await stopRecurringBillUseCase(groupId, id as string);
    logMutation({
      action: 'stop',
      outcome: 'success',
      userId,
      groupId,
      recurringBillId: id,
      durationMs: Date.now() - t0,
    });
    res.json({ recurringBill: mapRecurringBillToResponse(template) });
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.status ?? 400, err.code, err.message);
      return;
    }
    console.error(err);
    sendError(res, 500, 'internal_error', 'Erro interno.');
  }
});
