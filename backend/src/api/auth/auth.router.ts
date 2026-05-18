import { Router } from 'express';
import type { Request, Response } from 'express';
import { registerUseCase } from '../../application/auth/register.use-case';
import { loginUseCase } from '../../application/auth/login.use-case';
import { logoutUseCase } from '../../application/auth/logout.use-case';
import { getMeUseCase } from '../../application/auth/get-me.use-case';
import { forgotPasswordUseCase } from '../../application/auth/forgot-password.use-case';
import { resetPasswordUseCase } from '../../application/auth/reset-password.use-case';
import { authMiddleware } from '../../middleware/auth.middleware';
import { AppError, sendError } from '../errors';

export const authRouter = Router();

const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

function setSessionCookie(res: Response, sessionId: string): void {
  res.cookie('session_id', sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE * 1000,
    secure: process.env['NODE_ENV'] === 'production',
  });
}

authRouter.post('/register', async (req: Request, res: Response) => {
  const { name, email, password } = req.body as {
    name?: string;
    email?: string;
    password?: string;
  };
  if (!name || !email || !password) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Nome, e-mail e senha são obrigatórios.');
    return;
  }
  try {
    const { user, sessionId } = await registerUseCase(name, email, password);
    setSessionCookie(res, sessionId);
    res.status(201).json(user);
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, err.code === 'EMAIL_ALREADY_IN_USE' ? 409 : 400, err.code, err.message);
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'Erro interno.');
    }
  }
});

authRouter.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    sendError(res, 400, 'VALIDATION_ERROR', 'E-mail e senha são obrigatórios.');
    return;
  }
  try {
    const { user, sessionId } = await loginUseCase(email, password);
    setSessionCookie(res, sessionId);
    res.json(user);
  } catch (err) {
    if (err instanceof AppError) {
      sendError(res, 401, err.code, err.message);
    } else {
      sendError(res, 500, 'INTERNAL_ERROR', 'Erro interno.');
    }
  }
});

authRouter.post('/logout', authMiddleware, async (req: Request, res: Response) => {
  const sessionId = req.cookies?.['session_id'] as string;
  await logoutUseCase(sessionId);
  res.clearCookie('session_id');
  res.sendStatus(204);
});

authRouter.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await getMeUseCase(req.userId);
    res.json(user);
  } catch (err) {
    if (err instanceof AppError) sendError(res, 401, err.code, err.message);
    else sendError(res, 500, 'INTERNAL_ERROR', 'Erro interno.');
  }
});

authRouter.post('/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body as { email?: string };
  if (email) await forgotPasswordUseCase(email).catch(() => null);
  res.json({ message: 'Se este e-mail estiver cadastrado, você receberá as instruções em breve.' });
});

authRouter.post('/reset-password', async (req: Request, res: Response) => {
  const { token, newPassword } = req.body as { token?: string; newPassword?: string };
  if (!token || !newPassword) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Token e nova senha são obrigatórios.');
    return;
  }
  try {
    await resetPasswordUseCase(token, newPassword);
    res.json({ message: 'Senha redefinida com sucesso.' });
  } catch (err) {
    if (err instanceof AppError) sendError(res, 400, err.code, err.message);
    else sendError(res, 500, 'INTERNAL_ERROR', 'Erro interno.');
  }
});
