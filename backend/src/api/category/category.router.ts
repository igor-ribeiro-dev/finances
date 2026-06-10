import { Router, type Request, type Response } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireMembership } from '../../middleware/require-membership.middleware';
import {
  AppError,
  CategoryErrorCode,
  sendCategoryBlockerError,
  sendError,
  sendValidationError,
} from '../errors';
import {
  createCategoryBody,
  updateCategoryBody,
  categoryIdParam,
  idempotencyKeyHeader,
  zodErrorToFieldErrors,
} from './category.validators';
import { createCategoryUseCase } from '../../application/category/create-category.use-case';
import { listCategoriesUseCase } from '../../application/category/list-categories.use-case';
import { getCategoryUseCase } from '../../application/category/get-category.use-case';
import { updateCategoryUseCase } from '../../application/category/update-category.use-case';
import { deleteCategoryUseCase } from '../../application/category/delete-category.use-case';
import { previewDeleteCategoryUseCase } from '../../application/category/preview-delete-category.use-case';
import { mapCategoryToResponse } from './category.serializer';

export const categoryRouter = Router();

// Auth + membership gate every category route (injects res.locals.userId/groupId).
categoryRouter.use(authMiddleware, requireMembership);

function logMutation(event: {
  action: 'create' | 'update' | 'delete';
  outcome: 'success' | 'replay' | 'not_found' | 'validation_error' | 'conflict' | 'error';
  userId: string;
  groupId: string;
  categoryId?: string;
  parentId?: string | null;
  durationMs: number;
}): void {
  // Structured JSON log — Constitution V. No category names in clear text.
  console.log(JSON.stringify({ event: 'category.mutation', ...event }));
}

/** Maps an AppError (or unknown) onto the flat error envelope. */
function sendAppError(res: Response, err: unknown): 'handled' | 'internal' {
  if (err instanceof AppError) {
    if (err.code === CategoryErrorCode.hasDependencies && err.blockers) {
      sendCategoryBlockerError(res, err.blockers);
      return 'handled';
    }
    sendError(res, err.status ?? 400, err.code, err.message, err.fieldErrors);
    return 'handled';
  }
  sendError(res, 500, 'INTERNAL_ERROR', 'Erro interno.');
  return 'internal';
}

categoryRouter.post('/', async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string;
  const groupId = res.locals['groupId'] as string;
  const t0 = Date.now();

  const keyParse = idempotencyKeyHeader.safeParse(req.header('Idempotency-Key') ?? undefined);
  if (!keyParse.success) {
    sendError(res, 400, 'invalid_idempotency_key', 'Idempotency-Key inválida (deve ser UUID v4).');
    return;
  }

  const bodyParse = createCategoryBody.safeParse(req.body);
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
    const result = await createCategoryUseCase({
      userId,
      groupId,
      idempotencyKey: keyParse.data,
      body: bodyParse.data,
    });
    res
      .status(result.status === 'created' ? 201 : 200)
      .json(mapCategoryToResponse(result.category));
    logMutation({
      action: 'create',
      outcome: result.status === 'replay' ? 'replay' : 'success',
      userId,
      groupId,
      categoryId: result.category.id,
      parentId: result.category.parentId,
      durationMs: Date.now() - t0,
    });
  } catch (err) {
    const outcome = sendAppError(res, err);
    logMutation({
      action: 'create',
      outcome: outcome === 'internal' ? 'error' : 'validation_error',
      userId,
      groupId,
      durationMs: Date.now() - t0,
    });
  }
});

categoryRouter.get('/', async (_req: Request, res: Response) => {
  const groupId = res.locals['groupId'] as string;
  try {
    const categories = await listCategoriesUseCase({ groupId });
    res.status(200).json(categories.map(mapCategoryToResponse));
  } catch (err) {
    sendAppError(res, err);
  }
});

categoryRouter.get('/:id/delete-preview', async (req: Request, res: Response) => {
  const groupId = res.locals['groupId'] as string;
  const idParse = categoryIdParam.safeParse(req.params['id']);
  if (!idParse.success) {
    sendError(res, 404, CategoryErrorCode.notFound, 'Categoria não encontrada.');
    return;
  }
  try {
    const preview = await previewDeleteCategoryUseCase({ groupId, id: idParse.data });
    res.status(200).json(preview);
  } catch (err) {
    sendAppError(res, err);
  }
});

categoryRouter.get('/:id', async (req: Request, res: Response) => {
  const groupId = res.locals['groupId'] as string;
  const idParse = categoryIdParam.safeParse(req.params['id']);
  if (!idParse.success) {
    sendError(res, 404, CategoryErrorCode.notFound, 'Categoria não encontrada.');
    return;
  }
  try {
    const category = await getCategoryUseCase({ groupId, id: idParse.data });
    res.status(200).json(mapCategoryToResponse(category));
  } catch (err) {
    sendAppError(res, err);
  }
});

categoryRouter.patch('/:id', async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string;
  const groupId = res.locals['groupId'] as string;
  const t0 = Date.now();

  const idParse = categoryIdParam.safeParse(req.params['id']);
  if (!idParse.success) {
    sendError(res, 404, CategoryErrorCode.notFound, 'Categoria não encontrada.');
    return;
  }
  const bodyParse = updateCategoryBody.safeParse(req.body);
  if (!bodyParse.success) {
    sendValidationError(res, zodErrorToFieldErrors(bodyParse.error));
    return;
  }

  try {
    const category = await updateCategoryUseCase({
      groupId,
      id: idParse.data,
      body: bodyParse.data,
    });
    res.status(200).json(mapCategoryToResponse(category));
    logMutation({
      action: 'update',
      outcome: 'success',
      userId,
      groupId,
      categoryId: category.id,
      parentId: category.parentId,
      durationMs: Date.now() - t0,
    });
  } catch (err) {
    const outcome = sendAppError(res, err);
    logMutation({
      action: 'update',
      outcome: outcome === 'internal' ? 'error' : 'validation_error',
      userId,
      groupId,
      categoryId: idParse.data,
      durationMs: Date.now() - t0,
    });
  }
});

categoryRouter.delete('/:id', async (req: Request, res: Response) => {
  const userId = res.locals['userId'] as string;
  const groupId = res.locals['groupId'] as string;
  const t0 = Date.now();

  const idParse = categoryIdParam.safeParse(req.params['id']);
  if (!idParse.success) {
    sendError(res, 404, CategoryErrorCode.notFound, 'Categoria não encontrada.');
    return;
  }

  try {
    await deleteCategoryUseCase({ groupId, id: idParse.data });
    res.status(204).send();
    logMutation({
      action: 'delete',
      outcome: 'success',
      userId,
      groupId,
      categoryId: idParse.data,
      durationMs: Date.now() - t0,
    });
  } catch (err) {
    const outcome = sendAppError(res, err);
    logMutation({
      action: 'delete',
      outcome: outcome === 'internal' ? 'error' : 'conflict',
      userId,
      groupId,
      categoryId: idParse.data,
      durationMs: Date.now() - t0,
    });
  }
});
