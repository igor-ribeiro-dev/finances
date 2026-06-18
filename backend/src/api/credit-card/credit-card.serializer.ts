import type { CreditCard } from '@prisma/client';

export interface OpenChargeResponse {
  id: string;
  description: string;
  actualAmountCents: number;
  paidDate: string;
  paidByMember: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
}

export interface CreditCardResponse {
  id: string;
  name: string;
  closingDay: number;
  status: 'ACTIVE' | 'ARCHIVED';
  openChargesCents: number;
}

export interface CreditCardDetailResponse extends CreditCardResponse {
  // Informational forecast (FR-001a): when the currently-open fatura closes.
  cycleCloseDate: string;
  openCharges: OpenChargeResponse[];
}

/**
 * Maps a CreditCard row to the API response. `openChargesCents` defaults to 0
 * (real value is computed by US3 and passed in). normalizedName is @ignore'd by
 * the Prisma client, so it can never leak here.
 */
export function mapCreditCardToResponse(
  card: CreditCard,
  openChargesCents = 0,
): CreditCardResponse {
  return {
    id: card.id,
    name: card.name,
    closingDay: card.closingDay,
    status: card.status,
    openChargesCents,
  };
}
