import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CopyPreviousMonthButton } from '../../../../src/components/bills/CopyPreviousMonthButton';

jest.mock('../../../../src/services/bill.service', () => ({
  billService: {
    copyDryRun: jest.fn(),
    copy: jest.fn(),
  },
}));

import { billService } from '../../../../src/services/bill.service';

const copyDryRunMock = billService.copyDryRun as jest.MockedFunction<typeof billService.copyDryRun>;
const copyMock = billService.copy as jest.MockedFunction<typeof billService.copy>;

const baseProps = {
  selectedMonth: '2026-06',
  onCopied: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(window, 'confirm').mockReturnValue(true);
  jest.spyOn(window, 'alert').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('CopyPreviousMonthButton', () => {
  it('renders with text "Copiar do mês anterior"', () => {
    render(<CopyPreviousMonthButton {...baseProps} />);
    expect(screen.getByRole('button', { name: /copiar do mês anterior/i })).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(<CopyPreviousMonthButton {...baseProps} disabled />);
    expect(screen.getByRole('button', { name: /copiar do mês anterior/i })).toBeDisabled();
  });

  it('shows alert and does not call copy when dryRun returns 0', async () => {
    copyDryRunMock.mockResolvedValue({ count: 0 });
    render(<CopyPreviousMonthButton {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: /copiar do mês anterior/i }));
    await waitFor(() =>
      expect(window.alert).toHaveBeenCalledWith('Nenhuma conta para copiar do mês anterior.'),
    );
    expect(copyMock).not.toHaveBeenCalled();
  });

  it('shows confirm dialog with count and calls copy when confirmed', async () => {
    copyDryRunMock.mockResolvedValue({ count: 3 });
    copyMock.mockResolvedValue({ count: 3 } as never);
    const onCopied = jest.fn();
    render(<CopyPreviousMonthButton {...baseProps} onCopied={onCopied} />);
    fireEvent.click(screen.getByRole('button', { name: /copiar do mês anterior/i }));
    await waitFor(() =>
      expect(window.confirm).toHaveBeenCalledWith('Copiar 3 conta(s) do mês anterior?'),
    );
    await waitFor(() => expect(onCopied).toHaveBeenCalledWith(3));
  });

  it('does not call copy when confirm dialog is cancelled', async () => {
    copyDryRunMock.mockResolvedValue({ count: 2 });
    (window.confirm as jest.Mock).mockReturnValue(false);
    const onCopied = jest.fn();
    render(<CopyPreviousMonthButton {...baseProps} onCopied={onCopied} />);
    fireEvent.click(screen.getByRole('button', { name: /copiar do mês anterior/i }));
    await waitFor(() => expect(window.confirm).toHaveBeenCalled());
    expect(copyMock).not.toHaveBeenCalled();
    expect(onCopied).not.toHaveBeenCalled();
  });
});
