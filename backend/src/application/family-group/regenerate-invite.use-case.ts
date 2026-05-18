import crypto from 'crypto';
import { prisma } from '../../infra/prisma';
import { AppError } from '../../api/errors';

function buildInviteLink(code: string): string {
  return `${process.env['FRONTEND_URL'] ?? 'http://localhost:5173'}/join/${code}`;
}

export async function regenerateInviteUseCase(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.familyGroupId) throw new AppError('FORBIDDEN', 'Você não pertence a nenhum grupo.');

  await prisma.invite.deleteMany({ where: { familyGroupId: user.familyGroupId } });

  const code = crypto.randomBytes(4).toString('hex').toUpperCase();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const invite = await prisma.invite.create({
    data: { familyGroupId: user.familyGroupId, code, expiresAt },
  });

  return {
    invite: { code: invite.code, link: buildInviteLink(invite.code), expiresAt: invite.expiresAt },
  };
}
