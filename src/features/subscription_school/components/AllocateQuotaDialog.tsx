import { useState } from 'react'
import { X } from 'lucide-react'
import { formatVnd, type QuotaUserAllocation } from '../types'

type AllocateQuotaDialogProps = {
  allocation: QuotaUserAllocation
  /** Tổng đã chia cho MỌI người, kể cả người không ở trang đang xem. */
  distributedVnd: number
  isSubmitting: boolean
  onClose: () => void
  /** needsWalletConfirm = số nhập vượt phần pool, sẽ ăn vào ví tự nạp của trường. */
  onSubmit: (amountVnd: number, needsWalletConfirm: boolean) => void
  poolTotalVnd: number
  /** Quyết định ý nghĩa của lần chia ĐẦU TIÊN, và hai loại ngược nhau -- xem isFirstAllocation. */
  quotaType: 'EXAM' | 'PRACTICE'
  /** Phần ví tự nạp CÓ THỂ ăn thêm ngoài pool -- xem QuotaUserAllocationPage.walletBalanceVnd. */
  walletBalanceVnd: number
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
  quotaType,
  walletBalanceVnd,
}: AllocateQuotaDialogProps) {
  // null = chưa có dòng phân bổ. Ô nhập bắt đầu từ 0, nhưng đó KHÔNG phải giá trị hiện tại của họ --
  // xem cảnh báo isFirstAllocation bên dưới.
  const currentAllocatedVnd = allocation.allocatedAmountVnd ?? 0
  const isFirstAllocation = allocation.allocatedAmountVnd === null

  const [amount, setAmount] = useState(currentAllocatedVnd)

  // Trần cho riêng người này TRONG PHẦN POOL = phần ví chưa chia + phần đang đứng tên họ. Không lấy
  // nguyên poolTotalVnd: backend từ chối khi tổng phân bổ vượt pool LẪN ví tự nạp, nên để người dùng
  // gõ một số chắc chắn bị từ chối là bắt họ đoán luật.
  const poolAvailableVnd = Math.max(0, poolTotalVnd - distributedVnd + currentAllocatedVnd)
  // Trần MỞ RỘNG = phần pool còn chia được + ví tự nạp của trường. Vượt phần pool nhưng còn trong
  // trần này là ĂN VÀO VÍ CHUNG (dùng chung cho cả thi lẫn luyện tập) -- không chặn nữa, chỉ cảnh báo
  // và cần xác nhận (needsWalletConfirm) trước khi gửi lên backend.
  const extendedAvailableVnd = poolAvailableVnd + Math.max(0, walletBalanceVnd)
  const isOverExtended = amount > extendedAvailableVnd
  const needsWalletConfirm = !isOverExtended && amount > poolAvailableVnd
  // Hạ hạn mức xuống dưới mức ĐÃ TIÊU là dựng sẵn một dòng mà chính backend cũng coi là bất thường.
  const isBelowUsed = amount < allocation.usedAmountVnd
  const canSubmit = !isOverExtended && !isBelowUsed && !isSubmitting

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
          {/*
            Lần chia ĐẦU TIÊN đổi hành vi theo hai chiều ngược nhau, nên không thể dùng chung một câu.
            Với giáo viên đây là việc DỰNG LÊN một giới hạn chưa từng có (và hệ thống chưa có đường gỡ
            trần, chỉ nâng lên được); với học sinh thì ngược lại, đây chính là thao tác MỞ KHOÁ.
          */}
          {isFirstAllocation ? (
            <p
              className={`rounded-xl border px-4 py-3 text-[12px] leading-relaxed ${
                quotaType === 'EXAM'
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-800'
              }`}
            >
              {quotaType === 'EXAM' ? (
                <>
                  <strong className="font-bold">Người này hiện chưa có trần chi riêng</strong> — đang tiêu trong ví
                  chung của trường mà không bị chặn theo cá nhân. Lưu một con số ở đây là đặt ra giới hạn chưa từng
                  có, và sau đó chỉ nâng lên được chứ không gỡ bỏ được.
                </>
              ) : (
                <>
                  <strong className="font-bold">Người này chưa luyện tập được lượt nào</strong> — học sinh không có
                  trần chi riêng thì bị chặn hẳn. Lưu hạn mức ở đây là thao tác mở khoá cho em.
                </>
              )}
            </p>
          ) : null}

          <div className="flex flex-col gap-2">
            <label className="text-[12.5px] font-bold text-blue-950" htmlFor="allocate-amount">
              Hạn mức được cấp
            </label>
            <div
              className={`flex h-12 items-center gap-2.5 rounded-xl border bg-white px-4 transition ${
                isOverExtended || isBelowUsed
                  ? 'border-red-300 ring-4 ring-red-50'
                  : needsWalletConfirm
                    ? 'border-amber-300 ring-4 ring-amber-50'
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
            {isOverExtended ? (
              <p className="text-[12px] font-semibold text-red-600">
                Vượt cả phần pool ({formatVnd(poolAvailableVnd)}) lẫn ví tự nạp còn lại của trường
                ({formatVnd(walletBalanceVnd)}).
              </p>
            ) : needsWalletConfirm ? (
              <p className="text-[12px] font-semibold text-amber-700">
                Vượt phần chia từ gói ({formatVnd(poolAvailableVnd)}), phần dư {formatVnd(amount - poolAvailableVnd)}{' '}
                sẽ trích từ ví tự nạp của trường (đang còn {formatVnd(walletBalanceVnd)}). Ví này dùng chung cho cả
                thi lẫn luyện tập.
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
              <dd className="text-[13px] font-semibold text-blue-950 tabular-nums">{formatVnd(poolAvailableVnd)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-[12.5px] text-slate-600">Ví tự nạp còn (dùng chung EXAM/PRACTICE)</dt>
              <dd className="text-[13px] font-semibold text-blue-950 tabular-nums">
                {formatVnd(Math.max(0, walletBalanceVnd))}
              </dd>
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
              onClick={() => onSubmit(amount, needsWalletConfirm)}
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
