/** Calendar-month (`YYYY-MM`) helpers, all in UTC to avoid timezone drift. */

export function currentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function previousMonth(month: string): string {
  return addMonths(month, -1);
}

const MONTH_NAMES_PT = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

/** `2026-06` → `Junho de 2026`. */
export function formatMonthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const name = MONTH_NAMES_PT[m - 1] ?? '';
  const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
  return `${capitalized} de ${y}`;
}
