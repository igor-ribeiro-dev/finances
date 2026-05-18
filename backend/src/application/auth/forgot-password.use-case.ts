import crypto from 'crypto';
import { prisma } from '../../infra/prisma';
import { sendPasswordResetEmail } from '../../infra/email';

export async function forgotPasswordUseCase(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return;

  const token = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await prisma.passwordResetToken.create({ data: { userId: user.id, token, expiresAt } });

  await sendPasswordResetEmail(user.email, token);
  console.log(
    JSON.stringify({
      action: 'forgot_password',
      userId: user.id,
      timestamp: new Date().toISOString(),
    }),
  );
}
