import type { Category } from '../../types/category';

const NONE = ''; // <option> value for "no sub-category" (maps to null)

export interface SubCategoryPickerProps {
  rootId: string | null;
  /** Sub-categories of the selected root. */
  subs: Category[];
  value: string | null;
  onChange: (value: string | null) => void;
  id?: string;
  disabled?: boolean;
}

export function SubCategoryPicker({
  rootId,
  subs,
  value,
  onChange,
  id,
  disabled,
}: SubCategoryPickerProps) {
  // Disabled until a root is chosen (a sub cannot exist without a root).
  const isDisabled = disabled || rootId === null;
  const sorted = [...subs].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  return (
    <select
      id={id}
      value={value ?? NONE}
      disabled={isDisabled}
      onChange={(e) => onChange(e.target.value === NONE ? null : e.target.value)}
      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50 disabled:text-gray-400"
    >
      <option value={NONE}>(sem categoria)</option>
      {!isDisabled &&
        sorted.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
    </select>
  );
}
