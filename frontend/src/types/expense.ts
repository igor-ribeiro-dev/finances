export type PaymentMethod = 'CASH_OR_DEBIT' | 'CREDIT_CARD';

export interface ExpenseOwnerSnapshot {
  id: string;
  name: string;
  isExMember: boolean;
}

export interface Expense {
  id: string;
  groupId: string;
  amountCents: number;
  date: string; // YYYY-MM-DD
  description: string;
  paymentMethod: PaymentMethod;
  ownerMemberId: string;
  ownerMember: ExpenseOwnerSnapshot;
  createdById: string;
  updatedById: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface CreateExpenseBody {
  amountCents: number;
  date: string;
  description: string;
  paymentMethod: PaymentMethod;
  ownerMemberId: string;
}

export type UpdateExpenseBody = CreateExpenseBody;

export interface ExpensePage {
  items: Expense[];
  nextCursor: string | null;
}

export interface FieldError {
  field: string;
  code: string;
  message: string;
}

export type ServiceError =
  | { kind: 'validation'; status: number; message: string; fieldErrors: FieldError[] }
  | { kind: 'not_authenticated'; message: string }
  | { kind: 'forbidden'; code: string; message: string }
  | { kind: 'not_found'; message: string }
  | { kind: 'conflict'; code: string; message: string }
  | { kind: 'network'; message: string }
  | { kind: 'server'; status: number; code: string; message: string };
