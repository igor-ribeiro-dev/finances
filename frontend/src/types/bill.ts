export type BillStatus = 'PENDING' | 'PAID' | 'CANCELLED';
export type RecurrenceInterval = 'MONTHLY' | 'ANNUAL';
export type RecurringBillStatus = 'ACTIVE' | 'PAUSED' | 'STOPPED';
export type PaymentMethod = 'CASH_OR_DEBIT' | 'CREDIT_CARD';

export interface BillCategoryRef {
  id: string;
  name: string;
}

export interface BillMemberRef {
  id: string;
  name: string;
}

export interface BillPayment {
  paidDate: string; // YYYY-MM-DD
  actualAmountCents: number;
  paidByMemberId: string;
  paymentMethod: PaymentMethod;
}

export interface Bill {
  id: string;
  groupId: string;
  description: string;
  expectedAmountCents: number;
  dueDate: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  status: BillStatus;
  isOverdue: boolean;
  categoryId: string | null;
  category: BillCategoryRef | null;
  ownerMemberId: string | null;
  ownerMember: BillMemberRef | null;
  recurringBillId: string | null;
  payment: BillPayment | null;
}

export interface ProjectedBill {
  recurringBillId: string;
  description: string;
  expectedAmountCents: number;
  dueDate: string; // YYYY-MM-DD
  categoryId: string | null;
  ownerMemberId: string | null;
}

export interface MonthSummary {
  totalExpectedCents: number;
  totalPaidCents: number;
  totalPendingCents: number;
  projectedCents: number;
}

export interface MonthBillsResponse {
  month: string; // YYYY-MM
  summary: MonthSummary;
  bills: Bill[];
  projectedBills: ProjectedBill[];
}

export interface RecurringBill {
  id: string;
  groupId: string;
  description: string;
  expectedAmountCents: number;
  dueDay: number; // 1-31
  interval: RecurrenceInterval;
  startMonth: string; // YYYY-MM
  status: RecurringBillStatus;
  categoryId: string | null;
  ownerMemberId: string | null;
}

export interface CreateBillBody {
  description: string;
  expectedAmountCents: number;
  dueDate: string; // YYYY-MM-DD
  categoryId?: string | null;
  ownerMemberId?: string | null;
}

export type UpdateBillBody = Partial<CreateBillBody>;

export interface CopyBillsBody {
  fromMonth: string; // YYYY-MM
  toMonth: string; // YYYY-MM
  dryRun: boolean;
}

export interface CopyBillsDryRunResponse {
  count: number;
}

export interface CopyBillsResponse {
  bills: Bill[];
}

export interface PayBillBody {
  paidDate: string; // YYYY-MM-DD
  actualAmountCents: number;
  paidByMemberId: string;
  paymentMethod: PaymentMethod;
}

export type UpdatePaymentBody = PayBillBody;

export interface CreateRecurringBillBody {
  description: string;
  expectedAmountCents: number;
  dueDay: number;
  interval: RecurrenceInterval;
  startMonth: string; // YYYY-MM
  includeStartMonth?: boolean;
  categoryId?: string | null;
  ownerMemberId?: string | null;
}

export type UpdateRecurringBillBody = Partial<
  Omit<CreateRecurringBillBody, 'startMonth' | 'includeStartMonth'>
>;

export interface ServiceError {
  kind:
    | 'validation'
    | 'not_authenticated'
    | 'forbidden'
    | 'not_found'
    | 'conflict'
    | 'network'
    | 'server';
  status?: number;
  code?: string;
  message: string;
  fieldErrors?: Array<{ field: string; code: string; message: string }>;
}
