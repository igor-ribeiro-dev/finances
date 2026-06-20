import { useState } from 'react';
import { Plus, ShoppingCart } from 'lucide-react';
import { MonthSelector } from '../components/budget/MonthSelector';
import { BillChecklist } from '../components/bills/BillChecklist';
import { BillFormModal } from '../components/bills/BillFormModal';
import { PayBillModal } from '../components/bills/PayBillModal';
import { CopyPreviousMonthButton } from '../components/bills/CopyPreviousMonthButton';
import { MonthBillsSummary } from '../components/bills/MonthBillsSummary';
import { QuickLogModal } from '../components/bills/QuickLogModal';
import { CreditCardSummarySection } from '../components/credit-cards/CreditCardSummarySection';
import { Toast, type ToastState } from '../components/Toast';
import { useMonthBills } from '../hooks/useMonthBills';
import { billService } from '../services/bill.service';
import { currentMonth } from '../utils/month';
import type { Bill, ProjectedBill } from '../types/bill';

export function PaymentsPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth());
  const [formOpen, setFormOpen] = useState(false);
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [payingProjectedId, setPayingProjectedId] = useState<string | null>(null);
  const [payBillTarget, setPayBillTarget] = useState<Bill | null>(null);

  const { data, isLoading, error, reload } = useMonthBills(selectedMonth);

  function handleMonthChange(month: string) {
    setSelectedMonth(month);
  }

  function handleBackToCurrentMonth() {
    setSelectedMonth(currentMonth());
  }

  function handleBillCreated() {
    setFormOpen(false);
    setToast({ kind: 'success', message: 'Conta registrada.' });
    void reload();
  }

  function handleSpendingLogged() {
    setQuickLogOpen(false);
    setToast({ kind: 'success', message: 'Gasto registrado.' });
    void reload();
  }

  function handleBillUpdated() {
    setToast({ kind: 'success', message: 'Conta atualizada.' });
    void reload();
  }

  function handleBillDeleted() {
    setToast({ kind: 'success', message: 'Conta excluída.' });
    void reload();
  }

  function handleCopied(count: number) {
    setToast({
      kind: 'success',
      message:
        count > 0
          ? `${count} conta(s) copiada(s) do mês anterior.`
          : 'Nenhuma conta para copiar do mês anterior.',
    });
    void reload();
  }

  async function handlePayProjected(projected: ProjectedBill) {
    setPayingProjectedId(projected.recurringBillId);
    try {
      const { bill } = await billService.create({
        description: projected.description,
        expectedAmountCents: projected.expectedAmountCents,
        dueDate: projected.dueDate,
        categoryId: projected.categoryId,
        ownerMemberId: projected.ownerMemberId,
        recurringBillId: projected.recurringBillId,
      });
      // Reload immediately so the projected bill disappears from the list
      // (the persisted instance now exists) before the payment modal opens.
      await reload();
      setPayBillTarget(bill);
    } catch {
      setToast({ kind: 'error', message: 'Erro ao criar a conta. Tente novamente.' });
    } finally {
      setPayingProjectedId(null);
    }
  }

  function handleConcurrentError() {
    setToast({
      kind: 'error',
      message: 'A conta foi alterada por outro membro. A lista foi atualizada.',
    });
    void reload();
  }

  const isCurrentMonth = selectedMonth === currentMonth();

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-fg">Pagamentos</h1>
        <div className="flex flex-wrap items-center gap-3">
          <MonthSelector month={selectedMonth} onChange={handleMonthChange} disabled={isLoading} />
          {!isCurrentMonth && (
            <button
              type="button"
              onClick={handleBackToCurrentMonth}
              className="text-sm font-medium text-primary hover:underline"
            >
              Voltar ao mês atual
            </button>
          )}
          <CopyPreviousMonthButton
            selectedMonth={selectedMonth}
            onCopied={handleCopied}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setQuickLogOpen(true)}
            disabled={isLoading}
            aria-label="Registrar gasto"
            className="inline-flex items-center gap-2 rounded-lg border border-teal-600 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
          >
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            Registrar gasto
          </button>
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nova conta
          </button>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          Erro ao carregar contas: {error.message}
        </div>
      )}

      {data && (
        <MonthBillsSummary summary={data.summary} projectedCents={data.summary.projectedCents} />
      )}

      <CreditCardSummarySection />

      <BillChecklist
        bills={data?.bills ?? []}
        projectedBills={data?.projectedBills ?? []}
        isLoading={isLoading}
        selectedMonth={selectedMonth}
        onBillUpdated={handleBillUpdated}
        onBillDeleted={handleBillDeleted}
        onConcurrentError={handleConcurrentError}
        onReload={reload}
        onPayProjected={handlePayProjected}
        payingProjectedId={payingProjectedId}
      />

      <BillFormModal
        open={formOpen}
        mode="create"
        selectedMonth={selectedMonth}
        onClose={() => setFormOpen(false)}
        onSuccess={handleBillCreated}
      />

      <QuickLogModal
        open={quickLogOpen}
        onClose={() => setQuickLogOpen(false)}
        onSuccess={handleSpendingLogged}
      />

      {payBillTarget && (
        <PayBillModal
          open={true}
          bill={payBillTarget}
          mode="pay"
          onClose={() => setPayBillTarget(null)}
          onSuccess={() => {
            setPayBillTarget(null);
            setToast({ kind: 'success', message: 'Conta paga.' });
            void reload();
          }}
        />
      )}

      <Toast value={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
