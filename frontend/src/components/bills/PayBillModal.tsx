import { useEffect, useState } from 'react';
import { Modal, Pill } from '@/components/ui';
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

  useEffect(() => {
    if (!open) return;
    setPaidDate(mode === 'pay' ? todayIso() : (bill.payment?.paidDate ?? todayIso()));
    setAmountCents(bill.payment?.actualAmountCents ?? bill.expectedAmountCents);
    setPaidByMemberId(bill.payment?.paidByMemberId ?? bill.ownerMemberId ?? '');
    setPaymentMethod(
      bill.payment?.paymentMethod ?? (bill.creditCardId ? 'CREDIT_CARD' : 'CASH_OR_DEBIT'),
    );
    setCreditCardId(bill.creditCardId ?? '');
    setError(null);
    void listGroupMembers()
      .then((list) => {
        setMembers(list);
        if (!paidByMemberId && list[0]) setPaidByMemberId(list[0].id);
      })
      .catch(() => {});
    void creditCardService
      .listCards()
      .then((list) => setCards(list.filter((c) => c.status === 'ACTIVE')))
      .catch(() => {});
  }, [open, mode]);

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
    <Modal
      open={open}
      onClose={onClose}
      title={title}
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
            form="pay-bill-form"
            disabled={isSaving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {isSaving ? 'Salvando…' : mode === 'pay' ? 'Registrar pagamento' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="pay-bill-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-lg bg-bg px-3 py-2 text-sm text-fg-muted">
          <span className="font-medium text-fg">{bill.description}</span>
          <span className="ml-2 text-fg-muted">
            · Previsto {formatCents(bill.expectedAmountCents)}
          </span>
        </div>

        <div>
          <label htmlFor="paid-date" className="block text-sm font-medium text-fg">
            Data do pagamento
          </label>
          <input
            id="paid-date"
            type="date"
            value={paidDate}
            onChange={(e) => setPaidDate(e.target.value)}
            required
            className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <label htmlFor="paid-amount" className="block text-sm font-medium text-fg">
            Valor pago (R$)
          </label>
          <input
            id="paid-amount"
            type="text"
            inputMode="numeric"
            value={amountReais}
            onChange={(e) => handleAmountChange(e.target.value)}
            required
            className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <label htmlFor="paid-by" className="block text-sm font-medium text-fg">
            Pago por
          </label>
          <select
            id="paid-by"
            value={paidByMemberId}
            onChange={(e) => setPaidByMemberId(e.target.value)}
            required
            className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
            <label htmlFor="pay-card" className="block text-sm font-medium text-fg">
              Cartão
            </label>
            <select
              id="pay-card"
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
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
