// src/features/assessment_policy_system/components/UpdateAssessmentPolicyDialog.tsx

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useFrameworkVersionBandsQuery } from '../api/useFrameworkVersionOptionsQuery';
import type { AssessmentPolicy, AssessmentPolicyStrictness, UpdateAssessmentPolicyPayload } from '../types';

// Chỉ cần các field sẽ sửa được, để dialog dùng chung được cho cả AssessmentPolicy (list)
// lẫn AssessmentPolicyDetail (trang chi tiết) mà không quan tâm shape của các quan hệ nested.
export type EditableAssessmentPolicy = Pick<
  AssessmentPolicy,
  'id' | 'frameworkVersionId' | 'targetFrameworkBandId' | 'passingScore' | 'strictness' | 'effectiveFrom' | 'effectiveTo'
>;

type UpdateAssessmentPolicyDialogProps = {
  policy: EditableAssessmentPolicy | null;
  onClose: () => void;
  onSubmit: (data: UpdateAssessmentPolicyPayload) => Promise<void>;
  isPending: boolean;
};

const STRICTNESS_OPTIONS: { value: AssessmentPolicyStrictness; label: string }[] = [
  { value: 'LENIENT', label: 'Lỏng (LENIENT)' },
  { value: 'STANDARD', label: 'Chuẩn (STANDARD)' },
  { value: 'STRICT', label: 'Chặt (STRICT)' },
];

function toDateInputValue(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export function UpdateAssessmentPolicyDialog({ policy, onClose, onSubmit, isPending }: UpdateAssessmentPolicyDialogProps) {
  const { data: resultBands } = useFrameworkVersionBandsQuery(policy?.frameworkVersionId);

  const [form, setForm] = useState(() => ({
    targetFrameworkBandId: policy?.targetFrameworkBandId ?? '',
    passingScore: policy?.passingScore != null ? String(policy.passingScore) : '',
    strictness: (policy?.strictness ?? '') as AssessmentPolicyStrictness | '',
    effectiveFrom: toDateInputValue(policy?.effectiveFrom),
    effectiveTo: toDateInputValue(policy?.effectiveTo),
  }));

  const [initializedPolicyId, setInitializedPolicyId] = useState(policy?.id);
  if (policy && policy.id !== initializedPolicyId) {
    setInitializedPolicyId(policy.id);
    setForm({
      targetFrameworkBandId: policy.targetFrameworkBandId,
      passingScore: policy.passingScore != null ? String(policy.passingScore) : '',
      strictness: policy.strictness,
      effectiveFrom: toDateInputValue(policy.effectiveFrom),
      effectiveTo: toDateInputValue(policy.effectiveTo),
    });
  }

  if (!policy) return null;

  const isMissingRequired = !form.targetFrameworkBandId || !form.effectiveFrom;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isMissingRequired) {
      alert('Vui lòng nhập đầy đủ các trường bắt buộc!');
      return;
    }

    if (form.effectiveTo && new Date(form.effectiveFrom) > new Date(form.effectiveTo)) {
      alert('Ngày kết thúc không được nhỏ hơn Ngày áp dụng!');
      return;
    }

    const payload: UpdateAssessmentPolicyPayload = {
      targetFrameworkBandId: form.targetFrameworkBandId,
      effectiveFrom: form.effectiveFrom,
      effectiveTo: form.effectiveTo || undefined,
      passingScore: form.passingScore ? Number(form.passingScore) : undefined,
      strictness: form.strictness || undefined,
    };

    await onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm transition-opacity" onClick={!isPending ? onClose : undefined} />

      <div className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Chỉnh sửa Chính Sách Đánh Giá</h2>
          <button type="button" onClick={onClose} disabled={isPending} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-50">
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid gap-5">
            <p className="text-xs font-medium text-slate-500">
              Ngôn ngữ, Framework Version và Rubric Version không thể thay đổi sau khi tạo.
            </p>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Target Band <span className="text-red-500">*</span></label>
              <select
                value={form.targetFrameworkBandId} onChange={(e) => setForm({ ...form, targetFrameworkBandId: e.target.value })}
                disabled={isPending}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50"
              >
                <option value="">-- Chọn target band --</option>
                {resultBands?.map((band) => <option key={band.id} value={band.id}>{band.code} - {band.label}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">Điểm đạt (passingScore)</label>
                <input
                  type="number" step="0.1" min="0" value={form.passingScore}
                  onChange={(e) => setForm({ ...form, passingScore: e.target.value })} disabled={isPending}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">Độ nghiêm ngặt</label>
                <select
                  value={form.strictness} onChange={(e) => setForm({ ...form, strictness: e.target.value as AssessmentPolicyStrictness })}
                  disabled={isPending}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50"
                >
                  <option value="">-- Mặc định --</option>
                  {STRICTNESS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">Áp dụng từ ngày <span className="text-red-500">*</span></label>
                <input
                  type="date" value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
                  disabled={isPending}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">Đến ngày (tùy chọn)</label>
                <input
                  type="date" value={form.effectiveTo} onChange={(e) => setForm({ ...form, effectiveTo: e.target.value })}
                  disabled={isPending}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
            <button type="button" onClick={onClose} disabled={isPending} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50">Hủy bỏ</button>
            <button type="submit" disabled={isPending} className="inline-flex min-w-30 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-cyan-700 disabled:opacity-50">
              {isPending ? <Loader2 className="size-4 animate-spin" /> : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
