import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { billService } from '../../services/bill.service';
import { creditCardService } from '../../services/credit-card.service';
import { listGroupMembers, type GroupMember } from '../../services/group.service';
import { formatCents } from '../../utils/money';
import type { Bill, PaymentMethod, ServiceError } from '../../types/bill';
import type { CreditCard } from '../../types/credit-card';

interface Props {
  open: boolean;
  bill: Bill;
  mode: 'pay' | 'edit-payment';
  onClose: () => void;
  onSuccess: () => void;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function PayBillModal({ open, bill, mode, onClose, onSuccess }: Props) {
  const [paidDate, setPaidDate] = useState(todayIso());
  const [amountCents, setAmountCents] = useState(bill.expectedAmountCents);
  const [paidByMemberId, setPaidByMemberId] = useState(bill.ownerMemberId ?? '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH_OR_DEBIT');
  const [creditCardId, setCreditCardId] = useState('');
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // Reset to payment defaults on open. Pay mode always starts with today;
    // edit mode keeps the existing payment date.
    setPaidDate(mode === 'pay' ? todayIso() : (bill.payment?.paidDate ?? todayIso()));
    setAmountCents(bill.payment?.actualAmountCents ?? bill.expectedAmountCents);
    setPaidByMemberId(bill.payment?.paidByMemberId ?? bill.ownerMemberId ?? '');
    // For a PENDING instance that inherited a card from its conta fixa
    // (subscription), default the method to credit card so paying is one click.
    setPaymentMethod(
      bill.payment?.paymentMethod ?? (bill.creditCardId ? 'CREDIT_CARD' : 'CASH_OR_DEBIT'),
    );
    setCreditCardId(bill.creditCardId ?? '');
    setError(null);
    // Fetch members
    void listGroupMembers()
      .then((list) => {
        setMembers(list);
        if (!paidByMemberId && list[0]) setPaidByMemberId(list[0].id);
      })
      .catch(() => {
        /* keep empty list */
      });
    void creditCardService
      .listCards()
      .then((list) => setCards(list.filter((c) => c.status === 'ACTIVE')))
      .catch(() => {});
  }, [open, mode]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const amountReais = (amountCents / 100).toFixed(2).replace('.', ',');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!paidByMemberId) {
      setError('Selecione o membro que pagou.');
      return;
    }
    if (amountCents <= 0) {
      setError('O valor pago deve ser maior que zero.');
      return;
    }
    if (paymentMethod === 'CREDIT_CARD' && !creditCardId) {
      setError('Selecione o cartão de crédito utilizado.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const body = {
        paidDate,
        actualAmountCents: amountCents,
        paidByMemberId,
        paymentMethod,
        creditCardId: paymentMethod === 'CREDIT_CARD' ? creditCardId : null,
      };
      if (mode === 'pay') {
        await billService.pay(bill.id, body);
      } else {
        await billService.updatePayment(bill.id, body);
      }
      onSuccess();
    } catch (err) {
      const svcErr = err as ServiceError;
      setError(svcErr.message ?? 'Erro ao salvar pagamento.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleAmountChange(raw: string) {
    const digits = raw.replace(/\D/g, '');
    setAmountCents(digits ? parseInt(digits, 10) : 0);
  }

  const title = mode === 'pay' ? 'Registrar pagamento' : 'Editar pagamento';

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
        aria-labelledby="pay-bill-title"
        className="w-full max-w-md rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 id="pay-bill-title" className="text-base font-semibold text-gray-900">
            {title}
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
          <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
            <span className="font-medium text-gray-900">{bill.description}</span>
            <span className="ml-2 text-gray-500">
              · Previsto {formatCents(bill.expectedAmountCents)}
            </span>
          </div>

          <div>
            <label htmlFor="paid-date" className="block text-sm font-medium text-gray-700">
              Data do pagamento
            </label>
            <input
              id="paid-date"
              type="date"
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label htmlFor="paid-amount" className="block text-sm font-medium text-gray-700">
              Valor pago (R$)
            </label>
            <input
              id="paid-amount"
              type="text"
              inputMode="numeric"
              value={amountReais}
              onChange={(e) => handleAmountChange(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label htmlFor="paid-by" className="block text-sm font-medium text-gray-700">
              Pago por
            </label>
            <select
              id="paid-by"
              value={paidByMemberId}
              onChange={(e) => setPaidByMemberId(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="" disabled>
                Selecione o membro
              </option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
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
                      name="payment-method"
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
              <label htmlFor="pay-card" className="block text-sm font-medium text-gray-700">
                Cartão
              </label>
              <select
                id="pay-card"
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
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
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
              {isSaving ? 'Salvando…' : mode === 'pay' ? 'Registrar pagamento' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
