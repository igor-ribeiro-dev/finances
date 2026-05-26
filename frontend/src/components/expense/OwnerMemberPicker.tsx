import type { GroupMember } from '../../services/group.service';

interface OwnerMemberPickerProps {
  members: GroupMember[];
  value: string;
  onChange: (id: string) => void;
  id?: string;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
  disabled?: boolean;
}

export function OwnerMemberPicker({
  members,
  value,
  onChange,
  id,
  ariaInvalid,
  ariaDescribedBy,
  disabled,
}: OwnerMemberPickerProps) {
  const sorted = [...members].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedBy}
      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50"
    >
      <option value="" disabled>
        Selecione um membro
      </option>
      {sorted.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
    </select>
  );
}
