import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { MoneyInput } from './MoneyInput';
import { OwnerMemberPicker } from './OwnerMemberPicker';
import { PaymentMethodPicker } from './PaymentMethodPicker';
import { RootCategoryPicker } from './RootCategoryPicker';
import { SubCategoryPicker } from './SubCategoryPicker';
import type { CreateExpenseBody, Expense, FieldError, PaymentMethod } from '../../types/expense';
import type { Category } from '../../types/category';
import type { GroupMember } from '../../services/group.service';

const HIGH_VALUE_THRESHOLD_CENTS = 100_000_000; // R$ 1.000.000,00

export interface ExpenseFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  members: GroupMember[];
  initial?: Expense;
  isSaving: boolean;
  fieldErrors?: FieldError[];
  /** When true, replaces the form with a concurrent-deletion notice. */
  concurrencyError?: boolean;
  /** Root categories for the picker (FR-007). Empty triggers the FR-025 hint. */
  roots?: Category[];
  /** Sub-categories grouped by their root id. */
  subsByRoot?: Map<string, Category[]>;
  onClose: () => void;
  onSubmit: (body: CreateExpenseBody) => Promise<void> | void;
}

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function fieldError(errors: FieldError[] | undefined, field: string): string | undefined {
  return errors?.find((e) => e.field === field)?.message;
}

