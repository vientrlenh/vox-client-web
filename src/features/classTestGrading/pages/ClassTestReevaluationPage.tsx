import { useState } from 'react'
import { useParams } from 'react-router'
import { Check, ShieldAlert, X } from 'lucide-react'
import { useAppSelector } from '@/app/store/hooks'
import { useExamQuery } from '@/features/examCore/api/queries'
import {
  APPEAL_SCOPE_TEXT,
  RejectDialog,
  getAppealStatusDisplay,
  useApproveAndClaimMutation,
  useAssignMutation,
  useRejectMutation,
  type AppealSummary,
} from '@/features/reevaluation'
import { ActionDialog, formatIsoDateTime, formatScore } from '@/features/grading'
import { toApiError } from '@/shared/api'
import { Pagination } from '@/shared/components/Pagination'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { useExamAppealsQuery } from '@/features/reevaluation'
import { ClaimAppealDialog } from '../components/ClaimAppealDialog'

const PAGE_SIZE = 20

/**
 * Đơn phúc khảo của MỘT bài kiểm tra trên lớp — do chính giáo viên tạo bài xử lý.
 *
 * Không có bước chọn giám khảo: bài trên lớp chỉ có một người chấm được, nên duyệt là
 * nhận chấm luôn (một endpoint, một transaction ở BE). Đơn sang thẳng màn chấm bài của
 * giáo viên ở vòng `APPEAL`, và ở đó phải chấm lại toàn bộ bài làm.
 */
