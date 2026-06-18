import { useRecurringBills } from '../hooks/useRecurringBills';
import { RecurringBillsSection } from '../components/bills/RecurringBillsSection';

export function RecurringBillsPage() {
  const { reload } = useRecurringBills();

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Contas Fixas</h1>
      </header>
      <RecurringBillsSection onReload={reload} />
    </div>
  );
}