export function ExpenseFormModal({
  open,
  mode,
  members,
  initial,
  isSaving,
  fieldErrors,
  concurrencyError,
  roots = [],
  subsByRoot,
  onClose,
  onSubmit,
}: ExpenseFormModalProps) {
  const [amountCents, setAmountCents] = useState(0);
  const [date, setDate] = useState(todayIso());
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH_OR_DEBIT');
  const [ownerMemberId, setOwnerMemberId] = useState('');
  const [selectedRootId, setSelectedRootId] = useState<string | null>(null);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [highValueConfirmOpen, setHighValueConfirmOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && initial) {
      setAmountCents(initial.amountCents);
      setDate(initial.date);
      setDescription(initial.description);
      setPaymentMethod(initial.paymentMethod);
      setOwnerMemberId(initial.ownerMemberId);
      // Derive the two selectors from the denormalized category/subCategory.
      setSelectedRootId(initial.category?.id ?? null);
      setSelectedSubId(initial.subCategory?.id ?? null);
    } else {
      setAmountCents(0);
      setDate(todayIso());
      setDescription('');
      setPaymentMethod('CASH_OR_DEBIT');
      setOwnerMemberId(members[0]?.id ?? '');
      setSelectedRootId(null);
      setSelectedSubId(null);
    }
    setLocalError(null);
    setHighValueConfirmOpen(false);
  }, [open, mode, initial, members]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isSaving && !highValueConfirmOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, isSaving, highValueConfirmOpen, onClose]);

  const today = useMemo(() => todayIso(), []);

  if (!open) return null;

  function validateLocal(): string | null {
    if (amountCents <= 0) return 'Informe um valor maior que zero.';
    if (date > today) return 'A data não pode estar no futuro.';
    if (description.trim().length === 0) return 'Informe uma descrição.';
    if (description.length > 200) return 'Descrição muito longa (máx. 200 caracteres).';
    if (!ownerMemberId) return 'Selecione o membro responsável.';
    return null;
  }

  function buildBody(): CreateExpenseBody {
    return {
      amountCents,
      date,
      description: description.trim(),
      paymentMethod,
      ownerMemberId,
      // Single-column design (FR-008): the sub wins, else the root, else none.
      categoryId: selectedSubId ?? selectedRootId ?? null,
    };
  }

  function handleRootChange(value: string | null): void {
    setSelectedRootId(value);
    setSelectedSubId(null); // changing root invalidates any selected sub
  }

  const subsForSelectedRoot = selectedRootId ? (subsByRoot?.get(selectedRootId) ?? []) : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validateLocal();
    if (err) {
      setLocalError(err);
      return;
    }
    setLocalError(null);

    if (amountCents > HIGH_VALUE_THRESHOLD_CENTS && !highValueConfirmOpen) {
      setHighValueConfirmOpen(true);
      return;
    }

    await onSubmit(buildBody());
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget && !isSaving && !highValueConfirmOpen) onClose();
  }

  const title = mode === 'create' ? 'Nova despesa' : 'Editar despesa';

  if (concurrencyError) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="concurrent-modal-title"
        className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      >
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
          <h2 id="concurrent-modal-title" className="mb-2 text-lg font-semibold text-gray-900">
            Despesa não encontrada
          </h2>
          <p className="mb-5 text-sm text-gray-700">
            Esta despesa foi excluída por outro membro do grupo enquanto você editava. Não é
            possível salvar.
          </p>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              autoFocus
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-modal-title"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onClick={handleBackdropClick}
    >
      <div ref={dialogRef} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <header className="mb-4 flex items-center justify-between">
          <h2 id="expense-modal-title" className="text-lg font-semibold text-gray-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Fechar"
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="expense-amount" className="block text-sm font-medium text-gray-700">
              Valor
            </label>
            <MoneyInput
              id="expense-amount"
              value={amountCents}
              onChange={setAmountCents}
              ariaInvalid={Boolean(fieldError(fieldErrors, 'amountCents'))}
              autoFocus
              disabled={isSaving}
            />
            {fieldError(fieldErrors, 'amountCents') && (
              <p className="mt-1 text-sm text-red-600">{fieldError(fieldErrors, 'amountCents')}</p>
            )}
          </div>

          <div>
            <label htmlFor="expense-date" className="block text-sm font-medium text-gray-700">
              Data
            </label>
            <input
              id="expense-date"
              type="date"
              max={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={isSaving}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {fieldError(fieldErrors, 'date') && (
              <p className="mt-1 text-sm text-red-600">{fieldError(fieldErrors, 'date')}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="expense-description"
              className="block text-sm font-medium text-gray-700"
            >
              Descrição
            </label>
            <input
              id="expense-description"
              type="text"
              maxLength={200}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSaving}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {fieldError(fieldErrors, 'description') && (
              <p className="mt-1 text-sm text-red-600">{fieldError(fieldErrors, 'description')}</p>
            )}
          </div>

          <div>
            <span className="mb-2 block text-sm font-medium text-gray-700">
              Método de pagamento
            </span>
            <PaymentMethodPicker
              value={paymentMethod}
              onChange={setPaymentMethod}
              disabled={isSaving}
            />
          </div>

          <div>
            <label htmlFor="expense-owner" className="block text-sm font-medium text-gray-700">
              Responsável
            </label>
            <OwnerMemberPicker
              id="expense-owner"
              members={members}
              value={ownerMemberId}
              onChange={setOwnerMemberId}
              ariaInvalid={Boolean(fieldError(fieldErrors, 'ownerMemberId'))}
              disabled={isSaving}
            />
            {fieldError(fieldErrors, 'ownerMemberId') && (
              <p className="mt-1 text-sm text-red-600">
                {fieldError(fieldErrors, 'ownerMemberId')}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="expense-root-category"
                className="block text-sm font-medium text-gray-700"
              >
                Categoria
              </label>
              <RootCategoryPicker
                id="expense-root-category"
                value={selectedRootId}
                roots={roots}
                onChange={handleRootChange}
                disabled={isSaving}
              />
            </div>
            <div>
              <label
                htmlFor="expense-sub-category"
                className="block text-sm font-medium text-gray-700"
              >
                Sub-categoria
              </label>
              <SubCategoryPicker
                id="expense-sub-category"
                rootId={selectedRootId}
                subs={subsForSelectedRoot}
                value={selectedSubId}
                onChange={setSelectedSubId}
                disabled={isSaving}
              />
            </div>
          </div>

          {roots.length === 0 && (
            <p className="text-xs text-gray-500">
              Cadastre categorias em{' '}
              <a href="/categorias" className="font-medium text-teal-600 hover:underline">
                Categorias
              </a>
              .
            </p>
          )}

          {localError && (
            <p className="text-sm text-red-600" role="alert">
              {localError}
            </p>
          )}

          <footer className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
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

        {highValueConfirmOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="high-value-title"
            className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/95 p-6"
          >
            <div className="max-w-sm text-center">
              <h3 id="high-value-title" className="mb-2 text-lg font-semibold text-gray-900">
                Confirmar valor alto
              </h3>
              <p className="mb-4 text-sm text-gray-700">
                Você está registrando um valor acima de R$ 1.000.000,00. Deseja continuar?
              </p>
              <div className="flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setHighValueConfirmOpen(false)}
                  disabled={isSaving}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setHighValueConfirmOpen(false);
                    await onSubmit(buildBody());
                  }}
                  disabled={isSaving}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
