import { Router, type Request, type Response } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireMembership } from '../../middleware/require-membership.middleware';
import { AppError, CreditCardErrorCode, sendError, sendValidationError } from '../errors';
import {
  createCardBody,
  updateCardBody,
  registerFaturaBody,
  creditCardIdParam,
  zodErrorToFieldErrors,
} from './credit-card.validators';
import { mapCreditCardToResponse } from './credit-card.serializer';
import { mapBillToResponse } from '../bill/bill.serializer';
import { registerFaturaUseCase } from '../../application/credit-card/register-fatura.use-case';
import { createCreditCardUseCase } from '../../application/credit-card/create-credit-card.use-case';
import { updateCreditCardUseCase } from '../../application/credit-card/update-credit-card.use-case';
import { archiveCreditCardUseCase } from '../../application/credit-card/archive-credit-card.use-case';
import { deleteCreditCardUseCase } from '../../application/credit-card/delete-credit-card.use-case';
import { listCreditCardsUseCase } from '../../application/credit-card/list-credit-cards.use-case';
import { getCreditCardUseCase } from '../../application/credit-card/get-credit-card.use-case';

export const creditCardRouter = Router();

creditCardRouter.use(authMiddleware, requireMembership);

function logMutation(event: {
  action: 'create' | 'update' | 'archive' | 'delete' | 'register_fatura';
  outcome: string;
  userId: string;
  groupId: string;
  creditCardId?: string;
  durationMs: number;
}): void {
  // Structured JSON log — Constitution V. No card names in clear text.
  console.log(JSON.stringify({ event: 'credit_card.mutation', ...event }));
}

function sendAppError(res: Response, err: unknown): void {
  if (err instanceof AppError) {
    sendError(res, err.status ?? 400, err.code, err.message, err.fieldErrors);
    return;
  }
  console.error(err);
  sendError(res, 500, 'internal_error', 'Erro interno.');
}

creditCardRouter.get('/', async (_req: Request, res: Response) => {
  const groupId = res.locals['groupId'] as string;
  try {
    const cards = await listCreditCardsUseCase({ groupId });
    res.status(200).json({ cards });
  } catch (err) {
    sendAppError(res, err);
  }
});

creditCardRouter.post('/', async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string;
  const groupId = res.locals['groupId'] as string;
  const t0 = Date.now();

  const body = createCardBody.safeParse(req.body);
  if (!body.success) {
    sendValidationError(res, zodErrorToFieldErrors(body.error));
    return;
  }
  try {
    const card = await createCreditCardUseCase({ groupId, body: body.data });
    res.status(201).json({ card: mapCreditCardToResponse(card) });
    logMutation({
      action: 'create',
      outcome: 'success',
      userId,
      groupId,
      creditCardId: card.id,
      durationMs: Date.now() - t0,
    });
  } catch (err) {
    sendAppError(res, err);
    logMutation({
      action: 'create',
      outcome: 'error',
      userId,
      groupId,
      durationMs: Date.now() - t0,
    });
  }
});

creditCardRouter.get('/:id', async (req: Request, res: Response) => {
  const groupId = res.locals['groupId'] as string;
  const idParse = creditCardIdParam.safeParse(req.params['id']);
  if (!idParse.success) {
    sendError(res, 404, CreditCardErrorCode.notFound, 'Cartão não encontrado.');
    return;
  }
  try {
    const card = await getCreditCardUseCase({ groupId, id: idParse.data });
    res.status(200).json({ card });
  } catch (err) {
    sendAppError(res, err);
  }
});

creditCardRouter.patch('/:id', async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string;
  const groupId = res.locals['groupId'] as string;
  const t0 = Date.now();

  const idParse = creditCardIdParam.safeParse(req.params['id']);
  if (!idParse.success) {
    sendError(res, 404, CreditCardErrorCode.notFound, 'Cartão não encontrado.');
    return;
  }
  const body = updateCardBody.safeParse(req.body);
  if (!body.success) {
    sendValidationError(res, zodErrorToFieldErrors(body.error));
    return;
  }
  try {
    const card = await updateCreditCardUseCase({ groupId, id: idParse.data, body: body.data });
    res.status(200).json({ card: mapCreditCardToResponse(card) });
    logMutation({
      action: 'update',
      outcome: 'success',
      userId,
      groupId,
      creditCardId: card.id,
      durationMs: Date.now() - t0,
    });
  } catch (err) {
    sendAppError(res, err);
    logMutation({
      action: 'update',
      outcome: 'error',
      userId,
      groupId,
      creditCardId: idParse.data,
      durationMs: Date.now() - t0,
    });
  }
});

creditCardRouter.post('/:id/archive', async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string;
  const groupId = res.locals['groupId'] as string;
  const t0 = Date.now();

  const idParse = creditCardIdParam.safeParse(req.params['id']);
  if (!idParse.success) {
    sendError(res, 404, CreditCardErrorCode.notFound, 'Cartão não encontrado.');
    return;
  }
  try {
    const card = await archiveCreditCardUseCase({ groupId, id: idParse.data });
    res.status(200).json({ card: mapCreditCardToResponse(card) });
    logMutation({
      action: 'archive',
      outcome: 'success',
      userId,
      groupId,
      creditCardId: card.id,
      durationMs: Date.now() - t0,
    });
  } catch (err) {
    sendAppError(res, err);
  }
});

creditCardRouter.post('/:id/faturas', async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string;
  const groupId = res.locals['groupId'] as string;
  const t0 = Date.now();

  const idParse = creditCardIdParam.safeParse(req.params['id']);
  if (!idParse.success) {
    sendError(res, 404, CreditCardErrorCode.notFound, 'Cartão não encontrado.');
    return;
  }
  const body = registerFaturaBody.safeParse(req.body);
  if (!body.success) {
    sendValidationError(res, zodErrorToFieldErrors(body.error));
    return;
  }
  try {
    const bill = await registerFaturaUseCase({
      groupId,
      userId,
      cardId: idParse.data,
      body: body.data,
    });
    res.status(201).json({ bill: mapBillToResponse(bill) });
    logMutation({
      action: 'register_fatura',
      outcome: 'success',
      userId,
      groupId,
      creditCardId: idParse.data,
      durationMs: Date.now() - t0,
    });
  } catch (err) {
    sendAppError(res, err);
    logMutation({
      action: 'register_fatura',
      outcome: 'error',
      userId,
      groupId,
      creditCardId: idParse.data,
      durationMs: Date.now() - t0,
    });
  }
});

creditCardRouter.delete('/:id', async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string;
  const groupId = res.locals['groupId'] as string;
  const t0 = Date.now();

  const idParse = creditCardIdParam.safeParse(req.params['id']);
  if (!idParse.success) {
    sendError(res, 404, CreditCardErrorCode.notFound, 'Cartão não encontrado.');
    return;
  }
  try {
    await deleteCreditCardUseCase({ groupId, id: idParse.data });
    res.status(204).send();
    logMutation({
      action: 'delete',
      outcome: 'success',
      userId,
      groupId,
      creditCardId: idParse.data,
      durationMs: Date.now() - t0,
    });
  } catch (err) {
    sendAppError(res, err);
    logMutation({
      action: 'delete',
      outcome: 'conflict',
      userId,
      groupId,
      creditCardId: idParse.data,
      durationMs: Date.now() - t0,
    });
  }
});
