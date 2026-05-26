import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../infra/prisma';
import { sendError } from '../api/errors';

export async function requireMembership(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const userId = res.locals['userId'] as string | undefined;
  if (!userId) {
    sendError(res, 401, 'not_authenticated', 'Sessão expirada. Faça login novamente.');
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { familyGroupId: true },
  });

  if (!user?.familyGroupId) {
    sendError(
      res,
      403,
      'no_group',
      'Você precisa pertencer a um grupo familiar para acessar despesas.',
    );
    return;
  }

  res.locals['groupId'] = user.familyGroupId;
  next();
}