export function ClassTestReevaluationPage() {
  const { examId = '' } = useParams()
  const currentUserId = useAppSelector((state) => state.auth.user?.userId)
  const [page, setPage] = useState(1)
  const [approveTarget, setApproveTarget] = useState<AppealSummary | null>(null)
  const [rejectTarget, setRejectTarget] = useState<AppealSummary | null>(null)
  const [claimTarget, setClaimTarget] = useState<AppealSummary | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const examQuery = useExamQuery(examId || null)
  const appealsQuery = useExamAppealsQuery(examId, page, PAGE_SIZE)
  const approveAndClaimMutation = useApproveAndClaimMutation()
  const rejectMutation = useRejectMutation()
  const assignMutation = useAssignMutation()

  const pageData = appealsQuery.data
  const appeals = pageData?.content ?? []

  function reportError(cause: unknown) {
    setError(toApiError(cause).message)
  }

  return (
    <section className="mx-auto grid max-w-300 gap-5">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-violet-700">Phúc khảo</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">
          {examQuery.data?.name ?? 'Bài kiểm tra trên lớp'}
        </h1>
        <p className="mt-1.5 text-xs font-medium text-slate-500">
          Bạn duyệt hoặc từ chối đơn của học sinh lớp mình. Duyệt là nhận chấm luôn — đơn sang thẳng
          màn chấm bài của bạn, và bạn chấm lại toàn bộ bài làm.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-200 text-left">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-2.5">Học sinh</th>
                <th className="px-4 py-2.5">Phạm vi</th>
                <th className="px-4 py-2.5 text-right">Điểm cũ</th>
                <th className="px-4 py-2.5">Trạng thái</th>
                <th className="px-4 py-2.5">Nộp lúc</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {appealsQuery.isLoading ? (
                <tr>
                  <td className="px-5 py-12 text-center text-[13px] text-slate-400" colSpan={6}>
                    Đang tải…
                  </td>
                </tr>
              ) : appeals.length === 0 ? (
                <tr>
                  <td className="px-5 py-12 text-center text-[13px] text-slate-400" colSpan={6}>
                    Chưa có đơn phúc khảo nào cho bài kiểm tra này.
                  </td>
                </tr>
              ) : (
                appeals.map((appeal) => {
                  const display = getAppealStatusDisplay(appeal.status)
                  return (
                    <tr
                      className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
                      key={appeal.id}
                    >
                      <td className="px-4 py-3">
                        <div className="text-[13px] font-bold text-slate-800">
                          {appeal.studentName}
                        </div>
                        {appeal.className ? (
                          <div className="text-[11px] font-medium text-slate-500">
                            Lớp {appeal.className}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-[13px] font-medium text-slate-600">
                        {APPEAL_SCOPE_TEXT}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-extrabold tabular-nums text-slate-900">
                        {formatScore(appeal.originalScore)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge label={display.label} tone={display.tone} />
                        {appeal.reviewerName ? (
                          <div className="mt-1 text-[11px] font-medium text-slate-500">
                            {appeal.reviewerName}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-[12px] font-medium text-slate-500">
                        {formatIsoDateTime(appeal.requestedAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {/* Luật trạng thái của BE: duyệt/từ chối chỉ ở PENDING, giao
                            người chấm chỉ ở APPROVED. Hiện nút sai trạng thái chỉ dẫn
                            tới một lỗi 4xx đọc không ra.

                            Nhánh APPROVED vẫn giữ nút "Nhận chấm" dù luồng mới không
                            còn đi qua đó: nó là cách duy nhất gỡ những đơn đã nằm ở
                            APPROVED từ trước khi deploy, và vẫn đúng khi quản trị
                            trường duyệt đơn bài trên lớp từ màn của họ. */}
                        {appeal.status === 'PENDING' ? (
                          <div className="flex justify-end gap-2">
                            <button
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white transition hover:bg-emerald-700"
                              onClick={() => setApproveTarget(appeal)}
                              type="button"
                            >
                              <Check className="size-4" />
                              Duyệt &amp; nhận chấm
                            </button>
                            <button
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 text-xs font-bold text-red-700 transition hover:bg-red-50"
                              onClick={() => setRejectTarget(appeal)}
                              type="button"
                            >
                              <X className="size-4" />
                              Từ chối
                            </button>
                          </div>
                        ) : appeal.status === 'APPROVED' ? (
                          <button
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-xs font-bold text-white transition hover:bg-violet-700"
                            onClick={() => setClaimTarget(appeal)}
                            type="button"
                          >
                            <ShieldAlert className="size-4" />
                            Nhận chấm
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-200 px-4 py-2.5">
          <Pagination
            currentPage={page}
            itemName="đơn"
            onPageChange={setPage}
            totalElements={pageData?.totalElements ?? 0}
            totalPages={pageData?.totalPages ?? 0}
          />
        </div>
      </div>

      {approveTarget ? (
        <ActionDialog
          confirmLabel="Duyệt & nhận chấm"
          icon={<Check className="size-5" />}
          isPending={approveAndClaimMutation.isPending}
          onCancel={() => setApproveTarget(null)}
          onConfirm={() =>
            approveAndClaimMutation.mutate(approveTarget.id, {
              onError: reportError,
              onSuccess: () => {
                setApproveTarget(null)
                setMessage('Đã duyệt và nhận chấm. Mở màn chấm bài để chấm lại toàn bài.')
              },
            })
          }
          subtitle={`Đơn của ${approveTarget.studentName}`}
          title="Duyệt & nhận chấm phúc khảo"
          tone="emerald"
        >
          <p className="mt-4 text-[13px] leading-relaxed text-slate-600">
            Đơn được duyệt và giao cho bạn chấm lại ngay, hạn xử lý mặc định 3 ngày.
          </p>
        </ActionDialog>
      ) : null}

      {rejectTarget ? (
        <RejectDialog
          onCancel={() => setRejectTarget(null)}
          onConfirm={(reason) =>
            rejectMutation.mutate(
              { id: rejectTarget.id, reason },
              {
                onError: reportError,
                onSuccess: () => {
                  setRejectTarget(null)
                  setMessage('Đã từ chối đơn phúc khảo.')
                },
              },
            )
          }
        />
      ) : null}

      {claimTarget && currentUserId ? (
        <ClaimAppealDialog
          isPending={assignMutation.isPending}
          onCancel={() => setClaimTarget(null)}
          onConfirm={(overrideReason) =>
            assignMutation.mutate(
              { id: claimTarget.id, overrideReason, reviewerId: currentUserId },
              {
                onError: reportError,
                onSuccess: () => {
                  setClaimTarget(null)
                  setMessage('Đã nhận chấm phúc khảo. Mở màn chấm bài để chấm lại.')
                },
              },
            )
          }
          studentName={claimTarget.studentName}
        />
      ) : null}

      <FeedbackToast message={message} onClose={() => setMessage(null)} tone="success" />
      <FeedbackToast message={error} onClose={() => setError(null)} tone="error" />
    </section>
  )
}
