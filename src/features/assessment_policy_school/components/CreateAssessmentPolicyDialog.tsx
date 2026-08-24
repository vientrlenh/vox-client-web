// src/features/assessment_policy_school/components/CreateAssessmentPolicyDialog.tsx

import { useEffect, useState } from 'react';
import { X, Loader2, Plus, Trash2 } from 'lucide-react';
import { useFeedbackToast } from '@/shared/ui/useFeedbackToast';
import { useLanguageOptionsQuery } from '../api/useFilterOptionsQuery';
import { useAllFrameworkVersionsQuery, useFrameworkVersionCriteriaQuery } from '../api/useFrameworkVersionOptionsQuery';
import { useRubricSearchOptionsQuery, useRubricVersionOptionsQuery } from '../api/useRubricOptionsQuery';
import { useGradeLevelOptionsQuery, useSchoolGradeOptionsQuery } from '../api/useSchoolScopeOptionsQuery';
import { useSchoolClassesQuery } from '@/features/classes/api/useSchoolClassesQuery';
import type { ClassFilters } from '@/features/classes/types';
import type { AssessmentPolicyStrictness, CreateAssessmentPolicyPayload, RubricOption } from '../types';

type ScoreRange = { min: number; max: number };

type CreateAssessmentPolicyDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string | undefined;
  // Gọi 1 lần duy nhất với toàn bộ danh sách Assessment Policy cần tạo (BE nhận 1 mảng).
  onSubmit: (data: CreateAssessmentPolicyPayload[]) => Promise<void>;
  isPending: boolean;
};

const STRICTNESS_OPTIONS: { value: AssessmentPolicyStrictness; label: string }[] = [
  { value: 'LENIENT', label: 'Lỏng (LENIENT)' },
  { value: 'STANDARD', label: 'Chuẩn (STANDARD)' },
  { value: 'STRICT', label: 'Chặt (STRICT)' },
];

// Chuyển yyyy-MM-dd thành datetime kèm offset +07:00 để BE parse trực tiếp qua OffsetDateTime,
// không phụ thuộc nhánh tương thích tạm thời (không offset) của DateMapper.
function toBackendDate(value: string, endOfDay = false) {
  return `${value}T${endOfDay ? '23:59:59' : '00:00:00'}+07:00`;
}

type PolicyFormState = {
  key: number;
  languageId: string;
  frameworkId: string;
  frameworkVersionId: string;
  targetFrameworkBandId: string;
  rubricVersionId: string;
  rubricVersionScales: Record<string, ScoreRange>;
  passingScore: string;
  strictness: AssessmentPolicyStrictness | '';
  effectiveFrom: string;
  effectiveTo: string;
  gradeLevelId: string;
  schoolGradeId: string;
  schoolClassId: string;
};

function makeEmptyPolicyForm(key: number): PolicyFormState {
  return {
    key,
    languageId: '',
    frameworkId: '',
    frameworkVersionId: '',
    targetFrameworkBandId: '',
    rubricVersionId: '',
    rubricVersionScales: {},
    passingScore: '',
    strictness: '',
    effectiveFrom: '',
    effectiveTo: '',
    gradeLevelId: '',
    schoolGradeId: '',
    schoolClassId: '',
  };
}

// Danh sách Rubric Version của 1 Rubric cụ thể — chỉ được chọn đúng 1 Version trong toàn bộ form
// (1 Assessment Policy luôn chỉ gắn đúng 1 Rubric Version). Mỗi Rubric hiện 1 nhóm riêng vì BE
// không yêu cầu Version phải cùng 1 Rubric.
type RubricVersionGroupProps = {
  schoolId: string | undefined;
  rubric: RubricOption;
  groupName: string;
  selectedId: string;
  onSelect: (rubricVersionId: string) => void;
  onVersionsLoaded: (scales: Record<string, ScoreRange>) => void;
  disabled: boolean;
};

