// T022 (US2) — BillItem shows paidByMember.name for PAID bills.
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
Object.assign(global, { TextEncoder, TextDecoder });

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BillItem } from '../../../src/components/bills/BillItem';
import type { Bill } from '../../../src/types/bill';

jest.mock('../../../src/services/bill.service', () => ({
  billService: {
    remove: jest.fn(),
    revertPayment: jest.fn(),
    reactivate: jest.fn(),
  },
}));

function makeBill(overrides: Partial<Bill> = {}): Bill {
  return {
    id: 'bill-1',
    groupId: 'group-1',
    description: 'Energia',
    expectedAmountCents: 20000,
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

const noop = () => {};

describe('BillItem — paidByMember display (T022)', () => {
  it('shows paidByMember.name in the payment row for a PAID bill', () => {
    const bill = makeBill({
      status: 'PAID',
      payment: {
        paidDate: '2026-06-08',
        actualAmountCents: 19500,
        paidByMemberId: 'user-ana',
        paymentMethod: 'CASH_OR_DEBIT',
        paidByMember: { id: 'user-ana', name: 'Ana' },
      },
    });

    render(
      <BillItem
        bill={bill}
        selectedMonth="2026-06"
        onUpdated={noop}
        onDeleted={noop}
        onConcurrentError={noop}
      />,
    );

    expect(screen.getByText('Ana')).toBeInTheDocument();
  });

  it('shows nothing for paidByMember when payment is null (PENDING bill)', () => {
    const bill = makeBill({ status: 'PENDING', payment: null });

    render(
      <BillItem
        bill={bill}
        selectedMonth="2026-06"
        onUpdated={noop}
        onDeleted={noop}
        onConcurrentError={noop}
      />,
    );

    expect(screen.queryByText('Ana')).not.toBeInTheDocument();
  });

  it('handles paidByMember=null gracefully (legacy PAID bill with no member data)', () => {
    const bill = makeBill({
      status: 'PAID',
      payment: {
        paidDate: '2026-06-08',
        actualAmountCents: 20000,
        paidByMemberId: 'user-ana',
        paymentMethod: 'CASH_OR_DEBIT',
        paidByMember: null,
      },
    });

    const { container } = render(
      <BillItem
        bill={bill}
        selectedMonth="2026-06"
        onUpdated={noop}
        onDeleted={noop}
        onConcurrentError={noop}
      />,
    );

    expect(container).toBeInTheDocument();
  });
});
