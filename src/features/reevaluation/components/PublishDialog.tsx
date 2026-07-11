import { ArrowRight, BellRing, Mail } from 'lucide-react'
import { formatScore } from '../types'

type PublishDialogProps = {
  code: string
  student: string
  original: number
  finalScore: number
  onCancel: () => void
  onConfirm: () => void
}

/** Modal xác nhận công bố kết quả phúc khảo. */
export function PublishDialog({
  code,
  student,
  original,
  finalScore,
  onCancel,
  onConfirm,
}: PublishDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-5">
      <div
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        role="dialog"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <BellRing className="size-6" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Công bố kết quả phúc khảo</h2>
            <p className="mt-0.5 text-[12.5px] font-medium text-slate-500">
              {student} · {code}
            </p>
          </div>
        </div>
        <div className="mt-4.5 flex items-center justify-center gap-4.5 rounded-xl bg-slate-50 p-4.5">
          <div className="text-center">
            <div className="text-[11px] font-bold text-slate-400">ĐIỂM GỐC</div>
            <div className="text-2xl font-extrabold text-slate-400 line-through">
              {formatScore(original)}
            </div>
          </div>
          <ArrowRight className="size-5 text-emerald-600" />
          <div className="text-center">
            <div className="text-[11px] font-bold text-emerald-600">CÔNG BỐ</div>
            <div className="text-[32px] font-extrabold leading-none text-emerald-600">
              {formatScore(finalScore)}
            </div>
          </div>
        </div>
        <div className="mt-3.5 flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-3">
          <Mail className="mt-0.5 size-4 shrink-0 text-blue-700" />
          <span className="text-xs font-medium leading-relaxed text-blue-700">
            Hệ thống sẽ gửi thông báo kết quả tới học sinh và cập nhật điểm chính thức.
          </span>
        </div>
        <div className="mt-5 flex gap-2.5">
          <button
            className="h-11 flex-1 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            onClick={onCancel}
            type="button"
          >
            Hủy
          </button>
          <button
            className="h-11 flex-1 rounded-lg bg-emerald-600 text-sm font-bold text-white transition hover:bg-emerald-700"
            onClick={onConfirm}
            type="button"
          >
            Xác nhận công bố
          </button>
        </div>
      </div>
    </div>
  )
}
