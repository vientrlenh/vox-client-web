// src/features/assessment_policy_school/components/UpdateAssessmentPolicyDialog.tsx

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useFeedbackToast } from '@/shared/ui/useFeedbackToast';
import { useGradeLevelBandCeilingQuery } from '../api/useGradeLevelBandCeilingQuery';
import type { AssessmentPolicy, AssessmentPolicyStrictness, UpdateAssessmentPolicyPayload } from '../types';

// Chỉ cần các field sẽ sửa được, để dialog dùng chung được cho cả AssessmentPolicy (list)
// lẫn AssessmentPolicyDetail (trang chi tiết) mà không quan tâm shape của các quan hệ nested.
// "frameworkVersion" (kèm resultBands) được lấy trực tiếp từ 2 query trên thay vì gọi thêm
// query "schoolFrameworkVersion(id)" vì BE đã bỏ query đó (School Admin không còn quyền
// gọi query đơn lẻ theo id — chỉ SYSTEM_ADMIN dùng được "frameworkVersion(id)").
// gradeLevel/schoolGrade/schoolClass: dùng để tra trần bậc mục tiêu theo phạm vi hiện có của
// policy (phạm vi không sửa được sau khi tạo, giống frameworkVersion/rubricVersion).
export type EditableAssessmentPolicy = Pick<
  AssessmentPolicy,
  'id' | 'frameworkVersionId' | 'targetFrameworkBandId' | 'passingScore' | 'strictness' | 'effectiveFrom' | 'effectiveTo' | 'frameworkVersion' | 'rubricVersion' | 'gradeLevel' | 'schoolGrade' | 'schoolClass'
>;

type UpdateAssessmentPolicyDialogProps = {
  schoolId: string | undefined;
  policy: EditableAssessmentPolicy | null;
  onClose: () => void;
  onSubmit: (data: UpdateAssessmentPolicyPayload) => Promise<void>;
  isPending: boolean;
};

// Dự án chỉ phục vụ THPT (Khối 10-12) theo chuẩn VSTEP -- toàn bộ mặt bằng thực tế chỉ nằm trong
// Bậc 3 (mặc định mọi khối) đến Bậc 4 (trần cho lớp chuyên). Bậc 1/2 (A1/A2) thấp hơn hẳn sàn, còn
// Bậc 5/6 (C1/C2) là chuẩn giáo viên chứ không phải học sinh -- ẩn hẳn cả hai đầu khỏi lựa chọn,
// không chỉ disable như trường hợp vượt TRẦN theo khối/lớp.
const MIN_VISIBLE_BAND_ORDER = 3;
const MAX_VISIBLE_BAND_ORDER = 4;

const STRICTNESS_OPTIONS: { value: AssessmentPolicyStrictness; label: string }[] = [
  { value: 'LENIENT', label: 'Lỏng (LENIENT)' },
  { value: 'STANDARD', label: 'Chuẩn (STANDARD)' },
  { value: 'STRICT', label: 'Chặt (STRICT)' },
];

function toDateInputValue(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  // Cộng 7 tiếng rồi đọc theo UTC để ra đúng ngày theo giờ VN (+07:00), bất kể múi giờ trình
  // duyệt — toISOString() thẳng ở đây từng lùi mất 1 ngày với các mốc đầu ngày giờ VN.
  const vnLocal = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return vnLocal.toISOString().slice(0, 10);
}

// Chuyển yyyy-MM-dd thành datetime kèm offset +07:00 để BE parse trực tiếp qua OffsetDateTime,
// không phụ thuộc nhánh tương thích tạm thời (không offset) của DateMapper.
function toBackendDate(value: string, endOfDay = false) {
  return `${value}T${endOfDay ? '23:59:59' : '00:00:00'}+07:00`;
}

