// src/features/assessment_policy_school/components/PublishRubricVersionDialog.tsx

import { useState } from 'react';
import { Rocket, X } from 'lucide-react';
import { ErrorBanner } from '@/shared/ui/ErrorBanner';
import { publishStatusLabel } from '@/shared/lib/publishStatusLabel';
import { useSchoolAssessmentPoliciesQuery } from '../api/useSchoolAssessmentPoliciesQuery';
import { usePublishSchoolAssessmentPoliciesByRubricVersionMutation } from '../api/usePublishSchoolAssessmentPoliciesByRubricVersionMutation';
import { usePublishSchoolRubricVersionMutation } from '../api/usePublishSchoolRubricVersionMutation';

type PublishRubricVersionDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string | undefined;
  rubricVersionId: string | undefined;
  rubricVersionLabel: string;
  /** Gọi sau khi xuất bản thành công, để trang cha refetch lại trạng thái Version. */
  onPublished?: () => void;
};

const statusStyles: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  PUBLISHED: 'bg-emerald-50 text-emerald-700',
  ARCHIVED: 'bg-amber-50 text-amber-700',
};

/**
 * Xuất bản Rubric Version từ chính trang Version — gộp trong một bước với việc xuất bản mọi
 * Chính Sách Đánh Giá (DRAFT) đang gắn với nó, thay vì phải xuất bản rời rạc từng nơi. Danh sách
 * policy hiện ra trước để người dùng biết chính xác cái gì sẽ có hiệu lực cùng lúc.
 */
export function PublishRubricVersionDialog({
  isOpen,
  onClose,
  schoolId,
  rubricVersionId,
  rubricVersionLabel,
  onPublished,
}: PublishRubricVersionDialogProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data, isLoading } = useSchoolAssessmentPoliciesQuery(
    isOpen && rubricVersionId ? schoolId : undefined,
    { rubricVersionId: rubricVersionId ?? null },
    1,
    100,
  );
  const policies = data?.content ?? [];
  const draftPolicies = policies.filter((policy) => policy.status === 'DRAFT');

  const { mutateAsync: publishPolicies, isPending: isPublishingPolicies } =
    usePublishSchoolAssessmentPoliciesByRubricVersionMutation(schoolId);
  const { mutateAsync: publishVersion, isPending: isPublishingVersion } =
    usePublishSchoolRubricVersionMutation(schoolId);
  const isPending = isPublishingPolicies || isPublishingVersion;

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!rubricVersionId) return;
    setErrorMessage(null);

    // Phải publish policy DRAFT trước, rồi mới tới Version: BE (ChangeSchoolRubricVersionStatusUseCase)
    // chặn publish Version nếu chưa có policy nào liên kết đang PUBLISHED. Nhưng hai bước là hai
    // transaction REST riêng biệt, KHÔNG rollback được lẫn nhau -- nếu bước publish policy xong
    // xuôi mà bước publish Version fail (vd. lỗi trọng số tiêu chí), policy vẫn PUBLISHED thật sự
    // trong DB dù cả thao tác báo lỗi. Phải tách try/catch riêng để biết chính xác bước nào fail
    // và nói rõ cho người dùng, thay vì để một lỗi chung chung khiến họ tưởng không có gì xảy ra.
    const publishedPolicyCount = draftPolicies.length;

    if (publishedPolicyCount > 0) {
      try {
        await publishPolicies(rubricVersionId);
      } catch (error) {
        const err = error as Error;
        setErrorMessage(err.message || 'Có lỗi xảy ra khi xuất bản Chính Sách Đánh Giá.');
        return;
      }
    }

    try {
      await publishVersion(rubricVersionId);
    } catch (error) {
      const err = error as Error;
      const prefix =
        publishedPolicyCount > 0
          ? `Đã xuất bản thành công ${publishedPolicyCount} Chính Sách Đánh Giá liên kết. Riêng Rubric Version thì `
          : 'Không thể xuất bản Rubric Version: ';
      setErrorMessage(`${prefix}${err.message || 'có lỗi xảy ra.'}`);
      // Bước publish policy (nếu có) đã thành công thật -- refetch để danh sách trong dialog và
      // trang cha khớp với DB, không để hiện DRAFT giả trong khi thật ra đã PUBLISHED.
      onPublished?.();
      return;
    }

    onPublished?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={!isPending ? onClose : undefined} />

      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-black text-blue-950">Xuất bản Rubric Version</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-50"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6">
          <ErrorBanner className="mb-5" message={errorMessage} />

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Rubric Version</p>
            <p className="mt-1 text-sm font-black text-blue-950">{rubricVersionLabel}</p>
          </div>

          <div className="mt-5">
            <p className="text-sm font-bold text-slate-700">
              Chính Sách Đánh Giá liên kết ({policies.length})
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {draftPolicies.length > 0
                ? `${draftPolicies.length} Chính Sách Đánh Giá đang DRAFT sẽ được xuất bản cùng lúc với Rubric Version này.`
                : 'Không có Chính Sách Đánh Giá nào đang DRAFT -- chỉ Rubric Version sẽ được xuất bản.'}
            </p>

            {isLoading ? (
              <p className="mt-3 text-sm text-slate-400">Đang tải danh sách...</p>
            ) : policies.length === 0 ? (
              <p className="mt-3 rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-400">
                Chưa có Chính Sách Đánh Giá nào gắn với Rubric Version này.
              </p>
            ) : (
              <div className="mt-3 grid gap-2">
                {policies.map((policy) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2.5"
                    key={policy.id}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {policy.language?.name || '—'} · {policy.targetFrameworkBand?.label || '—'}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {policy.school?.name || 'Toàn trường'}
                      </p>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-md px-2 py-1 text-xs font-medium ${
                        statusStyles[policy.status] || 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {publishStatusLabel(policy.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={isPending}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            <Rocket className="size-4" />
            {isPending ? 'Đang xuất bản...' : 'Xuất bản'}
          </button>
        </div>
      </div>
    </div>
  );
}
