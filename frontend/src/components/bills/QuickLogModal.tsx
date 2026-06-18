import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
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
  const dialogRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-log-title"
        className="w-full max-w-md rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 id="quick-log-title" className="text-base font-semibold text-gray-900">
            Registrar gasto
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-md p-1 text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          <div>
            <label htmlFor="ql-description" className="block text-sm font-medium text-gray-700">
              Descrição
            </label>
            <input
              id="ql-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Supermercado"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            {errors['description'] && (
              <p className="mt-1 text-xs text-red-600">{errors['description']}</p>
            )}
          </div>

          <div>
            <label htmlFor="ql-amount" className="block text-sm font-medium text-gray-700">
              Valor (R$)
            </label>
            <input
              id="ql-amount"
              type="text"
              inputMode="numeric"
              value={amountReais}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0,00"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            {errors['amount'] && <p className="mt-1 text-xs text-red-600">{errors['amount']}</p>}
          </div>

          <div>
            <label htmlFor="ql-date" className="block text-sm font-medium text-gray-700">
              Data da compra
            </label>
            <input
              id="ql-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={todayIso()}
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            {errors['date'] && <p className="mt-1 text-xs text-red-600">{errors['date']}</p>}
          </div>

          <div>
            <label htmlFor="ql-member" className="block text-sm font-medium text-gray-700">
              Responsável
            </label>
            <select
              id="ql-member"
              value={paidByMemberId}
              onChange={(e) => setPaidByMemberId(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
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
              <p className="mt-1 text-xs text-red-600">{errors['paidByMemberId']}</p>
            )}
          </div>

          <div>
            <fieldset>
              <legend className="block text-sm font-medium text-gray-700">
                Método de pagamento
              </legend>
              <div className="mt-2 flex gap-3">
                {(['CASH_OR_DEBIT', 'CREDIT_CARD'] as PaymentMethod[]).map((method) => (
                  <label key={method} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="ql-payment-method"
                      value={method}
                      checked={paymentMethod === method}
                      onChange={() => setPaymentMethod(method)}
                      className="accent-teal-600"
                    />
                    <span className="text-sm text-gray-700">
                      {method === 'CASH_OR_DEBIT' ? 'Débito / Dinheiro' : 'Cartão de crédito'}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          {paymentMethod === 'CREDIT_CARD' && (
            <div>
              <label htmlFor="ql-card" className="block text-sm font-medium text-gray-700">
                Cartão
              </label>
              <select
                id="ql-card"
                value={creditCardId}
                onChange={(e) => setCreditCardId(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
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
                <p className="mt-1 text-xs text-red-600">{errors['creditCardId']}</p>
              )}
            </div>
          )}

          {errors['_root'] && (
            <p role="alert" className="text-sm text-red-600">
              {errors['_root']}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {isSaving ? 'Salvando…' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
