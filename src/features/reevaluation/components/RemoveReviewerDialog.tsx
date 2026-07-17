import { TriangleAlert } from 'lucide-react'

type RemoveReviewerDialogProps = {
  reviewerName: string
  isPending?: boolean
  onCancel: () => void
  onConfirm: () => void
}

/**
 * Modal xác nhận gỡ giám khảo khỏi đơn đang chấm lại.
 * Gỡ giữa chừng KHÔNG thể hoàn tác (không thêm lại giám khảo khi đang GRADING), nên cần xác nhận.
 */
export function RemoveReviewerDialog({
  reviewerName,
  isPending,
  onCancel,
  onConfirm,
}: RemoveReviewerDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-5">
      <div
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        role="dialog"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex size-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <TriangleAlert className="size-6" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Gỡ giám khảo</h2>
            <p className="mt-0.5 text-[12.5px] font-medium text-slate-500">
              Không thể thêm lại giám khảo khi đơn đang chấm lại.
            </p>
          </div>
        </div>
        <p className="mt-4.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-[13.5px] leading-relaxed text-slate-700">
          Gỡ <b className="text-slate-900">{reviewerName}</b> khỏi đơn phúc khảo này? Chỉ gỡ được
          giám khảo <b>chưa nộp</b> báo cáo.
        </p>
        <div className="mt-5 flex gap-2.5">
          <button
            className="h-11 flex-1 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            onClick={onCancel}
            type="button"
          >
            Hủy
          </button>
          <button
            className="h-11 flex-1 rounded-lg bg-red-600 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
            disabled={isPending}
            onClick={onConfirm}
            type="button"
          >
            Gỡ giám khảo
          </button>
        </div>
      </div>
    </div>
  )
}
