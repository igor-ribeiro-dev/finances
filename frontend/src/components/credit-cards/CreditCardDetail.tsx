import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { creditCardService } from '../../services/credit-card.service';
import { formatCents } from '../../utils/money';
import type { CreditCardDetail as CardDetail } from '../../types/credit-card';

export interface CreditCardDetailProps {
  cardId: string;
  onClose: () => void;
  /** Optional: open the "registrar fatura" flow for this card (US4). */
  onRegisterFatura?: (detail: CardDetail) => void;
}

function formatDateBr(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function CreditCardDetail({ cardId, onClose, onRegisterFatura }: CreditCardDetailProps) {
  const [detail, setDetail] = useState<CardDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    creditCardService
      .getCard(cardId)
      .then((d) => {
        if (active) setDetail(d);
      })
      .catch((e: { message?: string }) => {
        if (active) setError(e.message ?? 'Erro ao carregar o cartão.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [cardId]);

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
        className="w-full max-w-lg rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            {detail ? detail.name : 'Cartão'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4">
          {isLoading ? (
            <p className="text-sm text-gray-500">Carregando…</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : detail ? (
            <>
              <div className="mb-4 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                <div>
                  <p className="text-xs text-gray-500">Em aberto</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCents(detail.openChargesCents)}
                  </p>
                </div>
                <p className="text-xs text-gray-500">
                  Fatura fecha em {formatDateBr(detail.cycleCloseDate)}
                </p>
              </div>

              {onRegisterFatura && detail.status === 'ACTIVE' && (
                <button
                  type="button"
                  onClick={() => onRegisterFatura(detail)}
                  className="mb-4 w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Registrar fatura
                </button>
              )}

              <h3 className="mb-2 text-sm font-medium text-gray-700">Compras em aberto</h3>
              {detail.openCharges.length === 0 ? (
                <p className="rounded-md border border-dashed border-gray-200 p-4 text-center text-sm text-gray-500">
                  Nenhuma compra em aberto neste cartão.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                  {detail.openCharges.map((c) => (
                    <li key={c.id} className="flex items-center justify-between px-4 py-2 text-sm">
                      <div>
                        <p className="text-gray-900">{c.description}</p>
                        <p className="text-xs text-gray-500">
                          {formatDateBr(c.paidDate)}
                          {c.paidByMember ? ` · ${c.paidByMember.name}` : ''}
                          {c.category ? ` · ${c.category.name}` : ''}
                        </p>
                      </div>
                      <span className="font-medium text-gray-900">
                        {formatCents(c.actualAmountCents)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
