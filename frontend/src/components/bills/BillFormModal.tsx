import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui';
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

    void categoryService
      .listCategories()
      .then(setCategories)
      .catch(() => {});
    void listGroupMembers()
      .then(setMembers)
      .catch(() => {});
  }, [open, mode, bill, selectedMonth]);

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

  const rootCategories = categories.filter((c) => c.parentId === null);
  const title = mode === 'create' ? 'Nova conta' : 'Editar conta';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-fg hover:bg-bg disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="bill-form"
            disabled={isSaving}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {isSaving ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="bill-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="bill-description" className="block text-sm font-medium text-fg">
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
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
          {getFieldError('description') && (
            <p className="mt-1 text-sm text-danger" role="alert">
              {getFieldError('description')}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="bill-amount" className="block text-sm font-medium text-fg">
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
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
          {mode === 'edit' && bill && (
            <p className="mt-1 text-xs text-fg-muted">
              Atual: {formatCents(bill.expectedAmountCents)}
            </p>
          )}
          {getFieldError('expectedAmountCents') && (
            <p className="mt-1 text-sm text-danger" role="alert">
              {getFieldError('expectedAmountCents')}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="bill-due-date" className="block text-sm font-medium text-fg">
            Vencimento <span aria-hidden="true">*</span>
          </label>
          <input
            id="bill-due-date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={isSaving}
            aria-required="true"
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
          {getFieldError('dueDate') && (
            <p className="mt-1 text-sm text-danger" role="alert">
              {getFieldError('dueDate')}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="bill-category" className="block text-sm font-medium text-fg">
            Categoria <span className="text-fg-muted">(opcional)</span>
          </label>
          <select
            id="bill-category"
            value={categoryId ?? ''}
            onChange={(e) => setCategoryId(e.target.value || null)}
            disabled={isSaving}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          >
            <option value="">Nenhuma</option>
            {rootCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="bill-owner" className="block text-sm font-medium text-fg">
            Responsável <span className="text-fg-muted">(opcional)</span>
          </label>
          <select
            id="bill-owner"
            value={ownerMemberId ?? ''}
            onChange={(e) => setOwnerMemberId(e.target.value || null)}
            disabled={isSaving}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
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
          <p className="text-sm text-danger" role="alert">
            {localError}
          </p>
        )}
      </form>
    </Modal>
  );
}
