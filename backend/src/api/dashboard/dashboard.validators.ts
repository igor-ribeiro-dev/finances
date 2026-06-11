import { z } from 'zod';
import { monthSchema } from '../budget/budget.validators';

/** `?month=YYYY-MM` — the only input of the dashboard endpoint. */
export const dashboardMonthQuery = z.object({ month: monthSchema });
