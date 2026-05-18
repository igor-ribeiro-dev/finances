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

export async function resetPasswordUseCase(
  token: string,
  newPassword: string,
  currentSessionId?: string,
): Promise<void> {
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!resetToken || resetToken.expiresAt < new Date() || resetToken.usedAt) {
    throw new AppError('INVALID_RESET_TOKEN', 'Este link de redefinição é inválido ou já expirou.');
  }

  validatePassword(newPassword);

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } });
  await prisma.passwordResetToken.update({
    where: { id: resetToken.id },
    data: { usedAt: new Date() },
  });

  await prisma.session.deleteMany({
    where: {
      userId: resetToken.userId,
      ...(currentSessionId ? { NOT: { id: currentSessionId } } : {}),
    },
  });

  console.log(
    JSON.stringify({
      action: 'reset_password',
      userId: resetToken.userId,
      timestamp: new Date().toISOString(),
    }),
  );
}
