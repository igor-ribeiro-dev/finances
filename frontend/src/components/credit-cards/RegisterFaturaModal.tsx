import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui';
import { creditCardService } from '../../services/credit-card.service';
import type { CreditCardServiceError } from '../../types/credit-card';

export interface RegisterFaturaModalProps {
  cardId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function RegisterFaturaModal({ cardId, onClose, onSuccess }: RegisterFaturaModalProps) {
  const [amountCents, setAmountCents] = useState(0);
  const [dueDate, setDueDate] = useState(todayIso());
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill the amount with the card's current open charges as a suggestion.
  useEffect(() => {
    let active = true;
    creditCardService
      .getCard(cardId)
      .then((d) => {
        if (active && d.openChargesCents > 0) setAmountCents(d.openChargesCents);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [cardId]);

  const amountReais = amountCents > 0 ? (amountCents / 100).toFixed(2).replace('.', ',') : '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (amountCents <= 0) {
      setError('O valor da fatura deve ser maior que zero.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await creditCardService.registerFatura(cardId, {
        expectedAmountCents: amountCents,
        dueDate,
        description: description.trim() || undefined,
      });
      onSuccess();
    } catch (err) {
      const e2 = err as CreditCardServiceError;
      setError(e2.message ?? 'Erro ao registrar a fatura.');
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
      open={true}
      onClose={onClose}
      title="Registrar fatura"
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
            form="register-fatura-form"
            disabled={isSaving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {isSaving ? 'Salvando…' : 'Registrar fatura'}
          </button>
        </>
      }
    >
      <form id="register-fatura-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="fatura-amount" className="block text-sm font-medium text-fg">
            Valor da fatura (R$)
          </label>
          <input
            id="fatura-amount"
            type="text"
            inputMode="numeric"
            value={amountReais}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="0,00"
            className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <label htmlFor="fatura-due" className="block text-sm font-medium text-fg">
            Vencimento
          </label>
          <input
            id="fatura-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
            className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <label htmlFor="fatura-desc" className="block text-sm font-medium text-fg">
            Descrição (opcional)
          </label>
          <input
            id="fatura-desc"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={200}
            placeholder="Ex.: Fatura junho"
            className="mt-1 block w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
