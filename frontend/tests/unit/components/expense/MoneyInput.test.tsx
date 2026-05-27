import '@testing-library/jest-dom';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MoneyInput } from '../../../../src/components/expense/MoneyInput';

function Harness({ initial = 0 }: { initial?: number }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <MoneyInput value={value} onChange={setValue} ariaLabel="amount" />
      <span data-testid="cents">{value}</span>
    </>
  );
}

function input(): HTMLInputElement {
  return screen.getByLabelText('amount') as HTMLInputElement;
}

describe('MoneyInput', () => {
  it('formats zero as "R$ 0,00"', () => {
    render(<Harness />);
    expect(input().value).toMatch(/R\$\s*0,00/);
  });

  it('builds value by pushing digits from the right (Nubank-style)', () => {
    render(<Harness />);
    fireEvent.keyDown(input(), { key: '1' });
    fireEvent.keyDown(input(), { key: '2' });
    fireEvent.keyDown(input(), { key: '3' });
    fireEvent.keyDown(input(), { key: '4' });
    fireEvent.keyDown(input(), { key: '5' });
    expect(screen.getByTestId('cents').textContent).toBe('12345');
    expect(input().value).toMatch(/R\$\s*123,45/);
  });

  it('removes last digit on Backspace', () => {
    render(<Harness initial={12345} />);
    fireEvent.keyDown(input(), { key: 'Backspace' });
    expect(screen.getByTestId('cents').textContent).toBe('1234');
  });

  it('clears to zero on Escape', () => {
    render(<Harness initial={12345} />);
    fireEvent.keyDown(input(), { key: 'Escape' });
    expect(screen.getByTestId('cents').textContent).toBe('0');
  });

  it('clears to zero on Delete', () => {
    render(<Harness initial={9999} />);
    fireEvent.keyDown(input(), { key: 'Delete' });
    expect(screen.getByTestId('cents').textContent).toBe('0');
  });

  it('ignores commas, dots, and letters', () => {
    render(<Harness initial={500} />);
    fireEvent.keyDown(input(), { key: ',' });
    fireEvent.keyDown(input(), { key: '.' });
    fireEvent.keyDown(input(), { key: 'a' });
    expect(screen.getByTestId('cents').textContent).toBe('500');
  });

  it('caps value at the schema maximum (2_000_000_000)', () => {
    render(<Harness initial={2_000_000_000} />);
    fireEvent.keyDown(input(), { key: '1' });
    // would overflow the max → ignored
    expect(screen.getByTestId('cents').textContent).toBe('2000000000');
  });

  it('renders with aria-invalid when flagged', () => {
    render(<MoneyInput value={0} onChange={() => undefined} ariaLabel="amt" ariaInvalid />);
    expect(screen.getByLabelText('amt')).toHaveAttribute('aria-invalid', 'true');
  });
});
