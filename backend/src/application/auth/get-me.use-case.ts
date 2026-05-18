import { prisma } from '../../infra/prisma';
import { AppError } from '../../api/errors';

export async function getMeUseCase(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, familyGroupId: true },
  });
  if (!user) throw new AppError('UNAUTHORIZED', 'Usuário não encontrado.');
  return user;
}
