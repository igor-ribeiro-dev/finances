import bcrypt from 'bcrypt';
import { prisma } from '../../infra/prisma';
import { AppError } from '../../api/errors';

function validatePassword(password: string): void {
  if (password.length < 8 || !/\d/.test(password) || !/[A-Z]/.test(password)) {
    throw new AppError(
      'INVALID_PASSWORD',
      'A senha deve ter no mínimo 8 caracteres, 1 número e 1 letra maiúscula.',
    );
  }
}

export async function registerUseCase(name: string, email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) throw new AppError('EMAIL_ALREADY_IN_USE', 'Este e-mail já está cadastrado.');

  validatePassword(password);

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email: email.toLowerCase(), passwordHash },
    select: { id: true, name: true, email: true, familyGroupId: true },
  });

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const session = await prisma.session.create({ data: { userId: user.id, expiresAt } });

  console.log(
    JSON.stringify({ action: 'register', userId: user.id, timestamp: new Date().toISOString() }),
  );
  return { user, sessionId: session.id };
}
