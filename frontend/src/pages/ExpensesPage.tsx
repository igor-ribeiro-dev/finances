import { useEffect, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { listGroupMembers, type GroupMember } from '../services/group.service';
import { ExpenseFormModal } from '../components/expense/ExpenseFormModal';
import { ExpenseList } from '../components/expense/ExpenseList';
import { DeleteExpenseModal } from '../components/expense/DeleteExpenseModal';
import { useCreateExpense } from '../hooks/useCreateExpense';
import { useExpensesList } from '../hooks/useExpensesList';
import { useUpdateExpense } from '../hooks/useUpdateExpense';
import { useDeleteExpense } from '../hooks/useDeleteExpense';
import { useCategoriesList } from '../hooks/useCategoriesList';
import { useBudgetCopyPrompt } from '../hooks/useBudgetCopyPrompt';
import { CopyPreviousMonthDialog } from '../components/budget/CopyPreviousMonthDialog';
import { Toast, type ToastState } from '../components/Toast';
import type { Expense } from '../types/expense';

type FormMode =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; expense: Expense; concurrencyError: boolean };

export function ExpensesPage() {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [formMode, setFormMode] = useState<FormMode>({ kind: 'closed' });
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const {
    items,
    nextCursor,
    isInitialLoading,
    isLoadingMore,
    loadMore,
    prependItem,
    replaceItem,
    removeItem,
  } = useExpensesList();

  const { roots: categoryRoots, rootsById: categorySubsByRoot } = useCategoriesList();

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

  const concurrentRemovalToast = useCallback(
    () =>
      showToast({
        kind: 'success',
        message: 'A categoria selecionada foi removida; a despesa foi salva sem categoria.',
      }),
    [showToast],
  );

  const copyPrompt = useBudgetCopyPrompt();

  const createHook = useCreateExpense({
    onSuccess: (expense) => {
      prependItem(expense);
      setFormMode({ kind: 'closed' });
      showToast({ kind: 'success', message: 'Despesa registrada.' });
      // FR-025: offer to copy the previous month's budgets if this expense lands
      // in a month with no budget yet. Never blocks the expense flow.
      void copyPrompt.checkAfterExpense(expense.date);
    },
    onError: (err) => {
      if (err.kind !== 'validation') showToast({ kind: 'error', message: err.message });
    },
    onConcurrentCategoryRemoval: concurrentRemovalToast,
  });

  const updateHook = useUpdateExpense({
    onSuccess: (expense) => {
      replaceItem(expense.id, expense);
      setFormMode({ kind: 'closed' });
      showToast({ kind: 'success', message: 'Despesa atualizada.' });
    },
    on404Concurrent: (id) => {
      setFormMode((m) =>
        m.kind === 'edit' ? { kind: 'edit', expense: m.expense, concurrencyError: true } : m,
      );
      removeItem(id);
    },
    onError: (err) => {
      if (err.kind !== 'validation' && err.kind !== 'not_found') {
        showToast({ kind: 'error', message: err.message });
      }
    },
    onConcurrentCategoryRemoval: concurrentRemovalToast,
  });

  const deleteHook = useDeleteExpense({
    onSuccess: (id) => {
      removeItem(id);
      setDeleting(null);
      showToast({ kind: 'success', message: 'Despesa excluída.' });
    },
    onError: (err) => showToast({ kind: 'error', message: err.message }),
  });

  function handleOpenCreate(): void {
    createHook.resetFieldErrors();
    setFormMode({ kind: 'create' });
  }

  function handleEdit(expense: Expense): void {
    updateHook.resetFieldErrors();
    setFormMode({ kind: 'edit', expense, concurrencyError: false });
  }

  function handleCloseForm(): void {
    if (createHook.isSaving || updateHook.isSaving) return;
    setFormMode({ kind: 'closed' });
    createHook.resetFieldErrors();
    updateHook.resetFieldErrors();
  }

  function handleSubmitForm(body: Parameters<typeof createHook.submit>[0]): Promise<void> | void {
    if (formMode.kind === 'create') return createHook.submit(body);
    if (formMode.kind === 'edit') return updateHook.submit(formMode.expense.id, body);
  }

  function handleDeleteRequest(expense: Expense): void {
    setDeleting(expense);
  }

  function handleConfirmDelete(id: string): void {
    void deleteHook.remove(id);
  }

  const isFormOpen = formMode.kind !== 'closed';
  const formInitial = formMode.kind === 'edit' ? formMode.expense : undefined;
  const formFieldErrors =
    formMode.kind === 'edit' ? updateHook.fieldErrors : createHook.fieldErrors;
  const formIsSaving = formMode.kind === 'edit' ? updateHook.isSaving : createHook.isSaving;
  const formConcurrencyError = formMode.kind === 'edit' ? formMode.concurrencyError : false;

  return (
    <div className="p-6 sm:p-8">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Despesas</h1>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nova despesa
        </button>
      </header>

      <ExpenseList
        items={items}
        nextCursor={nextCursor}
        isInitialLoading={isInitialLoading}
        isLoadingMore={isLoadingMore}
        onLoadMore={loadMore}
        onEdit={handleEdit}
        onDelete={handleDeleteRequest}
        onEmptyCta={handleOpenCreate}
      />

      <ExpenseFormModal
        open={isFormOpen}
        mode={formMode.kind === 'edit' ? 'edit' : 'create'}
        members={members}
        initial={formInitial}
        roots={categoryRoots}
        subsByRoot={categorySubsByRoot}
        onClose={handleCloseForm}
        onSubmit={handleSubmitForm}
        isSaving={formIsSaving}
        fieldErrors={formFieldErrors}
        concurrencyError={formConcurrencyError}
      />

      <DeleteExpenseModal
        open={deleting !== null}
        expense={deleting}
        isDeleting={deleteHook.isDeleting}
        onCancel={() => {
          if (!deleteHook.isDeleting) setDeleting(null);
        }}
        onConfirm={handleConfirmDelete}
      />

      <CopyPreviousMonthDialog
        open={copyPrompt.prompt !== null}
        fromMonth={copyPrompt.prompt?.fromMonth ?? ''}
        toMonth={copyPrompt.prompt?.toMonth ?? ''}
        isCopying={copyPrompt.isCopying}
        onClose={copyPrompt.dismiss}
        onConfirm={() => void copyPrompt.confirm()}
      />

      <Toast value={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
