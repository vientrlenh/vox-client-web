import { useState } from 'react'
import { X } from 'lucide-react'
import { formatVnd } from '../types'

type SetQuotaCapDialogProps = {
  currentPercent: number
  distributedVnd: number
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (percent: number) => void
  poolTotalVnd: number
  userLabel: string
}

const PRESETS = [50, 70, 80, 90, 100]

/**
 * Đặt trần phân phối: trường được chia ra tối đa bao nhiêu phần trăm ví hạn mức.
 *
 * <p>Chính sách thuộc về TRƯỜNG và sống xuyên qua mọi lần gia hạn, nên đặt một lần là xong -- không
 * phải đặt lại mỗi kỳ.
 */
export function SetQuotaCapDialog({
  currentPercent,
  distributedVnd,
  isSubmitting,
  onClose,
  onSubmit,
  poolTotalVnd,
  userLabel,
}: SetQuotaCapDialogProps) {
  const [percent, setPercent] = useState(currentPercent)

  const distributableVnd = Math.floor((poolTotalVnd * percent) / 100)
  const reserveVnd = poolTotalVnd - distributableVnd
  // Hạ trần xuống dưới mức đã chia KHÔNG bị chặn: phần đã chia là chuyện đã rồi, và từ chối sẽ làm
  // quản trị viên mắc kẹt không siết lại được chính sách. Chỉ cảnh báo để họ biết hệ quả.
  const wouldBeOver = distributedVnd > distributableVnd
  const isValid = percent >= 0 && percent <= 100

  return (
    <div
      aria-labelledby="quota-cap-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-[17px] font-bold tracking-tight text-blue-950" id="quota-cap-title">
              Trần phân phối hạn mức
            </h2>
            <p className="mt-1 max-w-[52ch] text-[13px] leading-relaxed text-slate-500">
              Phần ví hạn mức được phép chia ra cho {userLabel}. Phần còn lại là dự phòng — không mất đi đâu, chỉ là
              chưa ai có trần chi để tiêu vào, để dành cấp thêm giữa kỳ.
            </p>
          </div>
          <button
            aria-label="Đóng"
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          <div className="flex flex-col gap-2.5">
            <label className="text-[12.5px] font-bold text-blue-950" htmlFor="quota-cap-percent">
              Chia được tối đa
            </label>
            <div className="flex h-12 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 transition focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-50">
              <input
                className="min-w-0 flex-1 bg-transparent text-xl font-bold tracking-tight text-blue-950 tabular-nums outline-none"
                id="quota-cap-percent"
                inputMode="numeric"
                max={100}
                min={0}
                onChange={(event) => setPercent(Math.min(100, Math.max(0, Number(event.target.value.replace(/\D/g, '')) || 0)))}
                type="text"
                value={percent}
              />
              <span className="text-base font-bold text-slate-400">%</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  className={`inline-flex h-9 items-center rounded-lg border px-3.5 text-[12.5px] font-semibold tabular-nums transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
                    percent === preset
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                  key={preset}
                  onClick={() => setPercent(preset)}
                  type="button"
                >
                  {preset}%
                </button>
              ))}
            </div>
          </div>

          <dl className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-[12.5px] text-slate-600">Ví hạn mức của trường</dt>
              <dd className="text-[13px] font-semibold text-blue-950 tabular-nums">{formatVnd(poolTotalVnd)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-[12.5px] text-slate-600">Được phép chia ra</dt>
              <dd className="text-[13px] font-semibold text-indigo-700 tabular-nums">{formatVnd(distributableVnd)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-slate-200 pt-2">
              <dt className="text-[12.5px] font-semibold text-slate-700">Giữ lại làm dự phòng</dt>
              <dd className="text-[13px] font-bold text-emerald-700 tabular-nums">{formatVnd(reserveVnd)}</dd>
            </div>
          </dl>

          {wouldBeOver ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
              Trường đã chia <strong className="font-bold">{formatVnd(distributedVnd)}</strong>, nhiều hơn mức trần
              mới. Hạ trần <strong className="font-bold">không thu hồi</strong> hạn mức của ai — phần đã chia giữ
              nguyên. Nhưng mọi lần chia tiếp theo sẽ bị từ chối cho tới khi tổng đã chia về dưới trần.
            </p>
          ) : null}

          <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[11.5px] leading-relaxed text-slate-500">
            Chính sách này thuộc về <strong className="font-semibold text-slate-700">trường</strong>, không thuộc kỳ
            đăng ký — đặt một lần là giữ nguyên qua mọi lần gia hạn và đổi gói.
          </p>

          <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-4">
            <button
              className="inline-flex h-11 items-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              onClick={onClose}
              type="button"
            >
              Huỷ
            </button>
            <button
              className="inline-flex h-11 items-center rounded-lg bg-indigo-600 px-5 text-sm font-bold text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              disabled={!isValid || isSubmitting}
              onClick={() => onSubmit(percent)}
              type="button"
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu trần'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
