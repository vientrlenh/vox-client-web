// src/features/assessment_policy_school/components/CloneSystemAssessmentPolicyDialog.tsx

import { useState } from 'react';
import { Copy, Loader2, Lock, X } from 'lucide-react';
import { ErrorBanner } from '@/shared/ui/ErrorBanner';
import { toApiError } from '@/shared/api';
import { useSchoolClassesQuery } from '@/features/classes/api/useSchoolClassesQuery';
import type { ClassFilters } from '@/features/classes/types';
import {
  RUBRIC_ALLOCATION_METHOD,
  RUBRIC_AVERAGE_METHOD,
  rubricTotalScoreMethodHint,
  rubricTotalScoreMethodLabel,
} from '@/features/rubrics_school/types';
import type { CloneSystemAssessmentPolicyPayload } from '../api/useCloneSystemAssessmentPolicyMutation';
import type { SystemAssessmentPolicyTemplate } from '../api/useSystemAssessmentPolicyTemplatesQuery';
import { useGradeLevelOptionsQuery, useSchoolGradeOptionsQuery } from '../api/useSchoolScopeOptionsQuery';

type CloneSystemAssessmentPolicyDialogProps = {
  isOpen: boolean;
  template: SystemAssessmentPolicyTemplate | null;
  schoolId: string | undefined;
  onClose: () => void;
  onSubmit: (payload: CloneSystemAssessmentPolicyPayload) => Promise<void>;
  isPending: boolean;
};

const SCORE_METHOD_OPTIONS = [RUBRIC_ALLOCATION_METHOD, RUBRIC_AVERAGE_METHOD];

// Giống CreateAssessmentPolicyDialog: gửi kèm offset +07:00 để BE parse thẳng qua OffsetDateTime.
function toBackendDate(value: string, endOfDay = false) {
  return `${value}T${endOfDay ? '23:59:59' : '00:00:00'}+07:00`;
}

