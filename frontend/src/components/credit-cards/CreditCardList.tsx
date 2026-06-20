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
      <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-fg-muted">
        Nenhum cartão cadastrado. Adicione um cartão para começar.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
      {cards.map((card) => (
        <li key={card.id} className="flex items-center justify-between gap-3 p-4">
          <button
            type="button"
            onClick={() => onOpen(card)}
            className="flex flex-1 items-center gap-3 text-left"
          >
            <CreditCardIcon size={20} className="text-primary" />
            <div>
              <p className="font-medium text-fg">
                {card.name}
                {card.status === 'ARCHIVED' && (
                  <span className="ml-2 rounded bg-surface px-2 py-0.5 text-xs text-fg-muted">
                    Arquivado
                  </span>
                )}
              </p>
              <p className="text-xs text-fg-muted">
                Fecha dia {card.closingDay} · Em aberto: {formatCents(card.openChargesCents)}
              </p>
            </div>
          </button>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(card)}
              aria-label={`Editar ${card.name}`}
              className="rounded p-2 text-fg-muted hover:bg-bg hover:text-fg-muted"
            >
              <Pencil size={16} />
            </button>
            {card.status === 'ACTIVE' && (
              <button
                type="button"
                onClick={() => onArchive(card)}
                aria-label={`Arquivar ${card.name}`}
                className="rounded p-2 text-fg-muted hover:bg-bg hover:text-fg-muted"
              >
                <Archive size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={() => onDelete(card)}
              aria-label={`Excluir ${card.name}`}
              className="rounded p-2 text-fg-muted hover:bg-bg hover:text-danger"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
