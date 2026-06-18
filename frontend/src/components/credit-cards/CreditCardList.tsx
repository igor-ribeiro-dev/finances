import { CreditCard as CreditCardIcon, Pencil, Archive, Trash2 } from 'lucide-react';
import type { CreditCard } from '../../types/credit-card';
import { formatCents } from '../../utils/money';

export interface CreditCardListProps {
  cards: CreditCard[];
  onEdit: (card: CreditCard) => void;
  onArchive: (card: CreditCard) => void;
  onDelete: (card: CreditCard) => void;
  onOpen: (card: CreditCard) => void;
}

export function CreditCardList({
  cards,
  onEdit,
  onArchive,
  onDelete,
  onOpen,
}: CreditCardListProps) {
  if (cards.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
        Nenhum cartão cadastrado. Adicione um cartão para começar.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
      {cards.map((card) => (
        <li key={card.id} className="flex items-center justify-between gap-3 p-4">
          <button
            type="button"
            onClick={() => onOpen(card)}
            className="flex flex-1 items-center gap-3 text-left"
          >
            <CreditCardIcon size={20} className="text-indigo-500" />
            <div>
              <p className="font-medium text-gray-900">
                {card.name}
                {card.status === 'ARCHIVED' && (
                  <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                    Arquivado
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-500">
                Fecha dia {card.closingDay} · Em aberto: {formatCents(card.openChargesCents)}
              </p>
            </div>
          </button>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(card)}
              aria-label={`Editar ${card.name}`}
              className="rounded p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
            >
              <Pencil size={16} />
            </button>
            {card.status === 'ACTIVE' && (
              <button
                type="button"
                onClick={() => onArchive(card)}
                aria-label={`Arquivar ${card.name}`}
                className="rounded p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600"
              >
                <Archive size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={() => onDelete(card)}
              aria-label={`Excluir ${card.name}`}
              className="rounded p-2 text-gray-400 hover:bg-gray-50 hover:text-red-600"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
