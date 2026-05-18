import { prisma } from '../../infra/prisma';
import { AppError } from '../../api/errors';

export async function leaveGroupUseCase(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.familyGroupId) throw new AppError('FORBIDDEN', 'Você não pertence a nenhum grupo.');

  await prisma.user.update({ where: { id: userId }, data: { familyGroupId: null } });
  console.log(
    JSON.stringify({ action: 'leave_group', userId, timestamp: new Date().toISOString() }),
  );
}
