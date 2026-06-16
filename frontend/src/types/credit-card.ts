export type CreditCardStatus = 'ACTIVE' | 'ARCHIVED';

export interface FieldError {
  field: string;
  code: string;
  message: string;
}

export interface CreditCard {
  id: string;
  name: string;
  closingDay: number;
  status: CreditCardStatus;
  openChargesCents: number;
}

export interface OpenCharge {
  id: string;
  description: string;
  actualAmountCents: number;
  paidDate: string;
  paidByMember: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
}

export interface CreditCardDetail extends CreditCard {
  cycleCloseDate: string;
  openCharges: OpenCharge[];
}

export interface CreateCardPayload {
  name: string;
  closingDay: number;
}

export interface UpdateCardPayload {
  name?: string;
  closingDay?: number;
}

export interface RegisterFaturaPayload {
  expectedAmountCents: number;
  dueDate: string;
  description?: string;
}

export type CreditCardServiceError =
  | { kind: 'validation'; status: number; message: string; fieldErrors: FieldError[] }
  | { kind: 'not_authenticated'; message: string }
  | { kind: 'forbidden'; code: string; message: string }
  | { kind: 'not_found'; message: string }
  | { kind: 'conflict'; code: string; message: string }
  | { kind: 'server'; status: number; code: string; message: string }
  | { kind: 'network'; message: string };
