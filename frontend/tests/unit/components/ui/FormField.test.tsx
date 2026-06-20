import React from 'react';
import { render, screen } from '@testing-library/react';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';

describe('FormField', () => {
  it('renders label and children', () => {
    render(
      <FormField label="Nome" htmlFor="name">
        <Input id="name" />
      </FormField>,
    );
    expect(screen.getByText('Nome')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders error message when provided', () => {
    render(
      <FormField label="Email" htmlFor="email" error="Email inválido">
        <Input id="email" />
      </FormField>,
    );
    expect(screen.getByText('Email inválido')).toBeInTheDocument();
  });

  it('connects label to input via htmlFor/id', () => {
    render(
      <FormField label="Senha" htmlFor="pwd">
        <Input id="pwd" />
      </FormField>,
    );
    const label = screen.getByText('Senha');
    expect(label.tagName).toBe('LABEL');
    expect((label as HTMLLabelElement).htmlFor).toBe('pwd');
  });

  it('adds aria-describedby when error present', () => {
    render(
      <FormField label="CPF" htmlFor="cpf" error="CPF inválido">
        <Input id="cpf" aria-describedby="cpf-error" />
      </FormField>,
    );
    expect(screen.getByText('CPF inválido')).toBeInTheDocument();
  });
});
