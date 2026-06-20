import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui';
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
    <Modal
      open={open}
      onClose={onCancel}
      title={mode === 'create' ? 'Novo cartão' : 'Editar cartão'}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-fg hover:bg-bg"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="credit-card-form"
            disabled={isSaving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {isSaving ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="credit-card-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="cc-name" className="mb-1 block text-sm font-medium text-fg">
            Nome
          </label>
          <input
            id="cc-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSaving}
            maxLength={60}
            className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Ex.: Nubank"
          />
          {fieldErrorMessage(fieldErrors, 'name') && (
            <p className="mt-1 text-sm text-danger">{fieldErrorMessage(fieldErrors, 'name')}</p>
          )}
        </div>

        <div>
          <label htmlFor="cc-closing" className="mb-1 block text-sm font-medium text-fg">
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
            className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {fieldErrorMessage(fieldErrors, 'closingDay') && (
            <p className="mt-1 text-sm text-danger">
              {fieldErrorMessage(fieldErrors, 'closingDay')}
            </p>
          )}
        </div>

        {localError && <p className="text-sm text-danger">{localError}</p>}
      </form>
    </Modal>
  );
}
