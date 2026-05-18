import bcrypt from 'bcrypt';
import { prisma } from '../../infra/prisma';
import { AppError } from '../../api/errors';

export async function loginUseCase(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) throw new AppError('INVALID_CREDENTIALS', 'E-mail ou senha incorretos.');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError('INVALID_CREDENTIALS', 'E-mail ou senha incorretos.');

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const session = await prisma.session.create({ data: { userId: user.id, expiresAt } });

  console.log(
    JSON.stringify({ action: 'login', userId: user.id, timestamp: new Date().toISOString() }),
  );
  return {
    user: { id: user.id, name: user.name, email: user.email, familyGroupId: user.familyGroupId },
    sessionId: session.id,
  };
}
