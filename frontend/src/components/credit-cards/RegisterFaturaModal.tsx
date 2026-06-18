import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
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
      // fatura.pending_exists → friendly message
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">Registrar fatura</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          <div>
            <label htmlFor="fatura-amount" className="block text-sm font-medium text-gray-700">
              Valor da fatura (R$)
            </label>
            <input
              id="fatura-amount"
              type="text"
              inputMode="numeric"
              value={amountReais}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0,00"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="fatura-due" className="block text-sm font-medium text-gray-700">
              Vencimento
            </label>
            <input
              id="fatura-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="fatura-desc" className="block text-sm font-medium text-gray-700">
              Descrição (opcional)
            </label>
            <input
              id="fatura-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              placeholder="Ex.: Fatura junho"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

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
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSaving ? 'Salvando…' : 'Registrar fatura'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
