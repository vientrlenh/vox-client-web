import { useState } from 'react'
import { ArrowRight, X } from 'lucide-react'
import { formatVnd } from '../types'

type FundQuotaDialogProps = {
  /** Số dư ví tự nạp, đã kẹp về 0 ở backend. Trần cứng của lần nạp này. */
  walletBalanceVnd: number
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (amountVnd: number, reason: string) => void
  poolTotalVnd: number
  poolUsedVnd: number
  quotaType: 'EXAM' | 'PRACTICE'
  /** Đề xuất sẵn: phần đang thiếu so với số tiền trường còn trả được. 0 nếu không thiếu. */
  suggestedAmountVnd: number
}

const QUOTA_LABELS: Record<'EXAM' | 'PRACTICE', string> = {
  EXAM: 'Thi & kiểm tra',
  PRACTICE: 'Luyện tập',
}

function parseAmount(raw: string) {
  const digits = raw.replace(/\D/g, '')
  return digits === '' ? 0 : Number(digits)
}

/**
 * Nạp tiền từ ví tự nạp của trường sang ví hạn mức của MỘT loại quota.
 *
 * <p>Vì sao tiền vào ví của TRƯỜNG chứ không vào thẳng trần chi của một người: trần chi không giữ
 * tiền, nên trừ ví lúc chia sẽ khiến ví bị trừ LẦN NỮA lúc người đó tiêu thật (ConsumeQuotaService
 * vẫn thấy ví hạn mức cạn). Nạp vào ví hạn mức thì chỉ có đúng một lần trừ, và phần chưa tiêu ở lại
 * cho trường chia tiếp thay vì mắc kẹt trên tên một người.
 *
 * <p>Hộp thoại này phải làm hai việc mà một ô nhập không làm được: nói rõ đây là thao tác MỘT CHIỀU,
 * và cho thấy trước hai con số sẽ thay đổi. Một thao tác không hoàn lại được thì người bấm phải nhìn
 * thấy kết quả trước khi bấm.
 */
export function FundQuotaDialog({
  walletBalanceVnd,
  isSubmitting,
  onClose,
  onSubmit,
  poolTotalVnd,
  poolUsedVnd,
  quotaType,
  suggestedAmountVnd,
}: FundQuotaDialogProps) {
  const [amount, setAmount] = useState(Math.min(suggestedAmountVnd, walletBalanceVnd))
  const [reason, setReason] = useState('')

  const isOverWallet = amount > walletBalanceVnd
  const canSubmit = amount > 0 && !isOverWallet && !isSubmitting

  const poolRemainingVnd = Math.max(0, poolTotalVnd - poolUsedVnd)
  const quotaLabel = QUOTA_LABELS[quotaType]

  return (
    <div
      aria-labelledby="fund-quota-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-[17px] font-bold tracking-tight text-blue-950" id="fund-quota-title">
              Nạp tiền vào ví hạn mức
            </h2>
            <p className="mt-1 text-[13px] text-slate-500">
              Chuyển từ ví tự nạp sang ví <strong className="font-semibold text-blue-950">{quotaLabel}</strong> của
              trường
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
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] leading-relaxed text-amber-800">
            <strong className="font-bold">Không hoàn lại được.</strong> Tiền đã nạp vào ví {quotaLabel} không quay
            về ví tự nạp và không chuyển sang ví còn lại. Nạp nhầm ví thì phải nhờ quản trị hệ thống điều chỉnh tay.
          </p>

          <div className="flex flex-col gap-2">
            <label className="text-[12.5px] font-bold text-blue-950" htmlFor="fund-amount">
              Số tiền nạp
            </label>
            <div
              className={`flex h-12 items-center gap-2.5 rounded-xl border bg-white px-4 transition ${
                isOverWallet
                  ? 'border-red-300 ring-4 ring-red-50'
                  : 'border-slate-200 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-50'
              }`}
            >
              <input
                className="min-w-0 flex-1 bg-transparent text-xl font-bold tracking-tight text-blue-950 tabular-nums outline-none"
                id="fund-amount"
                inputMode="numeric"
                onChange={(event) => setAmount(parseAmount(event.target.value))}
                value={amount === 0 ? '' : new Intl.NumberFormat('vi-VN').format(amount)}
              />
              <span className="text-base font-bold text-slate-400">₫</span>
            </div>
            {isOverWallet ? (
              <p className="text-[12px] font-semibold text-red-600">
                Vượt số dư ví tự nạp ({formatVnd(walletBalanceVnd)}). Nạp thêm tiền vào ví trước.
              </p>
            ) : null}
          </div>

          {/* Trước → sau cho cả hai túi: đây là thứ duy nhất trả lời được "bấm xong thì sao". */}
          <dl className="flex flex-col gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-[12.5px] text-slate-600">Ví tự nạp</dt>
              <dd className="flex items-center gap-2 text-[13px] font-semibold tabular-nums">
                <span className="text-slate-400 line-through">{formatVnd(walletBalanceVnd)}</span>
                <ArrowRight aria-hidden="true" className="size-3.5 text-slate-400" />
                <span className={isOverWallet ? 'text-red-600' : 'text-blue-950'}>
                  {formatVnd(Math.max(0, walletBalanceVnd - amount))}
                </span>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-[12.5px] text-slate-600">Ví {quotaLabel} còn lại</dt>
              <dd className="flex items-center gap-2 text-[13px] font-semibold tabular-nums">
                <span className="text-slate-400 line-through">{formatVnd(poolRemainingVnd)}</span>
                <ArrowRight aria-hidden="true" className="size-3.5 text-slate-400" />
                <span className="text-emerald-700">{formatVnd(poolRemainingVnd + amount)}</span>
              </dd>
            </div>
          </dl>

          <div className="flex flex-col gap-2">
            <label className="text-[12.5px] font-bold text-blue-950" htmlFor="fund-reason">
              Ghi chú <span className="font-medium text-slate-400">(không bắt buộc)</span>
            </label>
            <input
              className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-blue-950 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
              id="fund-reason"
              maxLength={2048}
              onChange={(event) => setReason(event.target.value)}
              placeholder="vd: bổ sung cho đợt ôn thi học kỳ"
              value={reason}
            />
          </div>

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
              onClick={() => onSubmit(amount, reason)}
              type="button"
            >
              {isSubmitting ? 'Đang nạp...' : 'Nạp vào ví hạn mức'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
