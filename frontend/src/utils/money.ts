const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Cents → `R$ 1.500,00`. `null` → `—` (não resolvível). */
export function formatCents(cents: number | null): string {
  if (cents === null) return '—';
  return BRL.format(cents / 100);
}
