import { Router, type Request, type Response } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requireMembership } from '../../middleware/require-membership.middleware';

export const expenseRouter = Router();

expenseRouter.use(authMiddleware, requireMembership);

const notImplemented = (_req: Request, res: Response): void => {
  res.status(501).json({ code: 'not_implemented', message: 'Em implementação.' });
};

expenseRouter.post('/', notImplemented);
expenseRouter.get('/', notImplemented);
expenseRouter.get('/:id', notImplemented);
expenseRouter.patch('/:id', notImplemented);
expenseRouter.delete('/:id', notImplemented);
