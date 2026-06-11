import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { formatCents } from '../../utils/money';
import { percentOf } from '../../utils/percent';
import type { CategorySpending } from '../../types/dashboard';

interface CategorySpendingListProps {
  categories: CategorySpending[];
  uncategorizedSpentCents: number;
  /** Family total of the month — base for root participation (FR-009). */
  totalSpentCents: number;
}

interface RootRow {
  id: string;
  name: string;
  spentCents: number;
  cat: CategorySpending | null; // null = "Sem categoria"
}

function capLabel(spentCents: number, capCents: number): { text: string; over: boolean } {
  const pct = percentOf(spentCents, capCents) ?? 0;
  return { text: `${pct}% do teto de ${formatCents(capCents)}`, over: spentCents > capCents };
}

/**
 * US3 — spending distribution per root category (participation % of the month
 * total), expandable into sub-categories whose % is relative to the root (Q3).
 * Shown roots: spending > 0 OR a defined cap (research R8); plus "Sem categoria".
 */
export function CategorySpendingList({
  categories,
  uncategorizedSpentCents,
  totalSpentCents,
}: CategorySpendingListProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const subsByRoot = new Map<string, CategorySpending[]>();
  for (const c of categories) {
    if (c.parentId !== null) {
      const arr = subsByRoot.get(c.parentId) ?? [];
      arr.push(c);
      subsByRoot.set(c.parentId, arr);
    }
  }

  const rows: RootRow[] = categories
    .filter((c) => c.parentId === null && (c.spentCents > 0 || (c.budget?.resolvedCents ?? 0) > 0))
    .map((c) => ({ id: c.categoryId, name: c.name, spentCents: c.spentCents, cat: c }));
  if (uncategorizedSpentCents > 0) {
    rows.push({
      id: 'uncategorized',
      name: 'Sem categoria',
      spentCents: uncategorizedSpentCents,
      cat: null,
    });
  }
  rows.sort((a, b) => b.spentCents - a.spentCents);

  return (
    <section
      aria-labelledby="category-spending-title"
      className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      <h2 id="category-spending-title" className="text-sm font-medium text-gray-500">
        Categorias
      </h2>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">Nenhuma despesa registrada neste mês.</p>
      ) : (
        <ul className="mt-4 divide-y divide-gray-100">
          {rows.map((row) => {
            const participation = percentOf(row.spentCents, totalSpentCents);
            const capCents = row.cat?.budget?.resolvedCents ?? null;
            const cap =
              capCents !== null && capCents > 0 ? capLabel(row.spentCents, capCents) : null;
            const subs = row.cat
              ? (subsByRoot.get(row.cat.categoryId) ?? []).filter(
                  (s) => s.spentCents > 0 || (s.budget?.resolvedCents ?? 0) > 0,
                )
              : [];
            const isOpen = expanded[row.id] === true;
            const showDirectBucket =
              row.cat !== null && row.cat.directSpentCents > 0 && subs.length > 0;

            const header = (
              <div className="flex flex-1 flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium text-gray-900">{row.name}</span>
                <span className="text-sm text-gray-700">
                  {formatCents(row.spentCents)}
                  {participation !== null && (
                    <span className="ml-2 text-gray-500">{participation}% do total</span>
                  )}
                </span>
              </div>
            );

            return (
              <li key={row.id} data-testid={`category-root-${row.id}`} className="py-3">
                {subs.length > 0 ? (
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setExpanded((prev) => ({ ...prev, [row.id]: !isOpen }))}
                    className="flex w-full items-center gap-2 text-left"
                  >
                    {isOpen ? (
                      <ChevronDown size={16} className="text-gray-400" aria-hidden />
                    ) : (
                      <ChevronRight size={16} className="text-gray-400" aria-hidden />
                    )}
                    {header}
                  </button>
                ) : (
                  <div className="flex items-center gap-2">{header}</div>
                )}

                {cap && (
                  <p
                    className={`mt-1 text-xs ${cap.over ? 'font-semibold text-red-600' : 'text-gray-500'}`}
                  >
                    {cap.text}
                    {cap.over && ' — excedido'}
                  </p>
                )}

                {isOpen && subs.length > 0 && row.cat && (
                  <ul className="mt-2 space-y-1 border-l border-gray-100 pl-6">
                    {subs.map((sub) => {
                      const subShare = percentOf(sub.spentCents, row.cat!.spentCents);
                      const subCapCents = sub.budget?.resolvedCents ?? null;
                      const subCap =
                        subCapCents !== null && subCapCents > 0
                          ? capLabel(sub.spentCents, subCapCents)
                          : null;
                      return (
                        <li
                          key={sub.categoryId}
                          data-testid={`category-sub-${sub.categoryId}`}
                          className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
                        >
                          <span className="text-gray-700">{sub.name}</span>
                          <span className="text-gray-600">
                            {formatCents(sub.spentCents)}
                            {subShare !== null && (
                              <span className="ml-2 text-gray-400">{subShare}% da categoria</span>
                            )}
                            {subCap && (
                              <span
                                className={`ml-2 ${subCap.over ? 'font-semibold text-red-600' : 'text-gray-400'}`}
                              >
                                {subCap.text}
                              </span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                    {showDirectBucket && (
                      <li
                        data-testid={`category-sub-${row.id}-direct`}
                        className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
                      >
                        <span className="italic text-gray-500">Lançadas direto na categoria</span>
                        <span className="text-gray-600">
                          {formatCents(row.cat.directSpentCents)}
                          {percentOf(row.cat.directSpentCents, row.cat.spentCents) !== null && (
                            <span className="ml-2 text-gray-400">
                              {percentOf(row.cat.directSpentCents, row.cat.spentCents)}% da
                              categoria
                            </span>
                          )}
                        </span>
                      </li>
                    )}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