export function CloneSystemAssessmentPolicyDialog({
  isOpen,
  template,
  schoolId,
  onClose,
  onSubmit,
  isPending,
}: CloneSystemAssessmentPolicyDialogProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rubricCode, setRubricCode] = useState('');
  const [rubricName, setRubricName] = useState('');
  const [rubricDescription, setRubricDescription] = useState('');
  const [methodOverride, setMethodOverride] = useState<string | null>(null);
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');
  const [gradeLevelId, setGradeLevelId] = useState('');
  const [schoolGradeId, setSchoolGradeId] = useState('');
  const [schoolClassId, setSchoolClassId] = useState('');

  // Bản mẫu đã gắn Khối thì bản sao BẮT BUỘC giữ đúng khối đó -- backend từ chối mọi phạm vi khác
  // (resolveScope của CloneSystemAssessmentPolicyToSchoolUseCase). Cho đổi khối là biến bản mẫu
  // "Khối 10" thành chính sách Khối 12 mà vẫn mang nguyên thông số soạn cho Khối 10.
  const inheritsScope = Boolean(template?.gradeLevel);

  const { data: gradeLevels } = useGradeLevelOptionsQuery(isOpen && !inheritsScope);
  const { data: grades } = useSchoolGradeOptionsQuery(schoolId, gradeLevelId || undefined);
  const classFilter: ClassFilters = {
    languageId: '',
    schoolGradeId: schoolGradeId || '',
    search: '',
    status: 'ACTIVE',
  };
  const { data: classesPage } = useSchoolClassesQuery(1, 100, classFilter, {
    enabled: Boolean(schoolGradeId),
  });
  const classes = classesPage?.content ?? [];

  // Reset form mỗi lần mở lại
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    setErrorMessage(null);
    if (isOpen) {
      setRubricCode('');
      setRubricName(template?.rubricVersion?.name ?? '');
      setRubricDescription('');
      setMethodOverride(null);
      setEffectiveFrom('');
      setEffectiveTo('');
      setGradeLevelId('');
      setSchoolGradeId('');
      setSchoolClassId('');
    }
  }

  if (!isOpen || !template) return null;

  const totalScoreMethod = methodOverride ?? RUBRIC_ALLOCATION_METHOD;
  const scopeCount =
    (gradeLevelId ? 1 : 0) + (schoolGradeId ? 1 : 0) + (schoolClassId ? 1 : 0);

  // Chọn cấp rộng hơn thì xóa lựa chọn ở cấp hẹp hơn vì chúng phụ thuộc vào cấp rộng.
  function handleGradeLevelChange(value: string) {
    setGradeLevelId(value);
    setSchoolGradeId('');
    setSchoolClassId('');
  }

  function handleGradeChange(value: string) {
    setSchoolGradeId(value);
    setSchoolClassId('');
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!rubricCode.trim() || !rubricName.trim()) {
      setErrorMessage('Vui lòng nhập mã và tên cho bộ tiêu chí của trường.');
      return;
    }
    if (!effectiveFrom) {
      setErrorMessage('Vui lòng chọn ngày bắt đầu hiệu lực.');
      return;
    }
    if (effectiveTo && effectiveTo < effectiveFrom) {
      setErrorMessage('Ngày kết thúc không được trước ngày bắt đầu.');
      return;
    }
    // Kiểm ngay tại form thay vì để backend trả lỗi: chỉ có ĐÚNG MỘT phạm vi mới hợp lệ, và người
    // dùng sửa được ngay ở đây.
    if (!inheritsScope && scopeCount !== 1) {
      setErrorMessage(
        'Bản mẫu này không gắn Khối nào nên phải chọn đúng 1 phạm vi áp dụng: Khối, Niên khóa HOẶC Lớp.'
      );
      return;
    }

    try {
      await onSubmit({
        sourcePolicyId: template.id,
        rubricCode: rubricCode.trim(),
        rubricName: rubricName.trim(),
        rubricDescription: rubricDescription.trim() || undefined,
        totalScoreMethod,
        // Bản mẫu đã khai Khối thì KHÔNG gửi phạm vi nào -- backend coi mọi giá trị ở đây là ý định
        // ghi đè và từ chối cả yêu cầu.
        gradeLevelId: inheritsScope ? undefined : gradeLevelId || undefined,
        schoolGradeId: inheritsScope ? undefined : schoolGradeId || undefined,
        schoolClassId: inheritsScope ? undefined : schoolClassId || undefined,
        effectiveFrom: toBackendDate(effectiveFrom),
        effectiveTo: effectiveTo ? toBackendDate(effectiveTo, true) : undefined,
      });
    } catch (error) {
      // Lỗi máy chủ phải hiện ngay trong modal: banner của trang nằm sau lớp phủ nên không đọc được.
      setErrorMessage(toApiError(error).message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/45" onClick={!isPending ? onClose : undefined} />

      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black text-blue-950">
              <Copy className="size-5 text-indigo-600" /> Sao chính sách mẫu về trường
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Bản mẫu:{' '}
              <span className="font-bold text-slate-900">
                {template.gradeLevel?.name || 'Mọi khối'}
              </span>
              <span className="ml-2 text-xs text-slate-500">
                {template.frameworkVersion?.name} · {template.targetFrameworkBand?.label}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 disabled:opacity-50"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <ErrorBanner className="mb-5" message={errorMessage} />

            {/* 1. NHỮNG GÌ ĐI THEO BẢN MẪU */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-blue-950">
                <Lock className="size-3.5 text-slate-500" /> Giữ nguyên theo bản mẫu
              </p>
              <div className="grid gap-x-6 gap-y-2 text-sm text-slate-700 sm:grid-cols-2">
                <span>
                  <span className="font-medium">Ngôn ngữ:</span> {template.language?.name ?? '-'}
                </span>
                <span>
                  <span className="font-medium">Khung năng lực:</span>{' '}
                  {template.frameworkVersion?.name ?? '-'}
                </span>
                <span>
                  <span className="font-medium">Bậc mục tiêu:</span>{' '}
                  {template.targetFrameworkBand?.label ?? '-'}
                </span>
                <span>
                  <span className="font-medium">Độ chặt:</span> {template.strictness}
                </span>
                <span>
                  <span className="font-medium">Điểm đạt:</span>{' '}
                  {template.passingScore == null ? 'không đặt' : template.passingScore}
                </span>
                <span>
                  <span className="font-medium">Thang điểm:</span>{' '}
                  {template.rubricVersion?.scoringScaleMin} - {template.rubricVersion?.scoringScaleMax}
                </span>
              </div>
            </div>

            {/* 2. PHẠM VI ÁP DỤNG */}
            <div className="mt-5">
              <label className="mb-1 block text-sm font-bold text-slate-700">
                Phạm vi áp dụng {!inheritsScope && <span className="text-red-500">*</span>}
              </label>

              {inheritsScope ? (
                <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-slate-700">
                  Bản sao áp dụng cho{' '}
                  <span className="font-bold text-indigo-800">
                    {template.gradeLevel?.name || template.gradeLevel?.code}
                  </span>
                  , giữ theo bản mẫu.
                  <span className="mt-1 block text-xs leading-5 text-slate-600">
                    Mọi thông số của bản mẫu đều được soạn cho khối này, nên không đổi sang khối khác
                    được. Cần chính sách cho khối khác thì sao bản mẫu của khối đó.
                  </span>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <select
                      value={gradeLevelId}
                      onChange={(event) => handleGradeLevelChange(event.target.value)}
                      disabled={isPending}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 disabled:bg-slate-50"
                    >
                      <option value="">-- Khối --</option>
                      {gradeLevels?.map((level) => (
                        <option key={level.id} value={level.id}>
                          {level.name || level.code}
                        </option>
                      ))}
                    </select>
                    <select
                      value={schoolGradeId}
                      onChange={(event) => handleGradeChange(event.target.value)}
                      disabled={isPending || !gradeLevelId}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 disabled:bg-slate-50"
                    >
                      <option value="">{gradeLevelId ? '-- Niên khóa --' : '-- Chọn Khối trước --'}</option>
                      {grades?.map((grade) => (
                        <option key={grade.id} value={grade.id}>
                          {grade.code || grade.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={schoolClassId}
                      onChange={(event) => setSchoolClassId(event.target.value)}
                      disabled={isPending || !schoolGradeId}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 disabled:bg-slate-50"
                    >
                      <option value="">{schoolGradeId ? '-- Lớp --' : '-- Chọn Niên khóa trước --'}</option>
                      {classes.map((schoolClass) => (
                        <option key={schoolClass.id} value={schoolClass.id}>
                          {schoolClass.code || schoolClass.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Bản mẫu này không gắn Khối nào nên trường tự chọn. Chỉ nhận ĐÚNG MỘT cấp — chọn
                    cấp hẹp nhất muốn áp dụng.
                  </p>
                </>
              )}
            </div>

            {/* 3. BỘ TIÊU CHÍ ĐI KÈM */}
            <div className="mt-6 grid gap-5">
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
                Sao chính sách luôn kéo theo sao <span className="font-bold">bộ tiêu chí</span>: bản
                mẫu dùng bộ tiêu chí của hệ thống, mà chính sách của trường chỉ gắn được vào bộ tiêu
                chí của chính trường mình. Bản sao bộ tiêu chí dưới đây là tài sản riêng của trường.
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Mã bộ tiêu chí <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={rubricCode}
                    onChange={(event) => setRubricCode(event.target.value)}
                    disabled={isPending}
                    maxLength={50}
                    placeholder="VD: ENG-K10"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 disabled:bg-slate-50"
                  />
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Mã phải khác nhau giữa các bản sao — sao cả ba khối thì đặt theo khối (ENG-K10,
                    ENG-K11, ENG-K12).
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Tên bộ tiêu chí <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={rubricName}
                    onChange={(event) => setRubricName(event.target.value)}
                    disabled={isPending}
                    maxLength={255}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 disabled:bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">Mô tả</label>
                <textarea
                  rows={2}
                  value={rubricDescription}
                  onChange={(event) => setRubricDescription(event.target.value)}
                  disabled={isPending}
                  maxLength={2048}
                  placeholder="Bỏ trống thì giữ theo bản mẫu."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 disabled:bg-slate-50"
                />
              </div>

              <div>
                <p className="mb-2 text-sm font-bold text-slate-700">Cách tính điểm cho bản sao</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {SCORE_METHOD_OPTIONS.map((method) => (
                    <label
                      key={method}
                      className={`cursor-pointer rounded-lg border p-3 transition ${
                        totalScoreMethod === method
                          ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="cloneTotalScoreMethod"
                          value={method}
                          checked={totalScoreMethod === method}
                          onChange={() => setMethodOverride(method)}
                          disabled={isPending}
                          className="size-4 accent-indigo-600"
                        />
                        <span className="text-sm font-bold text-slate-900">
                          {rubricTotalScoreMethodLabel(method)}
                        </span>
                      </span>
                      <span className="mt-1.5 block text-xs leading-5 text-slate-600">
                        {rubricTotalScoreMethodHint(method)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 4. HIỆU LỰC */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">
                    Hiệu lực từ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={effectiveFrom}
                    onChange={(event) => setEffectiveFrom(event.target.value)}
                    disabled={isPending}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 disabled:bg-slate-50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-slate-700">Hiệu lực đến</label>
                  <input
                    type="date"
                    value={effectiveTo}
                    onChange={(event) => setEffectiveTo(event.target.value)}
                    disabled={isPending}
                    min={effectiveFrom || undefined}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 disabled:bg-slate-50"
                  />
                  <p className="mt-1 text-xs text-slate-500">Bỏ trống = không giới hạn.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-6 py-4">
            <p className="text-xs leading-5 text-slate-500">
              Chính sách và bộ tiêu chí đều được tạo ở trạng thái{' '}
              <span className="font-bold text-slate-700">Nháp</span>, để trường rà lại trước khi ban
              hành.
            </p>
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex min-w-32 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : 'Sao về trường'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
