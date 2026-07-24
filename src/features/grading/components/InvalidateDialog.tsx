import { useState } from 'react'
import { ShieldAlert } from 'lucide-react'

type InvalidateDialogProps = {
  flagReason?: string | null
  isPending?: boolean
  onCancel: () => void
  onConfirm: (reason: string) => void
  resultCode: string
}

/**
 * Xác nhận bài nghi vấn là vi phạm THẬT → kết quả bị vô hiệu, không có điểm.
 * Không hoàn tác được từ màn chấm nên bắt buộc qua bước xác nhận này.
 */
export function InvalidateDialog({
  flagReason,
  isPending,
  onCancel,
  onConfirm,
  resultCode,
}: InvalidateDialogProps) {
  const [reason, setReason] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-5">
      <div
        aria-modal="true"
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
        role="dialog"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex size-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <ShieldAlert className="size-6" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Xác nhận vi phạm</h2>
            <p className="mt-0.5 text-[12.5px] font-medium text-slate-500">
              Bài <b className="text-slate-700">#{resultCode}</b> sẽ bị vô hiệu, không có điểm.
            </p>
          </div>
        </div>

        {flagReason ? (
          <div className="mt-4.5 rounded-xl border-l-2 border-amber-500 bg-amber-50 px-4 py-3">
            <div className="text-[11.5px] font-bold text-amber-700">Lý do hệ thống đánh dấu</div>
            <p className="mt-0.5 text-[13px] leading-relaxed text-amber-800">{flagReason}</p>
          </div>
        ) : null}

        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-[13px] leading-relaxed text-red-700">
          Thao tác này <b>chốt kết quả là vô hiệu</b> và kết thúc phân công chấm. Chỉ dùng khi đã
          nghe bài và xác nhận có vi phạm thật.
        </p>

        <label className="mt-4 block text-[12.5px] font-bold text-slate-600" htmlFor="invalid-reason">
          Ghi chú của bạn <span className="font-semibold text-slate-400">(không bắt buộc)</span>
        </label>
        <textarea
          className="mt-1.5 min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-[13.5px] leading-relaxed text-slate-700 outline-none focus:border-red-400"
          id="invalid-reason"
          maxLength={1024}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Mô tả vi phạm bạn quan sát được…"
          value={reason}
        />

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
            onClick={() => onConfirm(reason)}
            type="button"
          >
            Vô hiệu bài thi
          </button>
        </div>
      </div>
    </div>
  )
}
