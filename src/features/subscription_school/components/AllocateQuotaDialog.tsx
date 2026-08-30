import { useState } from 'react'
import { X } from 'lucide-react'
import { formatVnd, type QuotaUserAllocation } from '../types'

type AllocateQuotaDialogProps = {
  allocation: QuotaUserAllocation
  /** Tổng đã chia cho MỌI người, kể cả người không ở trang đang xem. */
  distributedVnd: number
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (amountVnd: number) => void
  poolTotalVnd: number
}

function parseAmount(raw: string) {
  const digits = raw.replace(/\D/g, '')
  return digits === '' ? 0 : Number(digits)
}

/**
 * Sửa hạn mức của MỘT người.
 *
 * <p>Thay cho ô nhập thẳng trong bảng. Sửa hàng loạt trong bảng không sống chung được với phân trang:
 * người dùng sửa vài dòng, lật trang, rồi bấm lưu -- và chỉ những dòng còn trong bộ nhớ được gửi đi,
 * trong khi họ tin là đã sửa cả tập. Backend vốn đã nhận được phân bổ từng phần (nó tự cộng thêm
 * phần của những người không có trong yêu cầu), nên sửa từng người là cách khớp đúng với nó nhất.
 *
 * <p>Hộp thoại cũng là chỗ đủ rộng để nói ra hai con số mà cột nhập chật chội không nói được: ví của
 * trường còn bao nhiêu chưa chia, và người này đã tiêu bao nhiêu.
 */
export function AllocateQuotaDialog({
  allocation,
  distributedVnd,
  isSubmitting,
  onClose,
  onSubmit,
  poolTotalVnd,
}: AllocateQuotaDialogProps) {
  const [amount, setAmount] = useState(allocation.allocatedAmountVnd)

  // Trần cho riêng người này = phần ví chưa chia + phần đang đứng tên họ. Không lấy nguyên
  // poolTotalVnd: backend từ chối khi tổng phân bổ vượt ví ("Tổng hạn mức phân bổ vượt quá hạn mức
  // của trường"), nên để người dùng gõ một số chắc chắn bị từ chối là bắt họ đoán luật.
  const availableVnd = Math.max(0, poolTotalVnd - distributedVnd + allocation.allocatedAmountVnd)
  const isOverAvailable = amount > availableVnd
  // Hạ hạn mức xuống dưới mức ĐÃ TIÊU là dựng sẵn một dòng mà chính backend cũng coi là bất thường.
  const isBelowUsed = amount < allocation.usedAmountVnd
  const canSubmit = !isOverAvailable && !isBelowUsed && !isSubmitting

  const name = allocation.user?.fullName?.trim()

  return (
    <div
      aria-labelledby="allocate-quota-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-[17px] font-bold tracking-tight text-blue-950" id="allocate-quota-title">
              Sửa hạn mức cá nhân
            </h2>
            <p className="mt-1 truncate text-[13px] text-slate-500">
              {name || <span className="italic text-slate-400">Tài khoản đã bị xoá</span>}
              {allocation.user?.email ? ` · ${allocation.user.email}` : ''}
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
          <div className="flex flex-col gap-2">
            <label className="text-[12.5px] font-bold text-blue-950" htmlFor="allocate-amount">
              Hạn mức được cấp
            </label>
            <div
              className={`flex h-12 items-center gap-2.5 rounded-xl border bg-white px-4 transition ${
                isOverAvailable || isBelowUsed
                  ? 'border-red-300 ring-4 ring-red-50'
                  : 'border-slate-200 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-50'
              }`}
            >
              <input
                className="min-w-0 flex-1 bg-transparent text-xl font-bold tracking-tight text-blue-950 tabular-nums outline-none"
                id="allocate-amount"
                inputMode="numeric"
                onChange={(event) => setAmount(parseAmount(event.target.value))}
                value={amount === 0 ? '' : new Intl.NumberFormat('vi-VN').format(amount)}
              />
              <span className="text-base font-bold text-slate-400">₫</span>
            </div>
            {isOverAvailable ? (
              <p className="text-[12px] font-semibold text-red-600">
                Vượt phần ví còn chia được ({formatVnd(availableVnd)}).
              </p>
            ) : null}
            {isBelowUsed ? (
              <p className="text-[12px] font-semibold text-red-600">
                Không thể hạ xuống dưới mức đã tiêu ({formatVnd(allocation.usedAmountVnd)}).
              </p>
            ) : null}
          </div>

          <dl className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-[12.5px] text-slate-600">Người này đã tiêu</dt>
              <dd className="text-[13px] font-semibold text-blue-950 tabular-nums">
                {formatVnd(allocation.usedAmountVnd)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-[12.5px] text-slate-600">Ví trường còn chia được</dt>
              <dd className="text-[13px] font-semibold text-blue-950 tabular-nums">{formatVnd(availableVnd)}</dd>
            </div>
          </dl>

          <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[11.5px] leading-relaxed text-slate-500">
            Hạn mức cá nhân là <strong className="font-semibold text-slate-700">trần chi</strong>, không phải một túi
            tiền riêng: nó không giữ tiền của trường lại. Người không có hạn mức riêng thì không bị chặn theo cá nhân.
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
              disabled={!canSubmit}
              onClick={() => onSubmit(amount)}
              type="button"
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu hạn mức'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
