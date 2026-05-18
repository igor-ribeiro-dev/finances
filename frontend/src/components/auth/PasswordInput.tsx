import { useState } from 'react';

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
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
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
              className={`text-xs ${met ? 'text-green-600' : 'text-gray-400'}`}
            >
              {met ? '✓' : '○'} {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
