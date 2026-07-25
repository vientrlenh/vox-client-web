// src/features/assessment_policy_school/components/RubricVersionPoliciesDialog.tsx

import { Loader2, Lock, Rocket, X } from 'lucide-react';
import { useSchoolAssessmentPoliciesQuery } from '../api/useSchoolAssessmentPoliciesQuery';
import { usePublishSchoolAssessmentPoliciesByRubricVersionMutation } from '../api/usePublishSchoolAssessmentPoliciesByRubricVersionMutation';
import { usePublishSchoolRubricVersionMutation } from '../api/usePublishSchoolRubricVersionMutation';
import { formatAssessmentPolicyDate } from '../types';

type RubricVersionSummary = {
  code: string;
  name: string;
  version: number;
  status?: string;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  schoolId?: string;
  rubricVersionId?: string;
  rubricVersion?: RubricVersionSummary | null;
};

const statusStyles: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600 ring-slate-500/10',
  PUBLISHED: 'bg-emerald-50 text-emerald-700 ring-emerald-700/10',
  ARCHIVED: 'bg-amber-50 text-amber-700 ring-amber-700/10',
};

const strictnessLabels: Record<string, string> = {
  LENIENT: 'Lỏng',
  STANDARD: 'Chuẩn',
  STRICT: 'Chặt',
};

function InfoField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <div className="mt-1 text-sm font-medium text-slate-900">{children}</div>
    </div>
  );
}

export function RubricVersionPoliciesDialog({ isOpen, onClose, schoolId, rubricVersionId, rubricVersion }: Props) {
  const filter = { rubricVersionId };
  const { data, isLoading, isError, refetch } = useSchoolAssessmentPoliciesQuery(schoolId, filter, 1, 100);
  const { mutateAsync: publishAll, isPending: isPublishingAll } = usePublishSchoolAssessmentPoliciesByRubricVersionMutation(schoolId);
  const { mutateAsync: publishRubricVersion, isPending: isPublishingRubricVersion } = usePublishSchoolRubricVersionMutation(schoolId);

  if (!isOpen) return null;

  const policies = data?.content ?? [];
  const draftCount = policies.filter((policy) => policy.status === 'DRAFT').length;
  const canPublishRubricVersion = draftCount === 0;

  const handlePublishAll = async () => {
    if (!rubricVersionId) return;

    const isConfirm = window.confirm(
      `Xuất bản hàng loạt ${draftCount} Assessment Policy đang DRAFT liên kết với Rubric Version này? Sau khi xuất bản, các Policy sẽ có hiệu lực áp dụng.`
    );
    if (!isConfirm) return;

    try {
      const publishedIds = await publishAll(rubricVersionId);
      alert(`Đã xuất bản thành công ${publishedIds.length} Assessment Policy.`);
    } catch (error) {
      const err = error as Error;
      alert(err.message || 'Có lỗi xảy ra khi xuất bản hàng loạt Assessment Policy.');
    }
  };

  const handlePublishRubricVersion = async () => {
    if (!rubricVersionId) return;

    const isConfirm = window.confirm(
      'Bạn có chắc chắn muốn chuyển Rubric Version này sang PUBLISHED? Sau khi Published, phiên bản sẽ được áp dụng chính thức.'
    );
    if (!isConfirm) return;

    try {
      await publishRubricVersion(rubricVersionId);
    } catch (error) {
      const err = error as Error;
      alert(err.message || 'Có lỗi xảy ra khi cập nhật Rubric Version.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-3xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Chi tiết Rubric Version</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="size-5" />
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto p-6">
          {rubricVersion && (
            <div className="rounded-[10px] bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <InfoField label="Mã">{rubricVersion.code}</InfoField>
                <InfoField label="Tên">{rubricVersion.name}</InfoField>
                <InfoField label="Version">v{rubricVersion.version}</InfoField>
                <InfoField label="Trạng thái">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      statusStyles[rubricVersion.status || ''] || 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {rubricVersion.status || '—'}
                  </span>
                </InfoField>
              </div>
              <div className="mt-4">
                <InfoField label="Hiệu lực">
                  {formatAssessmentPolicyDate(rubricVersion.effectiveFrom)} – {formatAssessmentPolicyDate(rubricVersion.effectiveTo)}
                </InfoField>
              </div>

              {rubricVersion.status === 'DRAFT' && (
                <div className="mt-4 flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    {!canPublishRubricVersion && <Lock className="size-3.5 shrink-0" />}
                    {canPublishRubricVersion
                      ? 'Đã sẵn sàng — không còn Assessment Policy nào ở trạng thái DRAFT.'
                      : `Bị khóa cho đến khi xuất bản hết ${draftCount} Assessment Policy DRAFT bên dưới.`}
                  </p>
                  <button
                    type="button"
                    onClick={handlePublishRubricVersion}
                    disabled={!canPublishRubricVersion || isPublishingRubricVersion}
                    className="inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-5 text-sm font-medium text-emerald-600 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    {isPublishingRubricVersion ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
                    Cập nhật sang PUBLISHED
                  </button>
                </div>
              )}
            </div>
          )}

          <h3 className="mt-6 text-sm font-bold uppercase tracking-wider text-slate-500">
            Assessment Policy liên kết ({data?.totalElements ?? 0})
          </h3>

          <div className="mt-3 overflow-hidden rounded-[10px] border border-slate-200">
            {isLoading ? (
              <div className="flex h-32 flex-col items-center justify-center gap-2">
                <Loader2 className="size-6 animate-spin text-cyan-600" />
                <p className="text-sm text-slate-500">Đang tải danh sách Assessment Policy...</p>
              </div>
            ) : isError ? (
              <div className="flex h-32 flex-col items-center justify-center gap-2 text-center">
                <p className="text-sm font-semibold text-red-600">Đã có lỗi xảy ra khi tải dữ liệu.</p>
                <button onClick={() => refetch()} className="text-sm font-bold text-cyan-600 underline">Thử lại</button>
              </div>
            ) : policies.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-slate-500">
                Chưa có Assessment Policy nào liên kết với Rubric Version này.
              </div>
            ) : (
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50/75 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Ngôn ngữ</th>
                    <th className="px-4 py-3">Target Band</th>
                    <th className="px-4 py-3">Điểm đạt</th>
                    <th className="px-4 py-3">Độ nghiêm ngặt</th>
                    <th className="px-4 py-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {policies.map((policy) => (
                    <tr key={policy.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{policy.language?.name || '—'}</td>
                      <td className="px-4 py-3">{policy.targetFrameworkBand?.label || '—'}</td>
                      <td className="px-4 py-3">{policy.passingScore ?? '—'}</td>
                      <td className="px-4 py-3">{strictnessLabels[policy.strictness] || policy.strictness}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                            statusStyles[policy.status] || 'bg-slate-100 text-slate-600 ring-slate-500/10'
                          }`}
                        >
                          {policy.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {draftCount > 0 && (
            <div className="mt-4 flex justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={handlePublishAll}
                disabled={isPublishingAll}
                className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-5 text-sm font-medium text-emerald-600 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPublishingAll ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
                Xuất bản hàng loạt ({draftCount} DRAFT)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
