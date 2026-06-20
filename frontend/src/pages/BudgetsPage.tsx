import { useEffect, useMemo, useState } from 'react';
import { Copy } from 'lucide-react';
import { MonthSelector } from '../components/budget/MonthSelector';
import { FamilyBudgetSection } from '../components/budget/FamilyBudgetSection';
import { MemberBudgetList } from '../components/budget/MemberBudgetList';
import { CategoryBudgetTree } from '../components/budget/CategoryBudgetTree';
import { AllocationSummaryBar } from '../components/budget/AllocationSummaryBar';
import { CopyPreviousMonthDialog } from '../components/budget/CopyPreviousMonthDialog';
import { useMonthBudget } from '../hooks/useMonthBudget';
import { useSaveMonthBudget } from '../hooks/useSaveMonthBudget';
import { useCopyPreviousMonth } from '../hooks/useCopyPreviousMonth';
import { Toast, type ToastState } from '../components/Toast';
import { currentMonth, previousMonth } from '../utils/month';
import { fromResolved, toInput, type EditableLimit } from '../components/budget/limit-draft';
import type { UpsertMonthBudgetBody } from '../types/budget';

/** Live resolution of a draft to cents (mirror of the server resolver, half-up). */
function resolveDraftCents(limit: EditableLimit, baseCents: number): number {
  if (limit.type === 'ABSOLUTE') return limit.cents;
  return Math.round((limit.percent * baseCents) / 100);
}

export function BudgetsPage() {
  const [month, setMonth] = useState<string>(currentMonth());
  const { data, isLoading, setData } = useMonthBudget(month);

  const [familyCents, setFamilyCents] = useState(0);
  const [memberDrafts, setMemberDrafts] = useState<Record<string, EditableLimit>>({});
  const [categoryDrafts, setCategoryDrafts] = useState<Record<string, EditableLimit>>({});
  const [toast, setToast] = useState<ToastState | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);

  // Seed editable drafts whenever the loaded picture changes (month switch / save).
  useEffect(() => {
    if (!data) return;
    setFamilyCents(data.family?.amountCents ?? 0);
    setMemberDrafts(
      Object.fromEntries(data.members.map((m) => [m.memberId, fromResolved(m.budget)])),
    );
    setCategoryDrafts(
      Object.fromEntries(data.categories.map((c) => [c.categoryId, fromResolved(c.budget)])),
    );
  }, [data]);

  const allocatedCents = useMemo(() => {
    if (!data) return 0;
    return data.categories
      .filter((c) => c.parentId === null)
      .reduce((acc, root) => {
        const draft = categoryDrafts[root.categoryId];
        return acc + (draft ? resolveDraftCents(draft, familyCents) : 0);
      }, 0);
  }, [data, categoryDrafts, familyCents]);

  const save = useSaveMonthBudget({
    onSuccess: (result) => {
      setData(result);
      setToast({ kind: 'success', message: 'Orçamentos salvos.' });
    },
    onError: () => setToast({ kind: 'error', message: 'Não foi possível salvar os orçamentos.' }),
  });

  const copyHook = useCopyPreviousMonth();

  function buildBody(): UpsertMonthBudgetBody {
    return {
      family: familyCents > 0 ? { limitType: 'ABSOLUTE', amountCents: familyCents } : null,
      members: (data?.members ?? []).map((m) => ({
        memberId: m.memberId,
        budget: toInput(memberDrafts[m.memberId] ?? { type: 'ABSOLUTE', cents: 0, percent: 0 }),
      })),
      categories: (data?.categories ?? []).map((c) => ({
        categoryId: c.categoryId,
        budget: toInput(categoryDrafts[c.categoryId] ?? { type: 'ABSOLUTE', cents: 0, percent: 0 }),
      })),
    };
  }

  async function handleCopyConfirm() {
    const result = await copyHook.copy(previousMonth(month), month);
    setCopyOpen(false);
    if (result) {
      setData(result);
      setToast({
        kind: 'success',
        message:
          result.copiedCount > 0
            ? `${result.copiedCount} orçamento(s) copiado(s) do mês anterior.`
            : 'Nada a copiar do mês anterior.',
      });
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-fg">Orçamentos</h1>
        <div className="flex items-center gap-3">
          <MonthSelector month={month} onChange={setMonth} disabled={isLoading || save.isSaving} />
          <button
            type="button"
            onClick={() => setCopyOpen(true)}
            disabled={isLoading || save.isSaving}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-fg hover:bg-bg disabled:opacity-50"
          >
            <Copy size={16} aria-hidden /> Copiar mês anterior
          </button>
        </div>
      </header>

      {isLoading || !data ? (
        <p className="py-10 text-center text-fg-muted">Carregando orçamentos…</p>
      ) : (
        <>
          <FamilyBudgetSection
            cents={familyCents}
            onChange={setFamilyCents}
            disabled={save.isSaving}
          />

          <AllocationSummaryBar familyCents={familyCents} allocatedCents={allocatedCents} />

          <CategoryBudgetTree
            categories={data.categories}
            drafts={categoryDrafts}
            onChange={(id, next) => setCategoryDrafts((prev) => ({ ...prev, [id]: next }))}
            disabled={save.isSaving}
          />

          <MemberBudgetList
            members={data.members}
            drafts={memberDrafts}
            onChange={(id, next) => setMemberDrafts((prev) => ({ ...prev, [id]: next }))}
            disabled={save.isSaving}
          />

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void save.save(month, buildBody())}
              disabled={save.isSaving}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
            >
              {save.isSaving ? 'Salvando…' : 'Salvar orçamentos'}
            </button>
          </div>
        </>
      )}

      <CopyPreviousMonthDialog
        open={copyOpen}
        fromMonth={previousMonth(month)}
        toMonth={month}
        isCopying={copyHook.isCopying}
        onClose={() => setCopyOpen(false)}
        onConfirm={() => void handleCopyConfirm()}
      />

      <Toast value={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
