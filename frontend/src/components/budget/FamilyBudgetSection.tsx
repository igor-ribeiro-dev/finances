import { MoneyInput } from '../shared/MoneyInput';

interface FamilyBudgetSectionProps {
  cents: number;
  onChange: (cents: number) => void;
  disabled?: boolean;
}

/**
 * The family (global) budget — always an absolute R$ amount (FR-001). It is the
 * base for every percentage limit, so it sits at the top of the page.
 */
export function FamilyBudgetSection({ cents, onChange, disabled }: FamilyBudgetSectionProps) {
  return (
    <section
      className="rounded-xl border border-border bg-surface p-5"
      aria-labelledby="family-budget-heading"
    >
      <h2 id="family-budget-heading" className="mb-1 text-lg font-semibold text-fg">
        Orçamento da família
      </h2>
      <p className="mb-3 text-sm text-fg-muted">
        Teto total de gastos do mês. Serve de base para os limites em percentual.
      </p>
      <div className="flex items-center gap-3">
        <label htmlFor="family-budget-input" className="text-sm font-medium text-fg">
          Valor mensal
        </label>
        <div className="w-48">
          <MoneyInput
            id="family-budget-input"
            value={cents}
            onChange={onChange}
            ariaLabel="Orçamento da família"
            disabled={disabled}
          />
        </div>
        {cents === 0 && <span className="text-sm text-fg-muted">Não definido</span>}
      </div>
    </section>
  );
}
