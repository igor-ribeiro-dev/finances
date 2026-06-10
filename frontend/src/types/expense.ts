export type PaymentMethod = 'CASH_OR_DEBIT' | 'CREDIT_CARD';

export interface ExpenseOwnerSnapshot {
  id: string;
  name: string;
  isExMember: boolean;
}

/** Denormalized category reference embedded on an expense (server-resolved). */
export interface CategoryRef {
  id: string;
  name: string;
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
  /** FR-026: the resolved root (case A/B) or null (case C). */
  category?: CategoryRef | null;
  /** FR-026: the sub-category (case B) or null. */
  subCategory?: CategoryRef | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  /** FR-018: e.g. ["category.removed_concurrently"]. */
  warnings?: string[];
}

export interface CreateExpenseBody {
  amountCents: number;
  date: string;
  description: string;
  paymentMethod: PaymentMethod;
  ownerMemberId: string;
  /** Single-column design (FR-008): maps both root + sub pickers to one id. */
  categoryId?: string | null;
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
