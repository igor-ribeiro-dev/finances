import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../infra/prisma';
import { sendError } from '../api/errors';

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const sessionId = req.cookies?.['session_id'] as string | undefined;
  if (!sessionId) {
    sendError(res, 401, 'UNAUTHORIZED', 'Autenticação necessária.');
    return;
  }

  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session || session.expiresAt < new Date()) {
    sendError(res, 401, 'UNAUTHORIZED', 'Sessão inválida ou expirada.');
    return;
  }

  const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.session.update({ where: { id: sessionId }, data: { expiresAt: thirtyDays } });

  res.locals['userId'] = session.userId;
  next();
}
