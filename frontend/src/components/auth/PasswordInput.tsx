import { useState } from 'react';
import { Input } from '@/components/ui';

interface Props {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  id?: string;
}

interface Rule {
  key: string;
  label: string;
  test: (v: string) => boolean;
}

const rules: Rule[] = [
  { key: 'length', label: '8 caracteres mínimo', test: (v) => v.length >= 8 },
  { key: 'digit', label: '1 número', test: (v) => /\d/.test(v) },
  { key: 'upper', label: '1 letra maiúscula', test: (v) => /[A-Z]/.test(v) },
];

export function PasswordInput({ value, onChange, label = 'Senha', id = 'password' }: Props) {
  const [show, setShow] = useState(false);

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-fg">
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-16"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg text-xs transition-colors"
        >
          {show ? 'ocultar' : 'mostrar'}
        </button>
      </div>
      <ul className="space-y-0.5">
        {rules.map((rule) => {
          const met = rule.test(value);
          return (
            <li
              key={rule.key}
              data-testid={`rule-${rule.key}`}
              className={`text-xs ${met ? 'text-success' : 'text-fg-muted'}`}
            >
              {met ? '✓' : '○'} {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
