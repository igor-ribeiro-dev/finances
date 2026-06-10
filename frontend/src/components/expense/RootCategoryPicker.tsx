import type { Category } from '../../types/category';

const NONE = ''; // <option> value for "no category" (maps to null)

export interface RootCategoryPickerProps {
  value: string | null;
  roots: Category[];
  onChange: (value: string | null) => void;
  id?: string;
  disabled?: boolean;
}

export function RootCategoryPicker({
  value,
  roots,
  onChange,
  id,
  disabled,
}: RootCategoryPickerProps) {
  const sorted = [...roots].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  return (
    <select
      id={id}
      value={value ?? NONE}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value === NONE ? null : e.target.value)}
      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50"
    >
      <option value={NONE}>(sem categoria)</option>
      {sorted.map((r) => (
        <option key={r.id} value={r.id}>
          {r.name}
        </option>
      ))}
    </select>
  );
}
