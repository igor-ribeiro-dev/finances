import { useCallback, useEffect, useState } from 'react';
import { creditCardService } from '../services/credit-card.service';
import type {
  CreditCard,
  CreditCardServiceError,
  CreateCardPayload,
  UpdateCardPayload,
  RegisterFaturaPayload,
} from '../types/credit-card';

const collator = new Intl.Collator('pt-BR', { sensitivity: 'accent' });

export interface UseCreditCardsReturn {
  cards: CreditCard[];
  activeCards: CreditCard[];
  isLoading: boolean;
  error: CreditCardServiceError | null;
  refresh: () => Promise<void>;
  createCard: (body: CreateCardPayload) => Promise<CreditCard>;
  updateCard: (id: string, body: UpdateCardPayload) => Promise<CreditCard>;
  archiveCard: (id: string) => Promise<CreditCard>;
  deleteCard: (id: string) => Promise<void>;
  registerFatura: (id: string, body: RegisterFaturaPayload) => Promise<{ id: string }>;
}

function sortCards(cards: CreditCard[]): CreditCard[] {
  return [...cards].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'ACTIVE' ? -1 : 1;
    return collator.compare(a.name, b.name);
  });
}

export function useCreditCards(): UseCreditCardsReturn {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<CreditCardServiceError | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setCards(sortCards(await creditCardService.listCards()));
    } catch (err) {
      setError(err as CreditCardServiceError);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createCard = useCallback(
    async (body: CreateCardPayload) => {
      const card = await creditCardService.createCard(body);
      await load();
      return card;
    },
    [load],
  );

  const updateCard = useCallback(
    async (id: string, body: UpdateCardPayload) => {
      const card = await creditCardService.updateCard(id, body);
      await load();
      return card;
    },
    [load],
  );

  const archiveCard = useCallback(
    async (id: string) => {
      const card = await creditCardService.archiveCard(id);
      await load();
      return card;
    },
    [load],
  );

  const deleteCard = useCallback(
    async (id: string) => {
      await creditCardService.deleteCard(id);
      await load();
    },
    [load],
  );

  const registerFatura = useCallback(
    async (id: string, body: RegisterFaturaPayload) => {
      const bill = await creditCardService.registerFatura(id, body);
      await load();
      return bill;
    },
    [load],
  );

  const activeCards = cards.filter((c) => c.status === 'ACTIVE');

  return {
    cards,
    activeCards,
    isLoading,
    error,
    refresh: load,
    createCard,
    updateCard,
    archiveCard,
    deleteCard,
    registerFatura,
  };
}
