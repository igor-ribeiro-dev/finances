import { CreditCard as CreditCardIcon } from 'lucide-react';
import { useCreditCards } from '../../hooks/useCreditCards';
import { formatCents } from '../../utils/money';
import { GlassCard } from '@/components/ui';

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
    <GlassCard className="p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
        <CreditCardIcon size={16} className="text-primary" />
        Cartões — em aberto
      </h2>
      <ul className="divide-y divide-border">
        {withCharges.map((c) => (
          <li key={c.id} className="flex items-center justify-between py-2 text-sm">
            <span className="text-fg">{c.name}</span>
            <span className="font-medium text-fg">{formatCents(c.openChargesCents)}</span>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
