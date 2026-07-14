// src/features/scoring_rules_school/components/CreateScoringRuleDialog.tsx

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { CONDITION_TYPE_OPTIONS, ACTION_TYPE_OPTIONS, SEVERITY_OPTIONS, buildParamsValue } from '../constants';
import { ScoringRuleParamsFields } from './ScoringRuleParamsFields';
import type { CreateScoringRulePayload } from '../api/useCreateSchoolScoringRuleMutation';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateScoringRulePayload) => Promise<void>;
  isPending: boolean;
};

export function CreateScoringRuleDialog({ isOpen, onClose, onSubmit, isPending }: Props) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    priority: 1,
    severity: SEVERITY_OPTIONS[0].value,
    stopProcessing: false,
    isActive: true,
  });
  const [conditionType, setConditionType] = useState('');
  const [conditionValues, setConditionValues] = useState<Record<string, string>>({});
  const [actionType, setActionType] = useState('');
  const [actionValues, setActionValues] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const conditionOption = CONDITION_TYPE_OPTIONS.find((o) => o.value === conditionType);
    const actionOption = ACTION_TYPE_OPTIONS.find((o) => o.value === actionType);
    if (!conditionOption || !actionOption) {
      alert('Vui lòng chọn Loại điều kiện và Loại hành động!');
      return;
    }

    const payload: CreateScoringRulePayload = {
      code: formData.code,
      name: formData.name,
      description: formData.description || undefined,
      conditionType,
      conditionParams: buildParamsValue(conditionOption.fields, conditionValues),
      actionType,
      actionParams: buildParamsValue(actionOption.fields, actionValues),
      priority: Number(formData.priority),
      severity: formData.severity,
      stopProcessing: formData.stopProcessing,
      isActive: formData.isActive,
    };

    await onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={!isPending ? onClose : undefined} />

      <div className="relative w-full max-w-xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Thêm Scoring Rule Mới</h2>
          <button type="button" onClick={onClose} disabled={isPending} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-50">
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Mã Code</label>
              <input type="text" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} disabled={isPending} required className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Tên Rule</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} disabled={isPending} required className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50" />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-bold text-slate-700">Mô tả</label>
              <textarea rows={2} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} disabled={isPending} className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50" />
            </div>

            <ScoringRuleParamsFields
              title="Điều kiện (Condition)"
              options={CONDITION_TYPE_OPTIONS}
              typeValue={conditionType}
              rawValues={conditionValues}
              onTypeChange={(type) => { setConditionType(type); setConditionValues({}); }}
              onFieldChange={(name, value) => setConditionValues((prev) => ({ ...prev, [name]: value }))}
              disabled={isPending}
            />

            <ScoringRuleParamsFields
              title="Hành động (Action)"
              options={ACTION_TYPE_OPTIONS}
              typeValue={actionType}
              rawValues={actionValues}
              onTypeChange={(type) => { setActionType(type); setActionValues({}); }}
              onFieldChange={(name, value) => setActionValues((prev) => ({ ...prev, [name]: value }))}
              disabled={isPending}
            />

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Độ ưu tiên (Priority)</label>
              <input type="number" min="1" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value === '' ? 1 : parseInt(e.target.value) })} disabled={isPending} required className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Mức độ nghiêm trọng</label>
              <select value={formData.severity} onChange={(e) => setFormData({ ...formData, severity: e.target.value })} disabled={isPending} className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50">
                {SEVERITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="stopProcessing" checked={formData.stopProcessing} onChange={(e) => setFormData({ ...formData, stopProcessing: e.target.checked })} disabled={isPending} className="size-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500" />
              <label htmlFor="stopProcessing" className="text-sm font-bold text-slate-700">Dừng thi</label>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="isActive" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} disabled={isPending} className="size-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500" />
              <label htmlFor="isActive" className="text-sm font-bold text-slate-700">Kích hoạt ngay</label>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
            <button type="button" onClick={onClose} disabled={isPending} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50">
              Hủy bỏ
            </button>
            <button type="submit" disabled={isPending} className="inline-flex min-w-[120px] items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-cyan-700 disabled:opacity-50">
              {isPending ? <Loader2 className="size-4 animate-spin" /> : 'Lưu Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
