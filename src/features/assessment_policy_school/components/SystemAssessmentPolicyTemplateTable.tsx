// src/features/assessment_policy_school/components/SystemAssessmentPolicyTemplateTable.tsx

import { ClipboardCheck, Copy, RefreshCw } from 'lucide-react';
import type { SystemAssessmentPolicyTemplate } from '../api/useSystemAssessmentPolicyTemplatesQuery';

type SystemAssessmentPolicyTemplateTableProps = {
  templates: SystemAssessmentPolicyTemplate[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onClone: (template: SystemAssessmentPolicyTemplate) => void;
};

const STRICTNESS_LABEL: Record<string, string> = {
  LENIENT: 'Lỏng',
  STANDARD: 'Chuẩn',
  STRICT: 'Chặt',
};

export function SystemAssessmentPolicyTemplateTable({
  templates,
  isLoading,
  isError,
  onRetry,
  onClone,
}: SystemAssessmentPolicyTemplateTableProps) {
  if (isLoading) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-3">
        <RefreshCw className="size-6 animate-spin text-indigo-600" />
        <p className="text-sm text-slate-500">Đang tải thư viện chính sách mẫu...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm font-semibold text-red-600">Đã có lỗi xảy ra khi tải dữ liệu.</p>
        <button
          type="button"
          onClick={onRetry}
          className="text-sm font-bold text-indigo-600 underline hover:text-indigo-700"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-3 text-slate-500">
        <ClipboardCheck className="size-8 text-slate-300" />
        <p className="text-sm">Chưa có chính sách chấm mẫu nào được ban hành.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-700">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-black text-blue-950">
          <tr>
            <th className="px-4 py-3">Phạm vi</th>
            <th className="px-4 py-3">Ngôn ngữ</th>
            <th className="px-4 py-3">Khung năng lực</th>
            <th className="px-4 py-3">Bậc mục tiêu</th>
            <th className="px-4 py-3">Bộ tiêu chí mẫu</th>
            <th className="px-4 py-3">Chấm điểm</th>
            <th className="px-4 py-3 text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {templates.map((template) => (
            <tr key={template.id} className="transition hover:bg-slate-50">
              <td className="px-4 py-3">
                {template.gradeLevel ? (
                  <span className="font-bold text-slate-900">
                    {template.gradeLevel.name || template.gradeLevel.code}
                  </span>
                ) : (
                  // Bản mẫu không khai Khối: trường sẽ phải tự chọn phạm vi lúc sao về.
                  <span className="text-slate-500">Mọi khối</span>
                )}
              </td>
              <td className="px-4 py-3">{template.language?.name ?? '-'}</td>
              <td className="px-4 py-3">
                <span className="font-medium text-slate-900">
                  {template.frameworkVersion?.name ?? '-'}
                </span>
                {template.frameworkVersion && (
                  <span className="ml-1.5 text-xs text-slate-500">
                    v{template.frameworkVersion.version}
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                {template.targetFrameworkBand ? (
                  <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                    {template.targetFrameworkBand.label}
                  </span>
                ) : (
                  '-'
                )}
              </td>
              <td className="px-4 py-3">
                <span className="font-medium text-slate-900">
                  {template.rubricVersion?.name ?? '-'}
                </span>
                {template.rubricVersion && (
                  <span className="block font-mono text-xs text-slate-500">
                    {template.rubricVersion.code}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-xs leading-5 text-slate-600">
                <span className="block">
                  Độ chặt: {STRICTNESS_LABEL[template.strictness] ?? template.strictness}
                </span>
                <span className="block">
                  Điểm đạt:{' '}
                  {template.passingScore == null ? (
                    <span className="text-slate-400">không đặt</span>
                  ) : (
                    <span className="tabular-nums">{template.passingScore}</span>
                  )}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  type="button"
                  onClick={() => onClone(template)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100"
                >
                  <Copy className="size-3.5" /> Sao về trường
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
