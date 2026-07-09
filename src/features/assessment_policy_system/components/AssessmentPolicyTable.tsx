// src/features/assessment_policy_system/components/AssessmentPolicyTable.tsx

import { Eye, LayoutList, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { ActionMenuButton } from '@/shared/ui/ActionMenuButton';
import { DetailPopoverButton } from './DetailPopoverButton';
import { formatAssessmentPolicyDate } from '../types';
import type { AssessmentPolicy } from '../types';

type AssessmentPolicyTableProps = {
  policies: AssessmentPolicy[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onViewDetails: (policy: AssessmentPolicy) => void;
  onEdit: (policy: AssessmentPolicy) => void;
  onDelete: (policy: AssessmentPolicy) => void;
};

const strictnessLabels: Record<string, string> = {
  LENIENT: 'Lỏng',
  STANDARD: 'Chuẩn',
  STRICT: 'Chặt',
};

const statusStyles: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600 ring-slate-500/10',
  PUBLISHED: 'bg-emerald-50 text-emerald-700 ring-emerald-700/10',
  ARCHIVED: 'bg-amber-50 text-amber-700 ring-amber-700/10',
};

function PopoverInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

export function AssessmentPolicyTable({
  policies,
  isLoading,
  isError,
  onRetry,
  onViewDetails,
  onEdit,
  onDelete,
}: AssessmentPolicyTableProps) {
  if (isLoading) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-3">
        <RefreshCw className="size-6 animate-spin text-cyan-600" />
        <p className="text-sm text-slate-500">Đang tải danh sách Assessment Policy...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm font-semibold text-red-600">Đã có lỗi xảy ra khi tải dữ liệu.</p>
        <button onClick={onRetry} className="text-sm font-bold text-cyan-600 underline">Thử lại</button>
      </div>
    );
  }

  if (policies.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-3 text-slate-500">
        <LayoutList className="size-8 text-slate-300" />
        <p className="text-sm">Không tìm thấy Assessment Policy nào.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-700">
        <thead className="bg-slate-50/75 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
          <tr>
            <th className="px-4 py-3">Ngôn ngữ</th>
            <th className="px-4 py-3">Framework Version</th>
            <th className="px-4 py-3">Rubric Version</th>
            <th className="px-4 py-3">Target Band</th>
            <th className="px-4 py-3">Minimum Band</th>
            <th className="px-4 py-3">Điểm đạt</th>
            <th className="px-4 py-3">Độ nghiêm ngặt</th>
            <th className="px-4 py-3">Hiệu lực</th>
            <th className="px-4 py-3">Trạng thái</th>
            <th className="px-4 py-3 text-right">Hành động</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {policies.map((policy) => (
            <tr
              key={policy.id}
              onClick={() => onViewDetails(policy)}
              className="group cursor-pointer transition hover:bg-cyan-50/40"
            >
              <td className="px-4 py-3 font-medium text-slate-900 group-hover:text-cyan-700">{policy.language?.name || '—'}</td>
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                {policy.frameworkVersion ? (
                  <DetailPopoverButton
                    ariaLabel={`Chi tiết framework version của policy ${policy.id}`}
                    badgeClassName="bg-blue-50 text-blue-700 ring-blue-700/10 hover:bg-blue-100"
                    label={`${policy.frameworkVersion.code} (v${policy.frameworkVersion.version})`}
                  >
                    <PopoverInfoRow label="Mã" value={policy.frameworkVersion.code} />
                    <PopoverInfoRow label="Tên" value={policy.frameworkVersion.name} />
                    <PopoverInfoRow label="Version" value={`v${policy.frameworkVersion.version}`} />
                    <PopoverInfoRow label="Trạng thái" value={policy.frameworkVersion.status || '—'} />
                    <PopoverInfoRow
                      label="Hiệu lực"
                      value={`${formatAssessmentPolicyDate(policy.frameworkVersion.effectiveFrom)} – ${formatAssessmentPolicyDate(policy.frameworkVersion.effectiveTo)}`}
                    />
                  </DetailPopoverButton>
                ) : (
                  '—'
                )}
              </td>
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                {policy.rubricVersion ? (
                  <DetailPopoverButton
                    ariaLabel={`Chi tiết rubric version của policy ${policy.id}`}
                    badgeClassName="bg-purple-50 text-purple-700 ring-purple-700/10 hover:bg-purple-100"
                    label={`${policy.rubricVersion.code} (v${policy.rubricVersion.version})`}
                  >
                    <PopoverInfoRow label="Mã" value={policy.rubricVersion.code} />
                    <PopoverInfoRow label="Tên" value={policy.rubricVersion.name} />
                    <PopoverInfoRow label="Version" value={`v${policy.rubricVersion.version}`} />
                    <PopoverInfoRow label="Trạng thái" value={policy.rubricVersion.status || '—'} />
                    <PopoverInfoRow
                      label="Hiệu lực"
                      value={`${formatAssessmentPolicyDate(policy.rubricVersion.effectiveFrom)} – ${formatAssessmentPolicyDate(policy.rubricVersion.effectiveTo)}`}
                    />
                  </DetailPopoverButton>
                ) : (
                  '—'
                )}
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                  {policy.targetFrameworkBand?.label || '—'}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10">
                  {policy.minimumFrameworkBand?.label || '—'}
                </span>
              </td>
              <td className="px-4 py-3">{policy.passingScore ?? '—'}</td>
              <td className="px-4 py-3">{strictnessLabels[policy.strictness] || policy.strictness}</td>
              <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                {formatAssessmentPolicyDate(policy.effectiveFrom)} – {formatAssessmentPolicyDate(policy.effectiveTo)}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                    statusStyles[policy.status] || 'bg-slate-100 text-slate-600 ring-slate-500/10'
                  }`}
                >
                  {policy.status}
                </span>
              </td>
              <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-end">
                  <ActionMenuButton
                    ariaLabel={`Hành động cho assessment policy ${policy.id}`}
                    items={[
                      { id: 'view', label: 'Xem chi tiết', icon: Eye, onSelect: () => onViewDetails(policy) },
                      { id: 'edit', label: 'Chỉnh sửa', icon: Pencil, onSelect: () => onEdit(policy) },
                      {
                        id: 'delete',
                        label: 'Xóa',
                        icon: Trash2,
                        tone: 'danger',
                        onSelect: () => onDelete(policy),
                        disabled: policy.status !== 'DRAFT',
                        disabledReason: 'Chỉ có thể xóa Policy đang ở trạng thái DRAFT',
                      },
                    ]}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
