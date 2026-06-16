import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { FieldError } from '../../types/credit-card';

export interface CreditCardFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: { name: string; closingDay: number };
  isSaving: boolean;
  fieldErrors?: FieldError[];
  onSubmit: (payload: { name: string; closingDay: number }) => Promise<void> | void;
  onCancel: () => void;
}

function fieldErrorMessage(errors: FieldError[] | undefined, field: string): string | undefined {
  return errors?.find((e) => e.field === field)?.message;
}

export function CreditCardFormModal({
  open,
  mode,
  initial,
  isSaving,
  fieldErrors,
  onSubmit,
  onCancel,
}: CreditCardFormModalProps) {
  const [name, setName] = useState('');
  const [closingDay, setClosingDay] = useState('1');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setClosingDay(String(initial?.closingDay ?? 1));
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

  function validateLocal(): string | null {
    const trimmed = name.trim();
    if (trimmed.length === 0) return 'Informe um nome.';
    if (trimmed.length > 60) return 'O nome deve ter no máximo 60 caracteres.';
    const day = Number(closingDay);
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      return 'O dia de fechamento deve estar entre 1 e 31.';
    }
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
    await onSubmit({ name: name.trim(), closingDay: Number(closingDay) });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === 'create' ? 'Novo cartão' : 'Editar cartão'}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            aria-label="Fechar"
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="cc-name" className="mb-1 block text-sm font-medium text-gray-700">
              Nome
            </label>
            <input
              id="cc-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSaving}
              maxLength={60}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              placeholder="Ex.: Nubank"
            />
            {fieldErrorMessage(fieldErrors, 'name') && (
              <p className="mt-1 text-sm text-red-600">{fieldErrorMessage(fieldErrors, 'name')}</p>
            )}
          </div>

          <div>
            <label htmlFor="cc-closing" className="mb-1 block text-sm font-medium text-gray-700">
              Dia de fechamento da fatura
            </label>
            <input
              id="cc-closing"
              type="number"
              min={1}
              max={31}
              value={closingDay}
              onChange={(e) => setClosingDay(e.target.value)}
              disabled={isSaving}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
            {fieldErrorMessage(fieldErrors, 'closingDay') && (
              <p className="mt-1 text-sm text-red-600">
                {fieldErrorMessage(fieldErrors, 'closingDay')}
              </p>
            )}
          </div>

          {localError && <p className="text-sm text-red-600">{localError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSaving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
