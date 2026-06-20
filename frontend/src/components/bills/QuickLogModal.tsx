import { useEffect, useState } from 'react';
import { Modal, Pill } from '@/components/ui';
import { billService } from '../../services/bill.service';
import { creditCardService } from '../../services/credit-card.service';
import { listGroupMembers, type GroupMember } from '../../services/group.service';
import type { PaymentMethod, ServiceError } from '../../types/bill';
import type { CreditCard } from '../../types/credit-card';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function QuickLogModal({ open, onClose, onSuccess }: Props) {
  const [description, setDescription] = useState('');
  const [amountCents, setAmountCents] = useState(0);
  const [date, setDate] = useState(todayIso);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH_OR_DEBIT');
  const [paidByMemberId, setPaidByMemberId] = useState('');
  const [categoryId] = useState<string | null>(null);
  const [creditCardId, setCreditCardId] = useState('');
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setDescription('');
    setAmountCents(0);
    setDate(todayIso());
    setPaymentMethod('CASH_OR_DEBIT');
    setPaidByMemberId('');
    setCreditCardId('');
    setErrors({});
    void listGroupMembers()
      .then((list) => {
        setMembers(list);
        if (list[0]) setPaidByMemberId(list[0].id);
      })
      .catch(() => {});
    void creditCardService
      .listCards()
      .then((list) => setCards(list.filter((c) => c.status === 'ACTIVE')))
      .catch(() => {});
  }, [open]);

  const amountReais = amountCents > 0 ? (amountCents / 100).toFixed(2).replace('.', ',') : '';

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!description.trim()) next['description'] = 'A descrição é obrigatória.';
    if (amountCents <= 0) next['amount'] = 'O valor deve ser maior que zero.';
    if (!date) next['date'] = 'A data é obrigatória.';
    if (!paidByMemberId) next['paidByMemberId'] = 'Selecione o responsável.';
    if (paymentMethod === 'CREDIT_CARD' && !creditCardId) {
      next['creditCardId'] = 'Selecione o cartão de crédito utilizado.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setIsSaving(true);
    setErrors({});
    try {
      await billService.logSpending({
        description: description.trim(),
        amountCents,
        date,
        paymentMethod,
        paidByMemberId,
        categoryId,
        creditCardId: paymentMethod === 'CREDIT_CARD' ? creditCardId : null,
      });
      onSuccess();
    } catch (err) {
      const svcErr = err as ServiceError;
      if (svcErr.fieldErrors) {
        const fieldMap: Record<string, string> = {};
        for (const fe of svcErr.fieldErrors) fieldMap[fe.field] = fe.message;
        setErrors(fieldMap);
      } else {
        setErrors({ _root: svcErr.message ?? 'Erro ao registrar gasto.' });
      }
    } finally {
      setIsSaving(false);
    }
  }

  function handleAmountChange(raw: string) {
    const digits = raw.replace(/\D/g, '');
    setAmountCents(digits ? parseInt(digits, 10) : 0);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar gasto"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-fg hover:bg-bg"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="quick-log-form"
            disabled={isSaving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {isSaving ? 'Salvando…' : 'Registrar'}
          </button>
        </>
      }
    >
      <form id="quick-log-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="ql-description" className="block text-sm font-medium text-fg">
            Descrição
          </label>
          <input
            id="ql-description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Supermercado"
            className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {errors['description'] && (
            <p className="mt-1 text-xs text-danger">{errors['description']}</p>
          )}
        </div>

        <div>
          <label htmlFor="ql-amount" className="block text-sm font-medium text-fg">
            Valor (R$)
          </label>
          <input
            id="ql-amount"
            type="text"
            inputMode="numeric"
            value={amountReais}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="0,00"
            className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {errors['amount'] && <p className="mt-1 text-xs text-danger">{errors['amount']}</p>}
        </div>

        <div>
          <label htmlFor="ql-date" className="block text-sm font-medium text-fg">
            Data da compra
          </label>
          <input
            id="ql-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={todayIso()}
            required
            className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {errors['date'] && <p className="mt-1 text-xs text-danger">{errors['date']}</p>}
        </div>

        <div>
          <label htmlFor="ql-member" className="block text-sm font-medium text-fg">
            Responsável
          </label>
          <select
            id="ql-member"
            value={paidByMemberId}
            onChange={(e) => setPaidByMemberId(e.target.value)}
            required
            className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="" disabled>
              Selecione o responsável
            </option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          {errors['paidByMemberId'] && (
            <p className="mt-1 text-xs text-danger">{errors['paidByMemberId']}</p>
          )}
        </div>

        <div>
          <p className="block text-sm font-medium text-fg mb-2">Método de pagamento</p>
          <div className="flex gap-2" role="group" aria-label="Método de pagamento">
            {(['CASH_OR_DEBIT', 'CREDIT_CARD'] as PaymentMethod[]).map((method) => (
              <Pill
                key={method}
                selected={paymentMethod === method}
                onClick={() => setPaymentMethod(method)}
              >
                {method === 'CASH_OR_DEBIT' ? 'Débito / Dinheiro' : 'Cartão de crédito'}
              </Pill>
            ))}
          </div>
        </div>

        {paymentMethod === 'CREDIT_CARD' && (
          <div>
            <label htmlFor="ql-card" className="block text-sm font-medium text-fg">
              Cartão
            </label>
            <select
              id="ql-card"
              value={creditCardId}
              onChange={(e) => setCreditCardId(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="" disabled>
                Selecione o cartão
              </option>
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors['creditCardId'] && (
              <p className="mt-1 text-xs text-danger">{errors['creditCardId']}</p>
            )}
          </div>
        )}

        {errors['_root'] && (
          <p role="alert" className="text-sm text-danger">
            {errors['_root']}
          </p>
        )}
      </form>
    </Modal>
  );
}
