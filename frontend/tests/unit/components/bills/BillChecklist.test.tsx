import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { BillChecklist } from '../../../../src/components/bills/BillChecklist';
import type { Bill, ProjectedBill } from '../../../../src/types/bill';

// Mock billService so BillItem doesn't trigger real HTTP
jest.mock('../../../../src/services/bill.service', () => ({
  billService: {
    remove: jest.fn(),
    revertPayment: jest.fn(),
    reactivate: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
}));

const baseProps = {
  bills: [] as Bill[],
  projectedBills: [] as ProjectedBill[],
  isLoading: false,
  selectedMonth: '2026-06',
  onBillUpdated: jest.fn(),
  onBillDeleted: jest.fn(),
  onConcurrentError: jest.fn(),
  onReload: jest.fn().mockResolvedValue(undefined),
};

function makeBill(overrides: Partial<Bill> = {}): Bill {
  return {
    id: 'b-1',
    groupId: 'g-1',
    description: 'Aluguel',
    expectedAmountCents: 150000,
    dueDate: '2026-06-10',
    month: '2026-06',
    status: 'PENDING',
    isOverdue: false,
    categoryId: null,
    category: null,
    ownerMemberId: null,
    ownerMember: null,
    recurringBillId: null,
    payment: null,
    ...overrides,
  };
}

describe('BillChecklist', () => {
  it('shows loading indicator when isLoading=true', () => {
    render(<BillChecklist {...baseProps} isLoading={true} />);
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it('shows empty state when no bills', () => {
    render(<BillChecklist {...baseProps} />);
    expect(screen.getByText(/nenhuma conta registrada/i)).toBeInTheDocument();
  });

  it('renders bill descriptions', () => {
    const bills = [
      makeBill({ id: 'b-1', description: 'Aluguel' }),
      makeBill({ id: 'b-2', description: 'Internet' }),
    ];
    render(<BillChecklist {...baseProps} bills={bills} />);
    expect(screen.getByText('Aluguel')).toBeInTheDocument();
    expect(screen.getByText('Internet')).toBeInTheDocument();
  });

  it('shows overdue badge for overdue PENDING bills', () => {
    const bills = [makeBill({ isOverdue: true })];
    render(<BillChecklist {...baseProps} bills={bills} />);
    expect(screen.getByText('Vencida')).toBeInTheDocument();
  });

  it('renders projected bills with "Prevista" badge', () => {
    const projectedBills: ProjectedBill[] = [
      {
        recurringBillId: 'r-1',
        description: 'Streaming',
        expectedAmountCents: 5000,
        dueDate: '2026-08-15',
        categoryId: null,
        ownerMemberId: null,
      },
    ];
    render(<BillChecklist {...baseProps} projectedBills={projectedBills} />);
    expect(screen.getByText('Streaming')).toBeInTheDocument();
    expect(screen.getByText('Prevista')).toBeInTheDocument();
  });

  it('renders CANCELLED bills with strikethrough and badge', () => {
    const bills = [makeBill({ status: 'CANCELLED' })];
    render(<BillChecklist {...baseProps} bills={bills} />);
    expect(screen.getByText('Cancelada')).toBeInTheDocument();
  });

  it('renders PAID bills with Paga badge', () => {
    const bills = [
      makeBill({
        status: 'PAID',
        payment: {
          paidDate: '2026-06-05',
          actualAmountCents: 150000,
          paidByMemberId: 'm-1',
          paymentMethod: 'CASH_OR_DEBIT',
        },
      }),
    ];
    render(<BillChecklist {...baseProps} bills={bills} />);
    expect(screen.getByText('Paga')).toBeInTheDocument();
  });
});
