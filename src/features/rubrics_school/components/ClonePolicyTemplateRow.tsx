// src/features/rubrics_school/components/ClonePolicyTemplateRow.tsx

import { Lock } from 'lucide-react';
import { useSchoolClassesQuery } from '@/features/classes/api/useSchoolClassesQuery';
import type { ClassFilters } from '@/features/classes/types';
import {
  useGradeLevelOptionsQuery,
  useSchoolGradeOptionsQuery,
} from '@/features/assessment_policy_school/api/useSchoolScopeOptionsQuery';
import type { SystemPolicyTemplate } from '../api/useSystemPolicyTemplatesForVersionQuery';
import type { ClonePolicySelection } from './clonePolicySelection';

const STRICTNESS_LABEL: Record<string, string> = {
  LENIENT: 'Lỏng',
  STANDARD: 'Chuẩn',
  STRICT: 'Chặt',
};

type ClonePolicyTemplateRowProps = {
  isPending: boolean;
  onChange: (next: ClonePolicySelection) => void;
  onToggle: (selected: boolean) => void;
  schoolId: string | undefined;
  /** null = chưa chọn bản mẫu này. */
  selection: ClonePolicySelection | null;
  template: SystemPolicyTemplate;
};

/**
 * Một dòng chọn chính sách mẫu, kèm PHẠM VI RIÊNG của nó.
 *
 * <p>Tách thành component riêng vì mỗi dòng cần danh sách Lớp của đúng Niên khóa mà dòng đó chọn --
 * gọi hook theo vòng lặp trong component cha thì không biểu đạt được, còn gom về một query chung thì
 * hai dòng chọn hai niên khóa khác nhau sẽ đè lên nhau.
 *
 * <p>Phạm vi phải theo TỪNG chính sách chứ không theo cả lần sao: mỗi phạm vi chỉ được đúng một
 * chính sách còn hiệu lực, nên sao cả bản Bậc 3 lẫn Bậc 4 vào cùng một phạm vi sẽ bị backend từ chối
 * ngay trong cùng một lần gọi.
 */
export function ClonePolicyTemplateRow({
  isPending,
  onChange,
  onToggle,
  schoolId,
  selection,
  template,
}: ClonePolicyTemplateRowProps) {
  // Bản mẫu đã gắn Khối thì bản sao giữ nguyên khối đó -- backend từ chối mọi phạm vi khác.
  const inheritsScope = Boolean(template.gradeLevel);
  const isSelected = selection !== null;

  const { data: gradeLevels } = useGradeLevelOptionsQuery(isSelected && !inheritsScope);
  const { data: grades } = useSchoolGradeOptionsQuery(schoolId, selection?.gradeLevelId || undefined);
  const classFilter: ClassFilters = {
    languageId: '',
    schoolGradeId: selection?.schoolGradeId || '',
    search: '',
    status: 'ACTIVE',
  };
  const { data: classesPage } = useSchoolClassesQuery(1, 100, classFilter, {
    enabled: Boolean(selection?.schoolGradeId),
  });
  const classes = classesPage?.content ?? [];

  // Chọn cấp rộng hơn thì xóa lựa chọn ở cấp hẹp hơn vì chúng phụ thuộc vào cấp rộng.
  const handleGradeLevelChange = (value: string) => {
    if (!selection) return;
    onChange({ ...selection, gradeLevelId: value, schoolGradeId: '', schoolClassId: '' });
  };

  const handleGradeChange = (value: string) => {
    if (!selection) return;
    onChange({ ...selection, schoolGradeId: value, schoolClassId: '' });
  };

  const bandLabel = template.targetFrameworkBand?.label ?? template.targetFrameworkBand?.code ?? '-';

  return (
    <div
      className={`rounded-lg border p-4 transition ${
        isSelected ? 'border-indigo-400 bg-indigo-50/40' : 'border-slate-200'
      }`}
    >
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(event) => onToggle(event.target.checked)}
          disabled={isPending}
          className="mt-0.5 size-4 accent-indigo-600"
        />
        <span className="min-w-0">
          <span className="block text-sm font-bold text-slate-900">Bậc mục tiêu: {bandLabel}</span>
          <span className="mt-0.5 block text-xs leading-5 text-slate-600">
            Độ chặt: {STRICTNESS_LABEL[template.strictness] ?? template.strictness} · Điểm đạt:{' '}
            {template.passingScore == null ? 'không đặt' : template.passingScore}
            {template.frameworkVersion?.name ? ` · Khung: ${template.frameworkVersion.name}` : ''}
          </span>
        </span>
      </label>

      {isSelected && selection && (
        <div className="mt-4 grid gap-4 border-t border-indigo-200 pt-4">
          <div>
            <p className="mb-1 flex items-center gap-1.5 text-sm font-bold text-slate-700">
              Phạm vi áp dụng {!inheritsScope && <span className="text-red-500">*</span>}
            </p>

            {inheritsScope ? (
              <div className="flex items-start gap-2 rounded-lg border border-indigo-100 bg-white px-3 py-2.5 text-sm text-slate-700">
                <Lock className="mt-0.5 size-3.5 shrink-0 text-slate-500" />
                <span>
                  Giữ theo bản mẫu:{' '}
                  <span className="font-bold text-indigo-800">
                    {template.gradeLevel?.name || template.gradeLevel?.code}
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-slate-600">
                    Mọi thông số của bản mẫu đều soạn cho khối này nên không đổi sang khối khác được.
                  </span>
                </span>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <select
                    value={selection.gradeLevelId}
                    onChange={(event) => handleGradeLevelChange(event.target.value)}
                    disabled={isPending}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 disabled:bg-slate-50"
                  >
                    <option value="">-- Khối --</option>
                    {gradeLevels?.map((level) => (
                      <option key={level.id} value={level.id}>
                        {level.name || level.code}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selection.schoolGradeId}
                    onChange={(event) => handleGradeChange(event.target.value)}
                    disabled={isPending || !selection.gradeLevelId}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 disabled:bg-slate-50"
                  >
                    <option value="">
                      {selection.gradeLevelId ? '-- Niên khóa --' : '-- Chọn Khối trước --'}
                    </option>
                    {grades?.map((grade) => (
                      <option key={grade.id} value={grade.id}>
                        {grade.code || grade.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selection.schoolClassId}
                    onChange={(event) => onChange({ ...selection, schoolClassId: event.target.value })}
                    disabled={isPending || !selection.schoolGradeId}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 disabled:bg-slate-50"
                  >
                    <option value="">
                      {selection.schoolGradeId ? '-- Lớp --' : '-- Chọn Niên khóa trước --'}
                    </option>
                    {classes.map((schoolClass) => (
                      <option key={schoolClass.id} value={schoolClass.id}>
                        {schoolClass.code || schoolClass.name}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Chỉ nhận ĐÚNG MỘT cấp — chọn cấp hẹp nhất muốn áp dụng. Hai chính sách không được
                  trùng phạm vi.
                </p>
              </>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">
                Hiệu lực từ <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={selection.effectiveFrom}
                onChange={(event) => onChange({ ...selection, effectiveFrom: event.target.value })}
                disabled={isPending}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 disabled:bg-slate-50"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Hiệu lực đến</label>
              <input
                type="date"
                value={selection.effectiveTo}
                onChange={(event) => onChange({ ...selection, effectiveTo: event.target.value })}
                disabled={isPending}
                min={selection.effectiveFrom || undefined}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 disabled:bg-slate-50"
              />
              <p className="mt-1 text-xs text-slate-500">Bỏ trống = không giới hạn.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
