import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExpenseFormModal } from '../../../../src/components/expense/ExpenseFormModal';

const members = [
  { id: 'm-1', name: 'Ana' },
  { id: 'm-2', name: 'Bruno' },
];

function defaultProps(overrides: Partial<React.ComponentProps<typeof ExpenseFormModal>> = {}) {
  return {
    open: true,
    mode: 'create' as const,
    members,
    isSaving: false,
    onClose: jest.fn(),
    onSubmit: jest.fn(),
    ...overrides,
  };
}

describe('ExpenseFormModal (create mode)', () => {
  it('does not render when open=false', () => {
    render(<ExpenseFormModal {...defaultProps({ open: false })} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders dialog with title "Nova despesa"', () => {
    render(<ExpenseFormModal {...defaultProps()} />);
    expect(screen.getByRole('dialog', { name: 'Nova despesa' })).toBeInTheDocument();
  });

  it('focuses the value input on open via autoFocus', () => {
    render(<ExpenseFormModal {...defaultProps()} />);
    expect(document.activeElement).toBe(screen.getByLabelText('Valor'));
  });

  it('renders field-level errors from fieldErrors prop', () => {
    render(
      <ExpenseFormModal
        {...defaultProps({
          fieldErrors: [
            { field: 'amountCents', code: 'too_small', message: 'Valor zero' },
            { field: 'description', code: 'too_short', message: 'Descrição vazia' },
          ],
        })}
      />,
    );
    expect(screen.getByText('Valor zero')).toBeInTheDocument();
    expect(screen.getByText('Descrição vazia')).toBeInTheDocument();
  });

  it('submits the form with full body when valid', async () => {
    const onSubmit = jest.fn();
    render(<ExpenseFormModal {...defaultProps({ onSubmit })} />);

    // Type 12345 cents
    fireEvent.keyDown(screen.getByLabelText('Valor'), { key: '1' });
    fireEvent.keyDown(screen.getByLabelText('Valor'), { key: '2' });
    fireEvent.keyDown(screen.getByLabelText('Valor'), { key: '3' });
    fireEvent.keyDown(screen.getByLabelText('Valor'), { key: '4' });
    fireEvent.keyDown(screen.getByLabelText('Valor'), { key: '5' });

    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Mercado' } });

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const arg = onSubmit.mock.calls[0]![0];
    expect(arg.amountCents).toBe(12345);
    expect(arg.description).toBe('Mercado');
    expect(arg.paymentMethod).toBe('CASH_OR_DEBIT');
    expect(arg.ownerMemberId).toBe('m-1');
  });

  it('blocks submit when local validation fails (zero value)', () => {
    const onSubmit = jest.fn();
    render(<ExpenseFormModal {...defaultProps({ onSubmit })} />);
    // Description is empty, value is zero → submit
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/valor maior que zero/i);
  });

  it('opens high-value confirmation modal when amountCents > 100M', async () => {
    const onSubmit = jest.fn();
    render(<ExpenseFormModal {...defaultProps({ onSubmit })} />);
    // 10 digits of 1 → 1_111_111_111 cents ≈ R$ 11M (above threshold)
    for (let i = 0; i < 10; i++) {
      fireEvent.keyDown(screen.getByLabelText('Valor'), { key: '1' });
    }
    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Carro' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(screen.getByText(/valor acima de R\$\s*1\.000\.000,00/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });

  it('closes on ESC when not saving and no overlay is open', () => {
    const onClose = jest.fn();
    render(<ExpenseFormModal {...defaultProps({ onClose })} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('disables Salvar while isSaving', () => {
    render(<ExpenseFormModal {...defaultProps({ isSaving: true })} />);
    expect(screen.getByRole('button', { name: 'Salvando…' })).toBeDisabled();
  });
});

describe('ExpenseFormModal concurrency notice', () => {
  it('replaces the form with a "não encontrada" message when concurrencyError is true', () => {
    const onClose = jest.fn();
    render(
      <ExpenseFormModal {...defaultProps({ mode: 'edit', concurrencyError: true, onClose })} />,
    );
    expect(screen.getByText(/Despesa não encontrada/i)).toBeInTheDocument();
    expect(screen.getByText(/excluída por outro membro/i)).toBeInTheDocument();
    // No form fields
    expect(screen.queryByLabelText('Valor')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('ExpenseFormModal category pickers (US2)', () => {
  const root = {
    id: 'r1',
    groupId: 'g',
    name: 'Alimentação',
    parentId: null,
    createdAt: '',
    updatedAt: '',
  };
  const root2 = {
    id: 'r2',
    groupId: 'g',
    name: 'Transporte',
    parentId: null,
    createdAt: '',
    updatedAt: '',
  };
  const sub = {
    id: 's1',
    groupId: 'g',
    name: 'Mercado',
    parentId: 'r1',
    createdAt: '',
    updatedAt: '',
  };
  const subsByRoot = new Map([['r1', [sub]]]);

  function fillRequired(): void {
    // MoneyInput accumulates digits via keyDown (1000 cents = R$ 10,00).
    for (const key of ['1', '0', '0', '0']) {
      fireEvent.keyDown(screen.getByLabelText('Valor'), { key });
    }
    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Compra' } });
  }

  it('renders both pickers, with the sub picker disabled until a root is chosen', () => {
    render(<ExpenseFormModal {...defaultProps({ roots: [root], subsByRoot })} />);
    expect(screen.getByLabelText('Categoria')).toBeInTheDocument();
    expect(screen.getByLabelText('Sub-categoria')).toBeDisabled();
  });

  it('enables the sub picker after selecting a root and resets sub when the root changes', () => {
    render(<ExpenseFormModal {...defaultProps({ roots: [root, root2], subsByRoot })} />);
    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'r1' } });
    const subPicker = screen.getByLabelText('Sub-categoria') as HTMLSelectElement;
    expect(subPicker).not.toBeDisabled();
    expect(screen.getByRole('option', { name: 'Mercado' })).toBeInTheDocument();

    fireEvent.change(subPicker, { target: { value: 's1' } });
    expect(subPicker.value).toBe('s1');
    // Switching root clears the sub selection
    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'r2' } });
    expect((screen.getByLabelText('Sub-categoria') as HTMLSelectElement).value).toBe('');
  });

  it('maps nothing-selected to categoryId null', async () => {
    const onSubmit = jest.fn();
    render(<ExpenseFormModal {...defaultProps({ roots: [root], subsByRoot, onSubmit })} />);
    fillRequired();
    fireEvent.submit(screen.getByLabelText('Valor').closest('form')!);
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]![0].categoryId).toBeNull();
  });

  it('maps root-only to the root id', async () => {
    const onSubmit = jest.fn();
    render(<ExpenseFormModal {...defaultProps({ roots: [root], subsByRoot, onSubmit })} />);
    fillRequired();
    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'r1' } });
    fireEvent.submit(screen.getByLabelText('Valor').closest('form')!);
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]![0].categoryId).toBe('r1');
  });

  it('maps root+sub to the SUB id (single-column design)', async () => {
    const onSubmit = jest.fn();
    render(<ExpenseFormModal {...defaultProps({ roots: [root], subsByRoot, onSubmit })} />);
    fillRequired();
    fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'r1' } });
    fireEvent.change(screen.getByLabelText('Sub-categoria'), { target: { value: 's1' } });
    fireEvent.submit(screen.getByLabelText('Valor').closest('form')!);
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]![0].categoryId).toBe('s1');
  });

  it('shows the FR-025 hint (link to /categorias) when there are no roots, and no inline create trigger (FR-023)', () => {
    render(<ExpenseFormModal {...defaultProps({ roots: [], subsByRoot: new Map() })} />);
    const link = screen.getByRole('link', { name: /categorias/i });
    expect(link).toHaveAttribute('href', '/categorias');
    expect(screen.getByLabelText('Sub-categoria')).toBeDisabled();
    // Negative-space: no category-creation affordance inside the expense modal
    expect(screen.queryByRole('button', { name: /nova categoria/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^\+ ?nova categoria$/i })).not.toBeInTheDocument();
  });
});
