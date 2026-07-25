import { useState } from 'react'
import { TriangleAlert } from 'lucide-react'

type RejectDialogProps = {
  onCancel: () => void
  onConfirm: (reason: string) => void
}

const DEFAULT_REASON = 'Không đủ căn cứ chênh lệch điểm'

/** Modal từ chối yêu cầu phúc khảo (kèm lý do). */
export function RejectDialog({ onCancel, onConfirm }: RejectDialogProps) {
  const [reason, setReason] = useState(DEFAULT_REASON)

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
            <h2 className="text-lg font-extrabold text-slate-900">Từ chối yêu cầu</h2>
            <p className="mt-0.5 text-[12.5px] font-medium text-slate-500">
              Học sinh sẽ nhận thông báo kèm lý do.
            </p>
          </div>
        </div>
        <label className="mt-4.5 block text-[12.5px] font-bold text-slate-700">
          Lý do từ chối
          <textarea
            className="mt-2 min-h-22 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-[13.5px] leading-relaxed text-slate-700 outline-none focus:border-cyan-400"
            onChange={(event) => setReason(event.target.value)}
            value={reason}
          />
        </label>
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
            disabled={!reason.trim()}
            onClick={() => onConfirm(reason.trim())}
            type="button"
          >
            Từ chối &amp; thông báo
          </button>
        </div>
      </div>
    </div>
  )
}
