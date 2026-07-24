import { Flag, MailCheck } from 'lucide-react'
import { formatScore } from '../types'

type SubmitGradingDialogProps = {
  flagged: boolean
  isPending?: boolean
  onCancel: () => void
  onConfirm: () => void
  partCount: number
  resultBandName?: string | null
  resultCode: string
  totalScore?: number | null
}

/**
 * Xác nhận nộp điểm. Nộp LÀ CHỐT — không có bước admin duyệt, không sửa lại được.
 *
 * <p>Với bài đang bị đánh dấu nghi vấn, đây cũng chính là lúc cờ được gỡ: nếu
 * giáo viên bỏ đi giữa chừng thì bài vẫn còn cờ.
 */
export function SubmitGradingDialog({
  flagged,
  isPending,
  onCancel,
  onConfirm,
  partCount,
  resultBandName,
  resultCode,
  totalScore,
}: SubmitGradingDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-5">
      <div
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        role="dialog"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <MailCheck className="size-6" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Nộp điểm &amp; chốt kết quả</h2>
            <p className="mt-0.5 text-[12.5px] font-medium text-slate-500">
              Bài <b className="text-slate-700">#{resultCode}</b> · {partCount} phần thi
            </p>
          </div>
        </div>

        <div className="mt-4.5 rounded-2xl border border-emerald-200 bg-linear-to-r from-emerald-50 to-white px-5 py-4 text-center">
          <div className="text-[11.5px] font-bold text-emerald-700">ĐIỂM TỔNG CẢ BÀI</div>
          <div className="text-4xl font-extrabold leading-tight text-emerald-600">
            {formatScore(totalScore)}
          </div>
          {resultBandName ? (
            <div className="text-[12px] font-bold text-emerald-700/80">{resultBandName}</div>
          ) : null}
          <div className="mt-1 text-[11px] font-medium text-slate-400">
            Hệ thống tính từ điểm tiêu chí bạn nhập
          </div>
        </div>

        {flagged ? (
          <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <Flag className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <span className="text-[12.5px] font-medium leading-relaxed text-amber-800">
              Bài này đang bị đánh dấu nghi vấn. Nộp điểm đồng nghĩa bạn xác nhận{' '}
              <b>không có vi phạm</b> — cờ sẽ được gỡ và kết quả được công bố.
            </span>
          </div>
        ) : null}

        <p className="mt-3 text-center text-[12px] font-medium leading-snug text-slate-400">
          Nộp là chốt — không sửa lại được sau khi nộp.
        </p>

        <div className="mt-5 flex gap-2.5">
          <button
            className="h-11 flex-1 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            onClick={onCancel}
            type="button"
          >
            Xem lại
          </button>
          <button
            className="h-11 flex-1 rounded-lg bg-emerald-600 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            disabled={isPending}
            onClick={onConfirm}
            type="button"
          >
            Nộp điểm
          </button>
        </div>
      </div>
    </div>
  )
}
