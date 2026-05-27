import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { OwnerMemberPicker } from '../../../../src/components/expense/OwnerMemberPicker';

const members = [
  { id: 'm-2', name: 'Bruno' },
  { id: 'm-1', name: 'Ana' },
  { id: 'm-3', name: 'Carla' },
];

describe('OwnerMemberPicker', () => {
  it('sorts options alphabetically using pt-BR collation', () => {
    render(<OwnerMemberPicker id="owner" members={members} value="" onChange={() => undefined} />);
    const options = screen.getAllByRole('option');
    // The first is the disabled placeholder
    expect(options[1]).toHaveTextContent('Ana');
    expect(options[2]).toHaveTextContent('Bruno');
    expect(options[3]).toHaveTextContent('Carla');
  });

  it('calls onChange with the selected member id', () => {
    const onChange = jest.fn();
    render(<OwnerMemberPicker id="owner" members={members} value="m-1" onChange={onChange} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'm-2' } });
    expect(onChange).toHaveBeenCalledWith('m-2');
  });

  it('disables interaction when disabled', () => {
    render(
      <OwnerMemberPicker
        id="owner"
        members={members}
        value="m-1"
        onChange={() => undefined}
        disabled
      />,
    );
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('reflects aria-invalid', () => {
    render(
      <OwnerMemberPicker
        id="owner"
        members={members}
        value=""
        onChange={() => undefined}
        ariaInvalid
      />,
    );
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');
  });
});
