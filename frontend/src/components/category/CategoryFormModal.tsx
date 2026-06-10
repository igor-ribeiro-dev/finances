import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { Category, CategoryFormPayload, FieldError } from '../../types/category';

const collator = new Intl.Collator('pt-BR', { sensitivity: 'accent' });
const ROOT_SENTINEL = '__root__'; // <select> value standing in for parentId = null

export interface CategoryFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  /** id is used in edit mode to exclude the category itself from parent options. */
  initial?: { id?: string; name: string; parentId: string | null };
  roots: Category[];
  isSaving: boolean;
  fieldErrors?: FieldError[];
  onSubmit: (payload: CategoryFormPayload) => Promise<void> | void;
  onCancel: () => void;
}

function fieldErrorMessage(errors: FieldError[] | undefined, field: string): string | undefined {
  return errors?.find((e) => e.field === field)?.message;
}

export function CategoryFormModal({
  open,
  mode,
  initial,
  roots,
  isSaving,
  fieldErrors,
  onSubmit,
  onCancel,
}: CategoryFormModalProps) {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setParentId(initial?.parentId ?? null);
    setLocalError(null);
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isSaving) onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, isSaving, onCancel]);

  if (!open) return null;

  const editingRoot = mode === 'edit' && (initial?.parentId ?? null) === null;
  const editingSub = mode === 'edit' && (initial?.parentId ?? null) !== null;
  const parentDisabled = isSaving || editingRoot;

  const selectableRoots = [...roots]
    .filter((r) => r.id !== initial?.id)
    .sort((a, b) => collator.compare(a.name, b.name));

  function validateLocal(): string | null {
    const trimmed = name.trim();
    if (trimmed.length === 0) return 'Informe um nome.';
    if (trimmed.length > 60) return 'O nome deve ter no máximo 60 caracteres.';
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validateLocal();
    if (err) {
      setLocalError(err);
      return;
    }
    setLocalError(null);
    await onSubmit({ name: name.trim(), parentId });
  }

  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === e.currentTarget && !isSaving) onCancel();
  }

  function handleParentChange(value: string) {
    setParentId(value === ROOT_SENTINEL ? null : value);
  }

  const title = mode === 'create' ? 'Nova categoria' : 'Editar categoria';
  const nameError = fieldErrorMessage(fieldErrors, 'name');
  const parentError = fieldErrorMessage(fieldErrors, 'parentId');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-modal-title"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <header className="mb-4 flex items-center justify-between">
          <h2 id="category-modal-title" className="text-lg font-semibold text-gray-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            aria-label="Fechar"
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="category-name" className="block text-sm font-medium text-gray-700">
              Nome
            </label>
            <input
              id="category-name"
              type="text"
              maxLength={60}
              value={name}
              autoFocus
              disabled={isSaving}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={Boolean(nameError)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {nameError && <p className="mt-1 text-sm text-red-600">{nameError}</p>}
          </div>

          <div>
            <label htmlFor="category-parent" className="block text-sm font-medium text-gray-700">
              Categoria pai
            </label>
            <select
              id="category-parent"
              value={parentId ?? ROOT_SENTINEL}
              disabled={parentDisabled}
              onChange={(e) => handleParentChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-100 disabled:text-gray-500"
            >
              {/* A sub-category may move between roots but cannot become a root (role
                  immutability, FR-012), so the "root" option is hidden when editing a sub. */}
              {!editingSub && <option value={ROOT_SENTINEL}>Criar como raiz</option>}
              {selectableRoots.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            {editingRoot && (
              <p className="mt-1 text-xs text-gray-500">
                Categorias raiz não podem virar sub-categorias.
              </p>
            )}
            {parentError && <p className="mt-1 text-sm text-red-600">{parentError}</p>}
          </div>

          {localError && (
            <p className="text-sm text-red-600" role="alert">
              {localError}
            </p>
          )}

          <footer className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {isSaving ? 'Salvando…' : 'Salvar'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
