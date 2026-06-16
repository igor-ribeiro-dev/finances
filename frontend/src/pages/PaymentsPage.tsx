import { useState } from 'react';
import { Plus, ShoppingCart } from 'lucide-react';
import { MonthSelector } from '../components/budget/MonthSelector';
import { BillChecklist } from '../components/bills/BillChecklist';
import { BillFormModal } from '../components/bills/BillFormModal';
import { CopyPreviousMonthButton } from '../components/bills/CopyPreviousMonthButton';
import { MonthBillsSummary } from '../components/bills/MonthBillsSummary';
import { QuickLogModal } from '../components/bills/QuickLogModal';
import { RecurringBillsSection } from '../components/bills/RecurringBillsSection';
import { Toast, type ToastState } from '../components/Toast';
import { useMonthBills } from '../hooks/useMonthBills';
import { currentMonth } from '../utils/month';

export function PaymentsPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth());
  const [formOpen, setFormOpen] = useState(false);
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

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
        <h1 className="text-2xl font-bold text-gray-900">Pagamentos</h1>
        <div className="flex flex-wrap items-center gap-3">
          <MonthSelector month={selectedMonth} onChange={handleMonthChange} disabled={isLoading} />
          {!isCurrentMonth && (
            <button
              type="button"
              onClick={handleBackToCurrentMonth}
              className="text-sm font-medium text-teal-600 hover:underline"
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
            className="inline-flex items-center gap-2 rounded-lg border border-teal-600 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50"
          >
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            Registrar gasto
          </button>
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nova conta
          </button>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          Erro ao carregar contas: {error.message}
        </div>
      )}

      {data && (
        <MonthBillsSummary summary={data.summary} projectedCents={data.summary.projectedCents} />
      )}

      <BillChecklist
        bills={data?.bills ?? []}
        projectedBills={data?.projectedBills ?? []}
        isLoading={isLoading}
        selectedMonth={selectedMonth}
        onBillUpdated={handleBillUpdated}
        onBillDeleted={handleBillDeleted}
        onConcurrentError={handleConcurrentError}
        onReload={reload}
      />

      <RecurringBillsSection onReload={reload} />

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

      <Toast value={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
