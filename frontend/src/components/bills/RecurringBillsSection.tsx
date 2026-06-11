import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useRecurringBills } from '../../hooks/useRecurringBills';
import { recurringBillService } from '../../services/recurring-bill.service';
import { formatCents } from '../../utils/money';
import { RecurringBillFormModal } from './RecurringBillFormModal';
import type { RecurringBill, RecurringBillStatus, ServiceError } from '../../types/bill';

interface RecurringBillsSectionProps {
  onReload: () => Promise<void>;
}

const STATUS_LABEL: Record<RecurringBillStatus, string> = {
  ACTIVE: 'Ativa',
  PAUSED: 'Pausada',
  STOPPED: 'Encerrada',
};

const STATUS_CLASSES: Record<RecurringBillStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  PAUSED: 'bg-yellow-100 text-yellow-700',
  STOPPED: 'bg-red-100 text-red-600',
};

const INTERVAL_LABEL = {
  MONTHLY: 'Mensal',
  ANNUAL: 'Anual',
};

function RecurringBillRow({
  item,
  onReload,
  onEdit,
}: {
  item: RecurringBill;
  onReload: () => Promise<void>;
  onEdit: (item: RecurringBill) => void;
}) {
  const [isActing, setIsActing] = useState(false);

  async function handlePause() {
    setIsActing(true);
    try {
      await recurringBillService.pause(item.id);
      await onReload();
    } catch (err) {
      window.alert((err as ServiceError).message ?? 'Erro ao pausar.');
    } finally {
      setIsActing(false);
    }
  }

  async function handleResume() {
    setIsActing(true);
    try {
      await recurringBillService.resume(item.id);
      await onReload();
    } catch (err) {
      window.alert((err as ServiceError).message ?? 'Erro ao retomar.');
    } finally {
      setIsActing(false);
    }
  }

  async function handleStop() {
    if (
      !window.confirm(
        `Encerrar "${item.description}"? Instâncias pendentes futuras serão canceladas.`,
      )
    )
      return;
    setIsActing(true);
    try {
      await recurringBillService.stop(item.id);
      await onReload();
    } catch (err) {
      window.alert((err as ServiceError).message ?? 'Erro ao encerrar.');
    } finally {
      setIsActing(false);
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        `Excluir "${item.description}"? Instâncias pendentes futuras serão canceladas.`,
      )
    )
      return;
    setIsActing(true);
    try {
      await recurringBillService.remove(item.id);
      await onReload();
    } catch (err) {
      window.alert((err as ServiceError).message ?? 'Erro ao excluir.');
    } finally {
      setIsActing(false);
    }
  }

  return (
    <li className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-900">{item.description}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[item.status]}`}
          >
            {STATUS_LABEL[item.status]}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
          <span>{INTERVAL_LABEL[item.interval]}</span>
          <span>Dia {item.dueDay}</span>
          <span>{formatCents(item.expectedAmountCents)}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {item.status === 'ACTIVE' && (
          <>
            <button
              type="button"
              onClick={() => onEdit(item)}
              disabled={isActing}
              aria-label={`Editar conta fixa ${item.description}`}
              className="rounded-md px-2 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-50"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={handlePause}
              disabled={isActing}
              aria-label={`Pausar conta fixa ${item.description}`}
              className="rounded-md px-2 py-1 text-xs font-medium text-yellow-700 hover:bg-yellow-50 disabled:opacity-50"
            >
              {isActing ? '…' : 'Pausar'}
            </button>
            <button
              type="button"
              onClick={handleStop}
              disabled={isActing}
              aria-label={`Encerrar conta fixa ${item.description}`}
              className="rounded-md px-2 py-1 text-xs font-medium text-orange-600 hover:bg-orange-50 disabled:opacity-50"
            >
              {isActing ? '…' : 'Encerrar'}
            </button>
          </>
        )}
        {item.status === 'PAUSED' && (
          <>
            <button
              type="button"
              onClick={handleResume}
              disabled={isActing}
              aria-label={`Retomar conta fixa ${item.description}`}
              className="rounded-md px-2 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-50"
            >
              {isActing ? '…' : 'Retomar'}
            </button>
            <button
              type="button"
              onClick={handleStop}
              disabled={isActing}
              aria-label={`Encerrar conta fixa ${item.description}`}
              className="rounded-md px-2 py-1 text-xs font-medium text-orange-600 hover:bg-orange-50 disabled:opacity-50"
            >
              {isActing ? '…' : 'Encerrar'}
            </button>
          </>
        )}
        <button
          type="button"
          onClick={handleDelete}
          disabled={isActing}
          aria-label={`Excluir conta fixa ${item.description}`}
          className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          {isActing ? '…' : 'Excluir'}
        </button>
      </div>
    </li>
  );
}

export function RecurringBillsSection({ onReload }: RecurringBillsSectionProps) {
  const { items, isLoading, error, reload } = useRecurringBills();
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringBill | undefined>(undefined);

  async function handleItemReload() {
    await reload();
    await onReload();
  }

  function openCreate() {
    setEditingItem(undefined);
    setFormOpen(true);
  }

  function openEdit(item: RecurringBill) {
    setEditingItem(item);
    setFormOpen(true);
  }

  function handleSuccess() {
    setFormOpen(false);
    void handleItemReload();
  }

  return (
    <section aria-label="Contas Fixas">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Contas Fixas</h2>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1 rounded-lg border border-teal-600 px-3 py-1.5 text-sm font-medium text-teal-700 hover:bg-teal-50"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nova conta fixa
        </button>
      </div>

      {isLoading && <p className="text-sm text-gray-500">Carregando...</p>}

      {!isLoading && error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          Erro ao carregar contas fixas: {error.message}
        </div>
      )}

      {!isLoading && !error && items.length === 0 && (
        <p className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
          Nenhuma conta fixa cadastrada.
        </p>
      )}

      {!isLoading && !error && items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item) => (
            <RecurringBillRow
              key={item.id}
              item={item}
              onReload={handleItemReload}
              onEdit={openEdit}
            />
          ))}
        </ul>
      )}

      <RecurringBillFormModal
        open={formOpen}
        mode={editingItem ? 'edit' : 'create'}
        item={editingItem}
        onClose={() => setFormOpen(false)}
        onSuccess={handleSuccess}
      />
    </section>
  );
}