export function UpdateAssessmentPolicyDialog({ schoolId, policy, onClose, onSubmit, isPending }: UpdateAssessmentPolicyDialogProps) {
  const resultBands = policy?.frameworkVersion?.resultBands ?? [];
  const { showError, feedbackToast } = useFeedbackToast();

  // Trần bậc mục tiêu theo phạm vi hiện có của policy -- chỉ disable option vượt trần, KHÔNG
  // auto-điền lại band: đang sửa 1 giá trị đã có, tự nhảy về mặc định sẽ gây bất ngờ.
  const { data: bandCeiling } = useGradeLevelBandCeilingQuery(
    schoolId,
    {
      gradeLevelId: policy?.gradeLevel?.id,
      schoolGradeId: policy?.schoolGrade?.id,
      schoolClassId: policy?.schoolClass?.id,
    },
    policy?.frameworkVersionId,
  );

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

  const scoringScaleMin = policy.rubricVersion?.scoringScaleMin;
  const scoringScaleMax = policy.rubricVersion?.scoringScaleMax;
  const hasScoreRange = scoringScaleMin != null && scoringScaleMax != null;
  const passingScoreValue = form.passingScore.trim() ? Number(form.passingScore) : null;
  const passingScoreError =
    passingScoreValue !== null && hasScoreRange && (passingScoreValue < scoringScaleMin! || passingScoreValue > scoringScaleMax!)
      ? `Điểm đạt phải nằm trong thang điểm của Rubric Version (${scoringScaleMin} – ${scoringScaleMax})`
      : null;

  const isMissingRequired = !form.targetFrameworkBandId || !form.effectiveFrom;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isMissingRequired) {
      showError('Vui lòng nhập đầy đủ các trường bắt buộc!');
      return;
    }

    if (form.effectiveTo && new Date(form.effectiveFrom) > new Date(form.effectiveTo)) {
      showError('Ngày kết thúc không được nhỏ hơn Ngày áp dụng!');
      return;
    }

    if (passingScoreError) {
      showError(`${passingScoreError}!`);
      return;
    }

    const payload: UpdateAssessmentPolicyPayload = {
      targetFrameworkBandId: form.targetFrameworkBandId,
      effectiveFrom: toBackendDate(form.effectiveFrom),
      effectiveTo: form.effectiveTo ? toBackendDate(form.effectiveTo, true) : undefined,
      passingScore: form.passingScore ? Number(form.passingScore) : undefined,
      strictness: form.strictness || undefined,
    };

    await onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm transition-opacity" onClick={!isPending ? onClose : undefined} />
      {feedbackToast}

      <div className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-black text-blue-950">Chỉnh sửa Chính Sách Đánh Giá</h2>
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
                {resultBands
                  ?.filter((band) => band.order >= MIN_VISIBLE_BAND_ORDER && band.order <= MAX_VISIBLE_BAND_ORDER)
                  .map((band) => (
                  <option
                    key={band.id}
                    value={band.id}
                    disabled={Boolean(bandCeiling) && band.order > bandCeiling!.hardMaxBandOrder}
                  >
                    {band.code} - {band.label}
                    {bandCeiling && band.order > bandCeiling.hardMaxBandOrder ? ' (vượt trần)' : ''}
                  </option>
                ))}
              </select>
              {bandCeiling ? (
                <p className="mt-1 text-xs text-slate-400">
                  Theo phạm vi của policy: mặc định {bandCeiling.defaultBandLabel}, tối đa {bandCeiling.hardMaxBandLabel}.
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">Điểm đạt (passingScore)</label>
                <input
                  type="number" step="0.1"
                  min={scoringScaleMin} max={scoringScaleMax}
                  value={form.passingScore}
                  onChange={(e) => setForm({ ...form, passingScore: e.target.value })} disabled={isPending}
                  className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50 ${passingScoreError ? 'border-red-400' : 'border-slate-300'}`}
                  placeholder="Để trống nếu không áp dụng"
                />
                {passingScoreError ? (
                  <p className="mt-1 text-xs font-semibold text-red-600">{passingScoreError}</p>
                ) : hasScoreRange ? (
                  <p className="mt-1 text-xs text-slate-400">Thang điểm: {scoringScaleMin} – {scoringScaleMax}</p>
                ) : null}
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
