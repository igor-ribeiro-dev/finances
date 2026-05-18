import crypto from 'crypto';
import { prisma } from '../../infra/prisma';
import { AppError } from '../../api/errors';

function generateInviteCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

function buildInviteLink(code: string): string {
  return `${process.env['FRONTEND_URL'] ?? 'http://localhost:5173'}/join/${code}`;
}

export async function createGroupUseCase(userId: string, name: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('UNAUTHORIZED', 'Usuário não encontrado.');
  if (user.familyGroupId)
    throw new AppError('ALREADY_IN_GROUP', 'Você já pertence a um grupo familiar.');

  const group = await prisma.familyGroup.create({ data: { name } });
  await prisma.user.update({ where: { id: userId }, data: { familyGroupId: group.id } });

  const code = generateInviteCode();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const invite = await prisma.invite.create({ data: { familyGroupId: group.id, code, expiresAt } });

  console.log(
    JSON.stringify({
      action: 'create_group',
      userId,
      groupId: group.id,
      timestamp: new Date().toISOString(),
    }),
  );
  return {
    id: group.id,
    name: group.name,
    invite: { code: invite.code, link: buildInviteLink(invite.code), expiresAt: invite.expiresAt },
  };
}
