import { Router } from 'express';
import type { Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireMembership } from '../../middleware/require-membership.middleware';
import { createGroupUseCase } from '../../application/family-group/create-group.use-case';
import { joinGroupUseCase } from '../../application/family-group/join-group.use-case';
import { regenerateInviteUseCase } from '../../application/family-group/regenerate-invite.use-case';
import { leaveGroupUseCase } from '../../application/family-group/leave-group.use-case';
import { AppError, sendError } from '../errors';
import { prisma } from '../../infra/prisma';

export const familyGroupRouter = Router();

familyGroupRouter.post('/', authMiddleware, async (req: Request, res: Response) => {
  const { name } = req.body as { name?: string };
  if (!name?.trim()) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Nome do grupo é obrigatório.');
    return;
  }
  try {
    const group = await createGroupUseCase(res.locals['userId'] as string, name.trim());
    res.status(201).json(group);
  } catch (err) {
    if (err instanceof AppError)
      sendError(res, err.code === 'ALREADY_IN_GROUP' ? 409 : 400, err.code, err.message);
    else sendError(res, 500, 'INTERNAL_ERROR', 'Erro interno.');
  }
});

familyGroupRouter.post('/join', authMiddleware, async (req: Request, res: Response) => {
  const { code } = req.body as { code?: string };
  if (!code) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Código de convite é obrigatório.');
    return;
  }
  try {
    const group = await joinGroupUseCase(res.locals['userId'] as string, code);
    res.json(group);
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.code === 'ALREADY_IN_GROUP' ? 409 : 400, err.code, err.message);
    } else sendError(res, 500, 'INTERNAL_ERROR', 'Erro interno.');
  }
});

familyGroupRouter.post(
  '/invite/regenerate',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const result = await regenerateInviteUseCase(res.locals['userId'] as string);
      res.json(result);
    } catch (err) {
      if (err instanceof AppError) sendError(res, 403, err.code, err.message);
      else sendError(res, 500, 'INTERNAL_ERROR', 'Erro interno.');
    }
  },
);

familyGroupRouter.get(
  '/members',
  authMiddleware,
  requireMembership,
  async (_req: Request, res: Response) => {
    try {
      const groupId = res.locals['groupId'] as string;
      const members = await prisma.user.findMany({
        where: { familyGroupId: groupId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });
      res.json(members);
    } catch {
      sendError(res, 500, 'INTERNAL_ERROR', 'Erro interno.');
    }
  },
);

familyGroupRouter.delete('/members/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    await leaveGroupUseCase(res.locals['userId'] as string);
    res.sendStatus(204);
  } catch (err) {
    if (err instanceof AppError) sendError(res, 403, err.code, err.message);
    else sendError(res, 500, 'INTERNAL_ERROR', 'Erro interno.');
  }
});
