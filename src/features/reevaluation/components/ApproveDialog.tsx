import { useState } from 'react'
import { CalendarClock, CircleCheck } from 'lucide-react'

type ApproveDialogProps = {
  onCancel: () => void
  onConfirm: (deadlineIso: string) => void
  isPending?: boolean
}

/** Giá trị mặc định cho input datetime-local: 3 ngày tới, 17:00. */
function defaultDeadline(): string {
  const date = new Date()
  date.setDate(date.getDate() + 3)
  date.setHours(17, 0, 0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Modal duyệt đơn — bắt buộc nhập hạn xử lý (phải ở tương lai). */
export function ApproveDialog({ onCancel, onConfirm, isPending }: ApproveDialogProps) {
  const [deadline, setDeadline] = useState(defaultDeadline)
  const [now] = useState(() => Date.now())
  const isFuture = deadline !== '' && new Date(deadline).getTime() > now

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-5">
      <div
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        role="dialog"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CircleCheck className="size-6" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Duyệt đơn phúc khảo</h2>
            <p className="mt-0.5 text-[12.5px] font-medium text-slate-500">
              Đặt hạn để giám khảo hoàn thành chấm lại.
            </p>
          </div>
        </div>
        <label className="mt-4.5 block text-[12.5px] font-bold text-slate-700">
          Hạn xử lý
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 focus-within:border-cyan-400">
            <CalendarClock className="size-4.5 shrink-0 text-slate-400" />
            <input
              className="h-11 flex-1 bg-transparent text-[13.5px] font-semibold text-slate-700 outline-none"
              onChange={(event) => setDeadline(event.target.value)}
              type="datetime-local"
              value={deadline}
            />
          </div>
        </label>
        {deadline !== '' && !isFuture ? (
          <p className="mt-2 text-[12px] font-semibold text-red-600">Hạn xử lý phải ở tương lai.</p>
        ) : null}
        <div className="mt-5 flex gap-2.5">
          <button
            className="h-11 flex-1 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            onClick={onCancel}
            type="button"
          >
            Hủy
          </button>
          <button
            className="h-11 flex-1 rounded-lg bg-emerald-600 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            disabled={!isFuture || isPending}
            onClick={() => onConfirm(new Date(deadline).toISOString())}
            type="button"
          >
            Duyệt &amp; phân công
          </button>
        </div>
      </div>
    </div>
  )
}
