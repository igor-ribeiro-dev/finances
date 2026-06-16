import { CreditCard as CreditCardIcon } from 'lucide-react';
import { useCreditCards } from '../../hooks/useCreditCards';
import { formatCents } from '../../utils/money';

/**
 * FR-007: per-card summary of accumulated open charges, shown in the Monthly
 * Payment Tracker so the upcoming cash obligation is visible before the fatura
 * is created. Only cards with open charges are listed.
 */
export function CreditCardSummarySection() {
  const { cards, isLoading } = useCreditCards();

  if (isLoading) return null;
  const withCharges = cards.filter((c) => c.openChargesCents > 0);
  if (withCharges.length === 0) return null;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
        <CreditCardIcon size={16} className="text-indigo-500" />
        Cartões — em aberto
      </h2>
      <ul className="divide-y divide-gray-100">
        {withCharges.map((c) => (
          <li key={c.id} className="flex items-center justify-between py-2 text-sm">
            <span className="text-gray-700">{c.name}</span>
            <span className="font-medium text-gray-900">{formatCents(c.openChargesCents)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
