import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
Object.assign(global, { TextEncoder, TextDecoder });

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginForm } from '../../../src/components/auth/LoginForm';

const mockLogin = jest.fn();
jest.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin }),
}));

describe('LoginForm', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows error when submitting with empty fields', async () => {
    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() =>
      expect(screen.getByText(/e-mail e senha são obrigatórios/i)).toBeInTheDocument(),
    );
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('calls login with email and password on valid submission', async () => {
    mockLogin.mockResolvedValue(undefined);
    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'ana@test.com' } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: 'Senha123' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('ana@test.com', 'Senha123'));
  });
});
