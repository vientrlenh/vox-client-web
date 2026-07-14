// src/features/scoring_rules_system/components/ScoringRuleParamsFields.tsx

import type { ScoringRuleTypeOption } from '../constants';

type Props = {
  title: string;
  options: ScoringRuleTypeOption[];
  typeValue: string;
  rawValues: Record<string, string>;
  onTypeChange: (type: string) => void;
  onFieldChange: (name: string, value: string) => void;
  disabled?: boolean;
};

export function ScoringRuleParamsFields({ title, options, typeValue, rawValues, onTypeChange, onFieldChange, disabled }: Props) {
  const selected = options.find((option) => option.value === typeValue);

  return (
    <div className="sm:col-span-2 rounded-lg border border-slate-200 p-4">
      <p className="mb-3 text-sm font-bold text-slate-700">{title}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-bold text-slate-500">Loại</label>
          <select
            value={typeValue}
            onChange={(e) => onTypeChange(e.target.value)}
            disabled={disabled}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50"
          >
            <option value="" disabled>-- Chọn loại --</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        {selected?.fields.map((field) => (
          <div key={field.name}>
            <label className="mb-1 block text-xs font-bold text-slate-500">{field.label}</label>
            <input
              type={field.type === 'text' ? 'text' : 'number'}
              step={field.type === 'decimal' ? '0.01' : undefined}
              value={rawValues[field.name] ?? ''}
              onChange={(e) => onFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              disabled={disabled}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
