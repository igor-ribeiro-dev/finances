import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { billService } from '../../services/bill.service';
import { categoryService } from '../../services/category.service';
import { listGroupMembers, type GroupMember } from '../../services/group.service';
import { formatCents } from '../../utils/money';
import type { Bill, CreateBillBody, ServiceError } from '../../types/bill';
import type { Category } from '../../types/category';

export interface BillFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  selectedMonth: string; // YYYY-MM
  bill?: Bill; // for edit mode
  onClose: () => void;
  onSuccess: () => void;
}

function defaultDueDate(selectedMonth: string): string {
  return `${selectedMonth}-01`;
}

function parseCentsFromInput(raw: string): number {
  const normalized = raw.replace(',', '.');
  const parsed = parseFloat(normalized);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

function centsToInputValue(cents: number): string {
  if (cents === 0) return '';
  return (cents / 100).toFixed(2).replace('.', ',');
}

export function BillFormModal({
  open,
  mode,
  selectedMonth,
  bill,
  onClose,
  onSuccess,
}: BillFormModalProps) {
  const [description, setDescription] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [ownerMemberId, setOwnerMemberId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Array<{ field: string; message: string }>>([]);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && bill) {
      setDescription(bill.description);
      setAmountInput(centsToInputValue(bill.expectedAmountCents));
      setDueDate(bill.dueDate);
      setCategoryId(bill.categoryId);
      setOwnerMemberId(bill.ownerMemberId);
    } else {
      setDescription('');
      setAmountInput('');
      setDueDate(defaultDueDate(selectedMonth));
      setCategoryId(null);
      setOwnerMemberId(null);
    }
    setLocalError(null);
    setFieldErrors([]);
    setIsSaving(false);

    // Fetch categories and members
    void categoryService
      .listCategories()
      .then(setCategories)
      .catch(() => {});
    void listGroupMembers()
      .then(setMembers)
      .catch(() => {});
  }, [open, mode, bill, selectedMonth]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isSaving) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, isSaving, onClose]);

  if (!open) return null;

  function getFieldError(field: string): string | undefined {
    return fieldErrors.find((e) => e.field === field)?.message;
  }

  function validateLocal(): string | null {
    if (description.trim().length === 0) return 'Informe uma descrição.';
    if (description.trim().length > 200) return 'Descrição muito longa (máx. 200 caracteres).';
    const cents = parseCentsFromInput(amountInput);
    if (cents <= 0) return 'Informe um valor maior que zero.';
    if (!dueDate) return 'Informe a data de vencimento.';
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
    setFieldErrors([]);
    setIsSaving(true);

    const body: CreateBillBody = {
      description: description.trim(),
      expectedAmountCents: parseCentsFromInput(amountInput),
      dueDate,
      categoryId: categoryId ?? null,
      ownerMemberId: ownerMemberId ?? null,
    };

    try {
      if (mode === 'edit' && bill) {
        await billService.update(bill.id, body);
      } else {
        await billService.create(body);
      }
      onSuccess();
    } catch (serviceErr) {
      const svcErr = serviceErr as ServiceError;
      if (svcErr.fieldErrors && svcErr.fieldErrors.length > 0) {
        setFieldErrors(svcErr.fieldErrors.map((fe) => ({ field: fe.field, message: fe.message })));
      } else {
        setLocalError(svcErr.message ?? 'Erro ao salvar conta.');
      }
    } finally {
      setIsSaving(false);
    }
  }

  // Only show root categories (no parentId) for simplicity
  const rootCategories = categories.filter((c) => c.parentId === null);

  const title = mode === 'create' ? 'Nova conta' : 'Editar conta';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bill-modal-title"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-center justify-between">
          <h2 id="bill-modal-title" className="text-lg font-semibold text-gray-900">
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
          {/* Description */}
          <div>
            <label htmlFor="bill-description" className="block text-sm font-medium text-gray-700">
              Descrição <span aria-hidden="true">*</span>
            </label>
            <input
              id="bill-description"
              type="text"
              maxLength={200}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSaving}
              aria-required="true"
              autoFocus
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
            />
            {getFieldError('description') && (
              <p className="mt-1 text-sm text-red-600" role="alert">
                {getFieldError('description')}
              </p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="bill-amount" className="block text-sm font-medium text-gray-700">
              Valor (R$) <span aria-hidden="true">*</span>
            </label>
            <input
              id="bill-amount"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              disabled={isSaving}
              aria-required="true"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
            />
            {mode === 'edit' && bill && (
              <p className="mt-1 text-xs text-gray-500">
                Atual: {formatCents(bill.expectedAmountCents)}
              </p>
            )}
            {getFieldError('expectedAmountCents') && (
              <p className="mt-1 text-sm text-red-600" role="alert">
                {getFieldError('expectedAmountCents')}
              </p>
            )}
          </div>

          {/* Due date */}
          <div>
            <label htmlFor="bill-due-date" className="block text-sm font-medium text-gray-700">
              Vencimento <span aria-hidden="true">*</span>
            </label>
            <input
              id="bill-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={isSaving}
              aria-required="true"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
            />
            {getFieldError('dueDate') && (
              <p className="mt-1 text-sm text-red-600" role="alert">
                {getFieldError('dueDate')}
              </p>
            )}
          </div>

          {/* Category (optional) */}
          <div>
            <label htmlFor="bill-category" className="block text-sm font-medium text-gray-700">
              Categoria <span className="text-gray-400">(opcional)</span>
            </label>
            <select
              id="bill-category"
              value={categoryId ?? ''}
              onChange={(e) => setCategoryId(e.target.value || null)}
              disabled={isSaving}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
            >
              <option value="">Nenhuma</option>
              {rootCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Owner member (optional) */}
          <div>
            <label htmlFor="bill-owner" className="block text-sm font-medium text-gray-700">
              Responsável <span className="text-gray-400">(opcional)</span>
            </label>
            <select
              id="bill-owner"
              value={ownerMemberId ?? ''}
              onChange={(e) => setOwnerMemberId(e.target.value || null)}
              disabled={isSaving}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
            >
              <option value="">Nenhum</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

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
      </div>
    </div>
  );
}
