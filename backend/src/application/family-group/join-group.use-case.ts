import { prisma } from '../../infra/prisma';
import { AppError } from '../../api/errors';

export async function joinGroupUseCase(userId: string, code: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('UNAUTHORIZED', 'Usuário não encontrado.');
  if (user.familyGroupId)
    throw new AppError('ALREADY_IN_GROUP', 'Você já pertence a um grupo familiar.');

  const invite = await prisma.invite.findUnique({ where: { code: code.toUpperCase() } });
  if (!invite || invite.expiresAt < new Date()) {
    throw new AppError('INVALID_INVITE_CODE', 'Código de convite inválido ou expirado.');
  }

  await prisma.user.update({
    where: { id: userId },
    data: { familyGroupId: invite.familyGroupId },
  });
  const group = await prisma.familyGroup.findUnique({ where: { id: invite.familyGroupId } });

  console.log(
    JSON.stringify({
      action: 'join_group',
      userId,
      groupId: invite.familyGroupId,
      timestamp: new Date().toISOString(),
    }),
  );
  return { id: group!.id, name: group!.name };
}
