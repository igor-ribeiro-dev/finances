// Wire types of GET /api/v1/dashboard (feature 009) — mirror of contracts/openapi.yaml.
// All monetary fields are integer cents; display percentages are derived client-side.
import type { ResolvedLimit, BudgetServiceError } from './budget';

export interface FamilySummary {
  spentCents: number;
  budget: ResolvedLimit | null;
}

export interface MemberSpending {
  memberId: string;
  name: string;
  /** Former group member that still owns expenses this month (inactive row, no budget). */
  isExMember: boolean;
  spentCents: number;
  budget: ResolvedLimit | null;
}

export interface CategorySpending {
  categoryId: string;
  name: string;
  /** null = root category. */
  parentId: string | null;
  /** Expenses assigned exactly to this category. */
  directSpentCents: number;
  /** Roots: direct + Σ subs' direct (umbrella rule). Subs: equals direct. */
  spentCents: number;
  budget: ResolvedLimit | null;
}

export interface MonthDashboard {
  month: string;
  family: FamilySummary;
  members: MemberSpending[];
  categories: CategorySpending[];
  uncategorizedSpentCents: number;
}

/** Same flat error envelope as every other service (features 004–008). */
export type DashboardServiceError = BudgetServiceError;
