export type LimitType = 'ABSOLUTE' | 'PERCENT';

export interface ResolvedLimit {
  limitType: LimitType;
  amountCents: number | null;
  percent: number | null;
  /** Effective cents (half-up); null = "não resolvível" (base ausente, FR-022). */
  resolvedCents: number | null;
}

export interface MemberBudget {
  memberId: string;
  name: string;
  budget: ResolvedLimit | null;
}

export interface CategoryBudget {
  categoryId: string;
  name: string;
  parentId: string | null;
  budget: ResolvedLimit | null;
}

export interface AllocationSummary {
  familyAmountCents: number | null;
  totalAllocatedCents: number;
  unallocatedCents: number;
  allocatedPercent: number | null;
  unallocatedPercent: number | null;
}

export type WarningCode = 'category.allocation_exceeds_family' | 'subcategory.exceeds_root';

export interface BudgetWarning {
  code: WarningCode;
  categoryId?: string;
}

export interface MonthBudget {
  month: string;
  family: ResolvedLimit | null;
  members: MemberBudget[];
  categories: CategoryBudget[];
  summary: AllocationSummary;
  warnings: BudgetWarning[];
}

export interface CopyResult extends MonthBudget {
  copiedCount: number;
}

/** Input limit for a member/category target (zero/`null` clears it). */
export type LimitInput =
  | { limitType: 'ABSOLUTE'; amountCents: number }
  | { limitType: 'PERCENT'; percent: number };

export interface UpsertMonthBudgetBody {
  family?: { limitType: 'ABSOLUTE'; amountCents: number } | null;
  members?: { memberId: string; budget: LimitInput | null }[];
  categories?: { categoryId: string; budget: LimitInput | null }[];
}

export interface FieldError {
  field: string;
  code: string;
  message: string;
}

export type BudgetServiceError =
  | { kind: 'validation'; status: number; message: string; fieldErrors: FieldError[] }
  | { kind: 'not_authenticated'; message: string }
  | { kind: 'forbidden'; code: string; message: string }
  | { kind: 'not_found'; code: string; message: string }
  | { kind: 'network'; message: string }
  | { kind: 'server'; status: number; code: string; message: string };
