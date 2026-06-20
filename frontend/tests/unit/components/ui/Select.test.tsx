import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Select } from '@/components/ui/Select';

const options = [
  { value: 'alimentacao', label: 'Alimentação' },
  { value: 'transporte', label: 'Transporte' },
];

describe('Select', () => {
  it('renders options', () => {
    render(<Select options={options} value="" onChange={() => {}} aria-label="Categoria" />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('Alimentação')).toBeInTheDocument();
  });

  it('calls onChange when option selected', () => {
    const onChange = jest.fn();
    render(<Select options={options} value="" onChange={onChange} aria-label="Categoria" />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'transporte' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('shows current value', () => {
    render(
      <Select options={options} value="alimentacao" onChange={() => {}} aria-label="Categoria" />,
    );
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('alimentacao');
  });

  it('is disabled when disabled prop passed', () => {
    render(
      <Select options={options} value="" onChange={() => {}} aria-label="Categoria" disabled />,
    );
    expect(screen.getByRole('combobox')).toBeDisabled();
  });
});
