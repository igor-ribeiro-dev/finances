import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui';
import { recurringBillService } from '../../services/recurring-bill.service';
import { categoryService } from '../../services/category.service';
import { listGroupMembers, type GroupMember } from '../../services/group.service';
import type { Category } from '../../types/category';
import type {
  RecurringBill,
  RecurrenceInterval,
  CreateRecurringBillBody,
  ServiceError,
} from '../../types/bill';
import { currentMonth } from '../../utils/month';

interface Props {
  open: boolean;
  mode: 'create' | 'edit';
  item?: RecurringBill;
  onClose: () => void;
  onSuccess: () => void;
}

function parseCents(raw: string): number {
  const n = parseFloat(raw.replace(',', '.'));
  return isNaN(n) ? 0 : Math.round(n * 100);
}

function centsToInput(cents: number): string {
  if (cents === 0) return '';
  return (cents / 100).toFixed(2).replace('.', ',');
}

export function RecurringBillFormModal({ open, mode, item, onClose, onSuccess }: Props) {
  const [description, setDescription] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [dueDay, setDueDay] = useState('1');
  const [interval, setInterval] = useState<RecurrenceInterval>('MONTHLY');
  const [startMonth, setStartMonth] = useState(currentMonth());
  const [includeStartMonth, setIncludeStartMonth] = useState(true);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [ownerMemberId, setOwnerMemberId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Array<{ field: string; message: string }>>([]);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && item) {
      setDescription(item.description);
      setAmountInput(centsToInput(item.expectedAmountCents));
      setDueDay(String(item.dueDay));
      setInterval(item.interval);
      setStartMonth(item.startMonth);
      setCategoryId(item.categoryId ?? null);
      setOwnerMemberId(item.ownerMemberId ?? null);
    } else {
      setDescription('');
      setAmountInput('');
      setDueDay('1');
      setInterval('MONTHLY');
      setStartMonth(currentMonth());
      setIncludeStartMonth(true);
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
  }, [open, mode, item]);

  const rootCategories = categories.filter((c) => c.parentId === null);

  function getFieldError(field: string) {
    return fieldErrors.find((e) => e.field === field)?.message;
  }

  function validate(): string | null {
    if (!description.trim()) return 'Informe uma descrição.';
    if (description.trim().length > 200) return 'Descrição muito longa.';
    if (parseCents(amountInput) <= 0) return 'Informe um valor maior que zero.';
    const day = parseInt(dueDay, 10);
    if (isNaN(day) || day < 1 || day > 31) return 'Dia de vencimento inválido (1–31).';
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) {
      setLocalError(err);
      return;
    }
    setLocalError(null);
    setFieldErrors([]);
    setIsSaving(true);

    try {
      if (mode === 'edit' && item) {
        const body: import('../../types/bill').UpdateRecurringBillBody = {
          description: description.trim(),
          expectedAmountCents: parseCents(amountInput),
          dueDay: parseInt(dueDay, 10),
          interval,
          categoryId,
          ownerMemberId,
        };
        await recurringBillService.update(item.id, body);
      } else {
        const body: CreateRecurringBillBody = {
          description: description.trim(),
          expectedAmountCents: parseCents(amountInput),
          dueDay: parseInt(dueDay, 10),
          interval,
          startMonth,
          includeStartMonth,
          categoryId,
          ownerMemberId,
        };
        await recurringBillService.create(body);
      }
      onSuccess();
    } catch (serviceErr) {
      const svcErr = serviceErr as ServiceError;
      if (svcErr.fieldErrors && svcErr.fieldErrors.length > 0) {
        setFieldErrors(svcErr.fieldErrors.map((fe) => ({ field: fe.field, message: fe.message })));
      } else {
        setLocalError(svcErr.message ?? 'Erro ao salvar conta fixa.');
      }
    } finally {
      setIsSaving(false);
    }
  }

  const title = mode === 'create' ? 'Nova conta fixa' : 'Editar conta fixa';

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
            form="recurring-bill-form"
            disabled={isSaving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {isSaving ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="recurring-bill-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="rb-description" className="block text-sm font-medium text-fg">
            Descrição <span aria-hidden="true">*</span>
          </label>
          <input
            id="rb-description"
            type="text"
            maxLength={200}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSaving}
            autoFocus
            aria-required="true"
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
          {getFieldError('description') && (
            <p className="mt-1 text-sm text-danger" role="alert">
              {getFieldError('description')}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="rb-amount" className="block text-sm font-medium text-fg">
            Valor (R$) <span aria-hidden="true">*</span>
          </label>
          <input
            id="rb-amount"
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            disabled={isSaving}
            aria-required="true"
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
          {getFieldError('expectedAmountCents') && (
            <p className="mt-1 text-sm text-danger" role="alert">
              {getFieldError('expectedAmountCents')}
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <div className="w-28">
            <label htmlFor="rb-due-day" className="block text-sm font-medium text-fg">
              Dia <span aria-hidden="true">*</span>
            </label>
            <input
              id="rb-due-day"
              type="number"
              min={1}
              max={31}
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              disabled={isSaving}
              aria-required="true"
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
            {getFieldError('dueDay') && (
              <p className="mt-1 text-sm text-danger" role="alert">
                {getFieldError('dueDay')}
              </p>
            )}
          </div>
          <div className="flex-1">
            <label htmlFor="rb-interval" className="block text-sm font-medium text-fg">
              Frequência <span aria-hidden="true">*</span>
            </label>
            <select
              id="rb-interval"
              value={interval}
              onChange={(e) => setInterval(e.target.value as RecurrenceInterval)}
              disabled={isSaving}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            >
              <option value="MONTHLY">Mensal</option>
              <option value="ANNUAL">Anual</option>
            </select>
          </div>
        </div>

        {mode === 'create' && (
          <div>
            <label htmlFor="rb-start-month" className="block text-sm font-medium text-fg">
              Início <span aria-hidden="true">*</span>
            </label>
            <input
              id="rb-start-month"
              type="month"
              value={startMonth}
              onChange={(e) => setStartMonth(e.target.value)}
              disabled={isSaving}
              aria-required="true"
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
            <label className="mt-2 flex items-center gap-2 text-sm text-fg-muted">
              <input
                type="checkbox"
                checked={includeStartMonth}
                onChange={(e) => setIncludeStartMonth(e.target.checked)}
                disabled={isSaving}
                className="accent-primary"
              />
              Gerar conta já para o mês inicial
            </label>
          </div>
        )}

        <div>
          <label htmlFor="rb-category" className="block text-sm font-medium text-fg">
            Categoria <span className="text-fg-muted">(opcional)</span>
          </label>
          <select
            id="rb-category"
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
          <label htmlFor="rb-owner" className="block text-sm font-medium text-fg">
            Responsável <span className="text-fg-muted">(opcional)</span>
          </label>
          <select
            id="rb-owner"
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
