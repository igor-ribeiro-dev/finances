import { prisma } from '../../infra/prisma';

export async function logoutUseCase(sessionId: string): Promise<void> {
  await prisma.session.delete({ where: { id: sessionId } }).catch(() => null);
  console.log(JSON.stringify({ action: 'logout', sessionId, timestamp: new Date().toISOString() }));
}
