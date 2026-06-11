import { AppError } from '../../api/errors';
import { billRepository } from '../../domain/bill/bill.repository';

export async function deleteBillUseCase(groupId: string, id: string): Promise<void> {
  const existing = await billRepository.findById(id, groupId);
  if (!existing) throw new AppError('bill.not_found', 'Conta não encontrada.', 404);
  if (existing.status === 'PAID') {
    throw new AppError(
      'bill.invalid_transition',
      'Não é possível excluir uma conta paga. Reverta o pagamento antes.',
      409,
    );
  }
  await billRepository.delete(id);
}
