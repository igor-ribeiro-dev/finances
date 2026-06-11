import { AppError } from '../../api/errors';
import { billRepository } from '../../domain/bill/bill.repository';

export async function cancelBillUseCase(groupId: string, id: string) {
  const existing = await billRepository.findById(id, groupId);
  if (!existing) throw new AppError('bill.not_found', 'Conta não encontrada.', 404);
  if (existing.status !== 'PENDING') {
    throw new AppError(
      'bill.invalid_transition',
      'Apenas contas Pendentes podem ser canceladas. Reverta o pagamento antes de cancelar.',
      409,
    );
  }
  return billRepository.updateStatus(id, 'CANCELLED');
}

export async function reactivateBillUseCase(groupId: string, id: string) {
  const existing = await billRepository.findById(id, groupId);
  if (!existing) throw new AppError('bill.not_found', 'Conta não encontrada.', 404);
  if (existing.status !== 'CANCELLED') {
    throw new AppError(
      'bill.invalid_transition',
      'Apenas contas Canceladas podem ser reativadas.',
      409,
    );
  }
  return billRepository.updateStatus(id, 'PENDING');
}