function RubricVersionGroup({ schoolId, rubric, groupName, selectedId, onSelect, onVersionsLoaded, disabled }: RubricVersionGroupProps) {
  const { data: versions, isLoading } = useRubricVersionOptionsQuery(schoolId, rubric.id);

  useEffect(() => {
    if (!versions?.length) return;
    onVersionsLoaded(
      Object.fromEntries(versions.map((v) => [v.id, { max: v.scoringScaleMax, min: v.scoringScaleMin }])),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versions]);

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-sm font-bold text-slate-800">{rubric.code} - {rubric.name}</p>
      {isLoading ? (
        <p className="mt-1 text-xs font-medium text-slate-400">Đang tải phiên bản...</p>
      ) : versions?.length ? (
        <div className="mt-2 grid gap-1">
          {versions.map((rv) => (
            <label key={rv.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50">
              <input
                type="radio"
                name={groupName}
                checked={selectedId === rv.id}
                onChange={() => onSelect(rv.id)}
                disabled={disabled}
                className="size-4 border-slate-300 text-cyan-600 focus:ring-cyan-500"
              />
              <span>{rv.code} - {rv.name} (v{rv.version}) · {rv.status}</span>
            </label>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-xs font-medium text-slate-400">Rubric này chưa có phiên bản nào.</p>
      )}
    </div>
  );
}

// Toàn bộ khối field của 1 Assessment Policy (Ngôn ngữ -> ngày hiệu lực).
// Được lặp lại cho mỗi policy trong danh sách khi tạo nhiều policy cùng lúc.
type PolicyFormFieldsProps = {
  schoolId: string | undefined;
  index: number;
  form: PolicyFormState;
  onChange: (patch: Partial<PolicyFormState>) => void;
  onRemove?: () => void;
  isPending: boolean;
};

function PolicyFormFields({ schoolId, index, form, onChange, onRemove, isPending }: PolicyFormFieldsProps) {
  const { data: languages } = useLanguageOptionsQuery();
  const { data: allFrameworkVersions, isLoading: isLoadingFrameworkVersions } = useAllFrameworkVersionsQuery();
  const selectedFrameworkVersion = allFrameworkVersions?.find((fv) => fv.id === form.frameworkVersionId);
  const resultBands = selectedFrameworkVersion?.resultBands;
  const { data: frameworkCriteria, isLoading: isLoadingCriteria } = useFrameworkVersionCriteriaQuery(form.frameworkVersionId || undefined);
  const { data: rubrics } = useRubricSearchOptionsQuery(schoolId, form.languageId || undefined);
  const { data: gradeLevels } = useGradeLevelOptionsQuery(Boolean(schoolId));
  const { data: grades } = useSchoolGradeOptionsQuery(schoolId, form.gradeLevelId || undefined);
  const classFilter: ClassFilters = { languageId: '', schoolGradeId: form.schoolGradeId || '', search: '', status: 'ACTIVE' };
  const { data: classesPage } = useSchoolClassesQuery(1, 100, classFilter, { enabled: Boolean(form.schoolGradeId) });
  const classes = classesPage?.content ?? [];

  function handleLanguageChange(languageId: string) {
    onChange({ languageId, rubricVersionId: '' });
  }

  // Chọn Framework Version trước — Khung năng lực (frameworkId) được tự suy ra từ Version đã chọn,
  // vì mỗi Version chỉ thuộc đúng 1 Framework.
  function handleFrameworkVersionChange(frameworkVersionId: string) {
    const matched = allFrameworkVersions?.find((fv) => fv.id === frameworkVersionId);
    onChange({
      frameworkVersionId,
      frameworkId: matched?.frameworkId ?? '',
      targetFrameworkBandId: '',
    });
  }

  function handleVersionsLoaded(scales: Record<string, ScoreRange>) {
    onChange({ rubricVersionScales: { ...form.rubricVersionScales, ...scales } });
  }

  function handleSelectRubricVersion(rubricVersionId: string) {
    onChange({ rubricVersionId });
  }

  // Chọn cấp rộng hơn thì xóa lựa chọn ở (các) cấp hẹp hơn vì chúng phụ thuộc vào cấp rộng.
  function handleGradeLevelChange(gradeLevelId: string) {
    onChange({ gradeLevelId, schoolGradeId: '', schoolClassId: '' });
  }

  function handleGradeChange(schoolGradeId: string) {
    onChange({ schoolGradeId, schoolClassId: '' });
  }

  const effectiveScoreRange = form.rubricVersionScales[form.rubricVersionId] ?? null;
  const passingScoreValue = form.passingScore.trim() ? Number(form.passingScore) : null;
  const passingScoreError =
    passingScoreValue !== null && effectiveScoreRange && (passingScoreValue < effectiveScoreRange.min || passingScoreValue > effectiveScoreRange.max)
      ? `Điểm đạt phải nằm trong thang điểm của Rubric Version đã chọn (${effectiveScoreRange.min} – ${effectiveScoreRange.max})`
      : null;

  const isSecondaryPolicy = index > 0;

  return (
    <div
      className={
        isSecondaryPolicy ? 'rounded-xl border border-cyan-100 bg-cyan-50/40 p-5' : ''
      }
    >
      {isSecondaryPolicy ? (
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-extrabold uppercase tracking-wide text-cyan-700">
            Chính Sách Đánh Giá #{index + 1}
          </p>
          {onRemove ? (
            <button
              type="button"
              onClick={onRemove}
              disabled={isPending}
              className="flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-600 disabled:opacity-50"
            >
              <Trash2 className="size-3.5" /> Xóa
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-5">
        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">Framework Version (đã PUBLISHED) <span className="text-red-500">*</span></label>
          <select
            value={form.frameworkVersionId} onChange={(e) => handleFrameworkVersionChange(e.target.value)}
            disabled={isPending || isLoadingFrameworkVersions}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50"
          >
            <option value="">{isLoadingFrameworkVersions ? 'Đang tải...' : '-- Chọn framework version --'}</option>
            {allFrameworkVersions?.map((fv) => (
              <option key={fv.id} value={fv.id}>{fv.name}</option>
            ))}
          </select>
        </div>

        {form.frameworkVersionId ? (
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">
              Tiêu chí của Framework Version
              <span className="ml-1 font-normal text-slate-400">(chỉ để xem tham khảo, không cần chọn)</span>
            </label>
            {isLoadingCriteria ? (
              <p className="rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500">Đang tải...</p>
            ) : frameworkCriteria?.length ? (
              <div className="grid max-h-56 gap-2 overflow-y-auto rounded-lg border border-slate-300 bg-slate-50/50 p-3">
                {frameworkCriteria.map((fc) => (
                  <div key={fc.id} className="rounded-md border border-slate-200 bg-white px-3 py-2">
                    <p className="text-sm font-bold text-slate-800">{fc.code} - {fc.name}</p>
                    {fc.description ? <p className="mt-0.5 text-xs text-slate-500">{fc.description}</p> : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500">
                Framework Version này chưa có tiêu chí nào.
              </p>
            )}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">Ngôn ngữ <span className="text-red-500">*</span></label>
            <select
              value={form.languageId} onChange={(e) => handleLanguageChange(e.target.value)} disabled={isPending}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50"
            >
              <option value="">-- Chọn ngôn ngữ --</option>
              {languages?.map((lang) => <option key={lang.id} value={lang.id}>{lang.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">Khung năng lực</label>
            <input
              type="text" readOnly value={selectedFrameworkVersion?.frameworkName ?? ''}
              placeholder="Tự động điền sau khi chọn Framework Version"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-600 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">Target Band <span className="text-red-500">*</span></label>
          <select
            value={form.targetFrameworkBandId} onChange={(e) => onChange({ targetFrameworkBandId: e.target.value })}
            disabled={isPending || !form.frameworkVersionId}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50"
          >
            <option value="">-- Chọn target band --</option>
            {resultBands?.map((band) => <option key={band.id} value={band.id}>{band.code} - {band.label}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">
            Rubric Version <span className="text-red-500">*</span>
          </label>
          {!form.languageId ? (
            <p className="rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500">
              Chọn Ngôn ngữ ở trên trước để hiện danh sách Rubric.
            </p>
          ) : rubrics?.length ? (
            <div className="grid max-h-72 gap-3 overflow-y-auto rounded-lg border border-slate-300 bg-slate-50/50 p-3">
              {rubrics.map((rubric) => (
                <RubricVersionGroup
                  key={rubric.id}
                  schoolId={schoolId}
                  rubric={rubric}
                  groupName={`rubric-version-${form.key}`}
                  selectedId={form.rubricVersionId}
                  onSelect={handleSelectRubricVersion}
                  onVersionsLoaded={handleVersionsLoaded}
                  disabled={isPending}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500">
              Không có Rubric nào cho ngôn ngữ này.
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-slate-700">Phạm vi áp dụng</label>
          <div className="grid grid-cols-3 gap-3">
            <select
              value={form.gradeLevelId} onChange={(e) => handleGradeLevelChange(e.target.value)} disabled={isPending}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50"
            >
              <option value="">-- Khối --</option>
              {gradeLevels?.map((gl) => <option key={gl.id} value={gl.id}>{gl.code} - {gl.name}</option>)}
            </select>
            <select
              value={form.schoolGradeId} onChange={(e) => handleGradeChange(e.target.value)}
              disabled={isPending || !form.gradeLevelId}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50"
            >
              <option value="">{form.gradeLevelId ? '-- Niên khóa --' : '-- Chọn Khối trước --'}</option>
              {grades?.map((grade) => <option key={grade.id} value={grade.id}>{grade.code || grade.name}</option>)}
            </select>
            <select
              value={form.schoolClassId} onChange={(e) => onChange({ schoolClassId: e.target.value })}
              disabled={isPending || !form.schoolGradeId}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50"
            >
              <option value="">{form.schoolGradeId ? '-- Lớp --' : '-- Chọn Niên khóa trước --'}</option>
              {classes.map((schoolClass) => (
                <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.code} - {schoolClass.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">Điểm đạt (passingScore)</label>
            <input
              type="number" step="0.1"
              min={effectiveScoreRange?.min} max={effectiveScoreRange?.max}
              value={form.passingScore}
              onChange={(e) => onChange({ passingScore: e.target.value })} disabled={isPending}
              className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50 ${passingScoreError ? 'border-red-400' : 'border-slate-300'}`}
              placeholder="VD: 6.5 (để trống nếu không áp dụng)"
            />
            {passingScoreError ? (
              <p className="mt-1 text-xs font-semibold text-red-600">{passingScoreError}</p>
            ) : effectiveScoreRange ? (
              <p className="mt-1 text-xs text-slate-400">Thang điểm: {effectiveScoreRange.min} – {effectiveScoreRange.max}</p>
            ) : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">Độ nghiêm ngặt</label>
            <select
              value={form.strictness} onChange={(e) => onChange({ strictness: e.target.value as AssessmentPolicyStrictness })}
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
              type="date" value={form.effectiveFrom} onChange={(e) => onChange({ effectiveFrom: e.target.value })}
              disabled={isPending}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">Đến ngày (tùy chọn)</label>
            <input
              type="date" value={form.effectiveTo} onChange={(e) => onChange({ effectiveTo: e.target.value })}
              disabled={isPending}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-cyan-500 disabled:bg-slate-50"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CreateAssessmentPolicyDialog({ isOpen, onClose, schoolId, onSubmit, isPending }: CreateAssessmentPolicyDialogProps) {
  const [forms, setForms] = useState<PolicyFormState[]>([makeEmptyPolicyForm(0)]);
  const { showError, feedbackToast } = useFeedbackToast();

  // Reset form mỗi khi mở lại dialog
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setForms([makeEmptyPolicyForm(0)]);
    }
  }

  if (!isOpen) return null;

  function updateForm(key: number, patch: Partial<PolicyFormState>) {
    setForms((current) => current.map((f) => (f.key === key ? { ...f, ...patch } : f)));
  }

  function addPolicyForm() {
    setForms((current) => {
      const nextKey = current.reduce((max, f) => Math.max(max, f.key), 0) + 1;
      return [...current, makeEmptyPolicyForm(nextKey)];
    });
  }

  function removePolicyForm(key: number) {
    setForms((current) => current.filter((f) => f.key !== key));
  }

  function validateForm(form: PolicyFormState) {
    return (
      !form.languageId ||
      !form.frameworkVersionId ||
      !form.rubricVersionId ||
      !form.targetFrameworkBandId ||
      !form.effectiveFrom
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (forms.some(validateForm)) {
      showError('Vui lòng nhập đầy đủ các trường bắt buộc cho tất cả Chính Sách Đánh Giá!');
      return;
    }

    for (const form of forms) {
      if (form.effectiveTo && new Date(form.effectiveFrom) > new Date(form.effectiveTo)) {
        showError('Ngày kết thúc không được nhỏ hơn Ngày áp dụng!');
        return;
      }

      if (form.passingScore.trim()) {
        const range = form.rubricVersionScales[form.rubricVersionId] ?? null;
        const score = Number(form.passingScore);
        if (range && (score < range.min || score > range.max)) {
          showError(`Điểm đạt phải nằm trong thang điểm của Rubric Version đã chọn (${range.min} – ${range.max})!`);
          return;
        }
      }
    }

    // Gộp toàn bộ danh sách Assessment Policy thành 1 mảng và gọi onSubmit đúng 1 lần.
    // Phạm vi áp dụng: chỉ gửi field ở cấp hẹp nhất được chọn (Lớp > Niên khóa > Khối)
    // để tránh mâu thuẫn/dư thừa nếu chọn nhiều cấp cùng lúc.
    const payloads: CreateAssessmentPolicyPayload[] = forms.map((form) => {
      const scope = form.schoolClassId
        ? { schoolClassId: form.schoolClassId }
        : form.schoolGradeId
          ? { schoolGradeId: form.schoolGradeId }
          : form.gradeLevelId
            ? { gradeLevelId: form.gradeLevelId }
            : {};

      return {
        frameworkVersionId: form.frameworkVersionId,
        rubricVersionId: form.rubricVersionId,
        languageId: form.languageId,
        targetFrameworkBandId: form.targetFrameworkBandId,
        effectiveFrom: toBackendDate(form.effectiveFrom),
        effectiveTo: form.effectiveTo ? toBackendDate(form.effectiveTo, true) : undefined,
        passingScore: form.passingScore ? Number(form.passingScore) : undefined,
        strictness: form.strictness || undefined,
        ...scope,
      };
    });

    await onSubmit(payloads);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm transition-opacity" onClick={!isPending ? onClose : undefined} />
      {feedbackToast}

      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <h2 className="text-lg font-black text-blue-950">Thêm mới Chính Sách Đánh Giá</h2>
          <button type="button" onClick={onClose} disabled={isPending} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-50">
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid gap-6">
            {forms.map((form, index) => (
              <PolicyFormFields
                key={form.key}
                schoolId={schoolId}
                index={index}
                form={form}
                onChange={(patch) => updateForm(form.key, patch)}
                onRemove={index > 0 ? () => removePolicyForm(form.key) : undefined}
                isPending={isPending}
              />
            ))}

            <button
              type="button"
              onClick={addPolicyForm}
              disabled={isPending}
              className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-400 bg-slate-50 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              <Plus className="size-4.5" />
              {forms.length < 2 ? 'Tạo Chính Sách Đánh Giá thứ 2' : `Thêm Chính Sách Đánh Giá thứ ${forms.length + 1}`}
            </button>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
            <button type="button" onClick={onClose} disabled={isPending} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50">Hủy bỏ</button>
            <button type="submit" disabled={isPending} className="inline-flex min-w-30 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-cyan-700 disabled:opacity-50">
              {isPending ? <Loader2 className="size-4 animate-spin" /> : 'Tạo mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
