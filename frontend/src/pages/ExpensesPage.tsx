import { useEffect, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { listGroupMembers, type GroupMember } from '../services/group.service';
import { ExpenseFormModal } from '../components/expense/ExpenseFormModal';
import { useCreateExpense } from '../hooks/useCreateExpense';
import { Toast, type ToastState } from '../components/Toast';

export function ExpensesPage() {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isFormOpen, setFormOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [createdCount, setCreatedCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listGroupMembers()
      .then((list) => {
        if (!cancelled) setMembers(list);
      })
      .catch(() => {
        if (!cancelled) setToast({ kind: 'error', message: 'Erro ao carregar membros do grupo.' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const showToast = useCallback((s: ToastState) => setToast(s), []);

  const { submit, isSaving, fieldErrors, resetFieldErrors } = useCreateExpense({
    onSuccess: () => {
      setCreatedCount((n) => n + 1);
      setFormOpen(false);
      showToast({ kind: 'success', message: 'Despesa registrada.' });
    },
    onError: (err) => {
      if (err.kind !== 'validation') {
        showToast({ kind: 'error', message: err.message });
      }
    },
  });

  function handleOpen(): void {
    resetFieldErrors();
    setFormOpen(true);
  }

  function handleClose(): void {
    if (isSaving) return;
    setFormOpen(false);
    resetFieldErrors();
  }

  return (
    <div className="p-6 sm:p-8">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Despesas</h1>
        <button
          type="button"
          onClick={handleOpen}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nova despesa
        </button>
      </header>

      {createdCount === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center shadow-sm">
          <p className="text-gray-700 mb-4">Você ainda não registrou nenhuma despesa.</p>
          <button
            type="button"
            onClick={handleOpen}
            className="text-teal-700 font-medium hover:underline"
          >
            Registrar primeira despesa
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-700">
            {createdCount} despesa(s) registrada(s) nesta sessão. A listagem completa será entregue
            na próxima iteração (US2).
          </p>
        </div>
      )}

      <ExpenseFormModal
        open={isFormOpen}
        mode="create"
        members={members}
        onClose={handleClose}
        onSubmit={submit}
        isSaving={isSaving}
        fieldErrors={fieldErrors}
      />

      <Toast value={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
