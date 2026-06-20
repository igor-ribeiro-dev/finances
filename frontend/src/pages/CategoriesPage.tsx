import { useState } from 'react';
import { Plus } from 'lucide-react';
import { CategoryTree } from '../components/category/CategoryTree';
import { CategoryFormModal } from '../components/category/CategoryFormModal';
import { DeleteCategoryModal } from '../components/category/DeleteCategoryModal';
import { useCategoriesList } from '../hooks/useCategoriesList';
import { useCreateCategory } from '../hooks/useCreateCategory';
import { useUpdateCategory } from '../hooks/useUpdateCategory';
import { useDeletePreview } from '../hooks/useDeletePreview';
import { useDeleteCategory } from '../hooks/useDeleteCategory';
import { Toast, type ToastState } from '../components/Toast';
import type { BlockerInfo, Category, CategoryFormPayload } from '../types/category';

type FormMode = { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; category: Category };

type DeleteState =
  | { kind: 'closed' }
  | { kind: 'destructive'; category: Category }
  | { kind: 'blocking'; category: Category; blockers: BlockerInfo };

export function CategoriesPage() {
  const { categories, roots, isLoading, insertOptimistic, replaceOptimistic, removeOptimistic } =
    useCategoriesList();
  const [formMode, setFormMode] = useState<FormMode>({ kind: 'closed' });
  const [deleteState, setDeleteState] = useState<DeleteState>({ kind: 'closed' });
  const [toast, setToast] = useState<ToastState | null>(null);

  const createHook = useCreateCategory({
    onSuccess: (category) => {
      insertOptimistic(category);
      setFormMode({ kind: 'closed' });
      setToast({ kind: 'success', message: 'Categoria criada.' });
    },
    onError: (err) => {
      if (err.kind !== 'validation') setToast({ kind: 'error', message: err.message });
    },
  });

  const updateHook = useUpdateCategory({
    onSuccess: (category) => {
      replaceOptimistic(category.id, category);
      setFormMode({ kind: 'closed' });
      setToast({ kind: 'success', message: 'Categoria atualizada.' });
    },
    onError: (err) => {
      if (err.kind !== 'validation') setToast({ kind: 'error', message: err.message });
    },
  });

  const previewHook = useDeletePreview();

  const deleteHook = useDeleteCategory({
    onSuccess: (id) => {
      removeOptimistic(id);
      setDeleteState({ kind: 'closed' });
      setToast({ kind: 'success', message: 'Categoria excluída.' });
    },
    // Race between preview and delete — upgrade to the blocking modal with fresh counts.
    onBlocked: (blockers) => {
      setDeleteState((s) =>
        s.kind === 'closed' ? s : { kind: 'blocking', category: s.category, blockers },
      );
    },
    onError: (err) => setToast({ kind: 'error', message: err.message }),
  });

  const isSaving = formMode.kind === 'edit' ? updateHook.isSaving : createHook.isSaving;
  const fieldErrors = formMode.kind === 'edit' ? updateHook.fieldErrors : createHook.fieldErrors;

  function handleOpenCreate(): void {
    createHook.resetFieldErrors();
    setFormMode({ kind: 'create' });
  }

  function handleEdit(category: Category): void {
    updateHook.resetFieldErrors();
    setFormMode({ kind: 'edit', category });
  }

  async function handleDelete(category: Category): Promise<void> {
    const preview = await previewHook.fetch(category.id);
    if (!preview) {
      setToast({ kind: 'error', message: 'Não foi possível verificar as dependências.' });
      return;
    }
    const blocked = preview.subCategoriesCount > 0 || preview.affectedExpensesCount > 0;
    setDeleteState(
      blocked
        ? { kind: 'blocking', category, blockers: preview }
        : { kind: 'destructive', category },
    );
  }

  function handleCloseForm(): void {
    if (isSaving) return;
    setFormMode({ kind: 'closed' });
    createHook.resetFieldErrors();
    updateHook.resetFieldErrors();
  }

  function handleSubmit(payload: CategoryFormPayload): Promise<void> | void {
    if (formMode.kind === 'create') return createHook.submit(payload);
    if (formMode.kind === 'edit') return updateHook.submit(formMode.category.id, payload);
  }

  function handleConfirmDelete(): void {
    if (deleteState.kind === 'destructive') void deleteHook.remove(deleteState.category.id);
  }

  const isFormOpen = formMode.kind !== 'closed';
  const formInitial =
    formMode.kind === 'edit'
      ? {
          id: formMode.category.id,
          name: formMode.category.name,
          parentId: formMode.category.parentId,
        }
      : undefined;

  return (
    <div className="p-6 sm:p-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-fg">Categorias</h1>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nova categoria
        </button>
      </header>

      {isLoading ? (
        <p className="text-fg-muted" role="status">
          Carregando categorias…
        </p>
      ) : (
        <CategoryTree
          categories={categories}
          onEdit={handleEdit}
          onDelete={(c) => void handleDelete(c)}
          onCreateFirst={handleOpenCreate}
        />
      )}

      <CategoryFormModal
        open={isFormOpen}
        mode={formMode.kind === 'edit' ? 'edit' : 'create'}
        initial={formInitial}
        roots={roots}
        isSaving={isSaving}
        fieldErrors={fieldErrors}
        onSubmit={handleSubmit}
        onCancel={handleCloseForm}
      />

      {deleteState.kind !== 'closed' && (
        <DeleteCategoryModal
          open
          mode={deleteState.kind}
          categoryName={deleteState.category.name}
          blockers={deleteState.kind === 'blocking' ? deleteState.blockers : undefined}
          isDeleting={deleteHook.isDeleting}
          onClose={() => {
            if (!deleteHook.isDeleting) setDeleteState({ kind: 'closed' });
          }}
          onConfirm={handleConfirmDelete}
        />
      )}

      <Toast value={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
