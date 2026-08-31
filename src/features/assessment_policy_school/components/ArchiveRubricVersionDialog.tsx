// src/features/assessment_policy_school/components/ArchiveRubricVersionDialog.tsx

import { useState } from 'react';
import { Archive, X } from 'lucide-react';
import { ErrorBanner } from '@/shared/ui/ErrorBanner';
import { publishStatusLabel } from '@/shared/lib/publishStatusLabel';
import { useSchoolAssessmentPoliciesQuery } from '../api/useSchoolAssessmentPoliciesQuery';
import { useArchiveSchoolAssessmentPolicyMutation } from '../api/useArchiveSchoolAssessmentPolicyMutation';
import { useArchiveSchoolRubricVersionMutation } from '@/features/rubrics_school/api/useArchiveSchoolRubricVersionMutation';

type ArchiveRubricVersionDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string | undefined;
  rubricVersionId: string | undefined;
  rubricVersionLabel: string;
  /** Gọi sau khi lưu trữ thành công, để trang cha refetch lại trạng thái Version. */
  onArchived?: () => void;
  /** Điều hướng sang màn Chính Sách Đánh Giá -- dùng khi bị chặn bởi policy DRAFT, để người dùng
   * tự xử lý (xuất bản rồi lưu trữ, hoặc xoá) chứ dialog này không tự làm được thay. */
  onViewLinkedPolicies: () => void;
};

const statusStyles: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  PUBLISHED: 'bg-emerald-50 text-emerald-700',
  ARCHIVED: 'bg-amber-50 text-amber-700',
};

// Message riêng của ArchiveSchoolRubricVersionUseCase khi version đã bị cascade-archive từ trước
// (archive nốt policy active cuối cùng tự archive luôn version, xem ArchiveSchoolAssessmentPolicyUseCase)
// -- lúc đó gọi archiveVersion() lần nữa chỉ để chắc ăn sẽ ăn đúng lỗi này, không phải lỗi thật.
const ALREADY_ARCHIVED_MESSAGE = 'Chỉ có thể lưu trữ (ARCHIVE) phiên bản đang ở trạng thái PUBLISHED.';

/**
 * Lưu trữ Rubric Version từ chính trang Version — mirror PublishRubricVersionDialog nhưng ngược
 * hướng. Khác Publish (chỉ 1 loại chặn: policy DRAFT cần publish trước, chính là hành động bundle),
 * Archive có 2 loại policy liên kết: PUBLISHED archive được luôn (bundle "Lưu trữ tất cả + Phiên
 * bản"), DRAFT thì BE từ chối thẳng -- không bundle được, chỉ chặn và trỏ người dùng sang màn
 * Chính Sách Đánh Giá để tự xử lý.
 */
export function ArchiveRubricVersionDialog({
  isOpen,
  onClose,
  schoolId,
  rubricVersionId,
  rubricVersionLabel,
  onArchived,
  onViewLinkedPolicies,
}: ArchiveRubricVersionDialogProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data, isLoading } = useSchoolAssessmentPoliciesQuery(
    isOpen && rubricVersionId ? schoolId : undefined,
    { rubricVersionId: rubricVersionId ?? null },
    1,
    100,
  );
  const policies = data?.content ?? [];
  const publishedPolicies = policies.filter((policy) => policy.status === 'PUBLISHED');
  const draftPolicies = policies.filter((policy) => policy.status === 'DRAFT');
  const isBlockedByDraft = draftPolicies.length > 0;

  const { mutateAsync: archivePolicy, isPending: isArchivingPolicies } =
    useArchiveSchoolAssessmentPolicyMutation(schoolId);
  const { mutateAsync: archiveVersion, isPending: isArchivingVersion } =
    useArchiveSchoolRubricVersionMutation(schoolId, rubricVersionId);
  const isPending = isArchivingPolicies || isArchivingVersion;

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!rubricVersionId || isBlockedByDraft) return;
    setErrorMessage(null);

    const archivedPolicyCount = publishedPolicies.length;

    // Archive từng policy PUBLISHED trước, tuần tự -- không có endpoint archive-hàng-loạt như
    // publish-all nên gọi lặp API đơn lẻ đã có sẵn.
    for (const policy of publishedPolicies) {
      try {
        await archivePolicy(policy.id);
      } catch (error) {
        const err = error as Error;
        setErrorMessage(err.message || 'Có lỗi xảy ra khi lưu trữ Chính Sách Đánh Giá.');
        onArchived?.();
        return;
      }
    }

    try {
      await archiveVersion();
    } catch (error) {
      const err = error as Error;
      // BE đã tự cascade-archive Version khi vừa archive xong policy active cuối cùng ở trên --
      // lỗi này nghĩa là version đã ARCHIVED thật, không phải thao tác thất bại.
      if (err.message !== ALREADY_ARCHIVED_MESSAGE) {
        const prefix =
          archivedPolicyCount > 0
            ? `Đã lưu trữ thành công ${archivedPolicyCount} Chính Sách Đánh Giá liên kết. Riêng Rubric Version thì `
            : 'Không thể lưu trữ Rubric Version: ';
        setErrorMessage(`${prefix}${err.message || 'có lỗi xảy ra.'}`);
        onArchived?.();
        return;
      }
    }

    onArchived?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={!isPending ? onClose : undefined} />

      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-black text-blue-950">Lưu trữ Rubric Version</h2>
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
              {isBlockedByDraft
                ? `Còn ${draftPolicies.length} Chính Sách Đánh Giá đang DRAFT dùng phiên bản này -- không thể lưu trữ tới khi các chính sách này được xuất bản rồi lưu trữ, hoặc bị xoá.`
                : publishedPolicies.length > 0
                  ? `${publishedPolicies.length} Chính Sách Đánh Giá đang PUBLISHED sẽ được lưu trữ cùng lúc với Rubric Version này.`
                  : 'Không có Chính Sách Đánh Giá nào đang dùng -- chỉ Rubric Version sẽ được lưu trữ.'}
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
            {isBlockedByDraft ? 'Đóng' : 'Hủy bỏ'}
          </button>
          {isBlockedByDraft ? (
            <button
              type="button"
              onClick={onViewLinkedPolicies}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700"
            >
              Xem Chính Sách Đánh Giá
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={isPending || isLoading}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              <Archive className="size-4" />
              {isPending
                ? 'Đang lưu trữ...'
                : publishedPolicies.length > 0
                  ? 'Lưu trữ tất cả + Phiên bản'
                  : 'Lưu trữ'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
