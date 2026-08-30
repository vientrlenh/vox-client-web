import { useState } from 'react'
import { TriangleAlert, X } from 'lucide-react'
import { DEFAULT_TOP_UP_AMOUNTS, formatVndWhole } from '../model'

type TopUpDialogProps = {
  /** Trường có gói đang chạy không. Backend từ chối nạp khi không có -- hỏi trước để khỏi bấm vào một nút chắc chắn hỏng. */
  canTopUp: boolean
  defaultAmount: number
  isSubmitting: boolean
  onClose: () => void
  onGoToPlans: () => void
  onSubmit: (creditAmountVnd: number) => void
}

/** Chỉ nhận số nguyên đồng: cổng thanh toán từ chối phần thập phân, và backend cũng chặn. */
function parseAmount(raw: string) {
  const digits = raw.replace(/\D/g, '')
  return digits === '' ? 0 : Number(digits)
}

export function TopUpDialog({
  canTopUp,
  defaultAmount,
  isSubmitting,
  onClose,
  onGoToPlans,
  onSubmit,
}: TopUpDialogProps) {
  const [amount, setAmount] = useState(defaultAmount)

  const isValid = amount > 0

  return (
    <div
      aria-labelledby="top-up-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
    >
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-7 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-blue-950" id="top-up-title">
              Nạp thêm vào ví trường
            </h2>
            <p className="mt-1.5 max-w-[52ch] text-[13px] leading-relaxed text-slate-500">
              {canTopUp
                ? 'Tiền trong ví dùng để gánh phần chi phí AI vượt quá hạn mức kèm gói. Ví không hết hạn và sống qua mọi lần gia hạn.'
                : 'Chưa nạp được lúc này — xem lý do bên dưới.'}
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

        {canTopUp ? (
          <div className="mt-6 flex flex-col gap-5">
            <div className="flex flex-col gap-2.5">
              <label className="text-[12.5px] font-bold text-blue-950" htmlFor="top-up-amount">
                Số tiền muốn nhận vào ví
              </label>
              <div className="flex h-13 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 transition focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-50">
                <input
                  className="min-w-0 flex-1 bg-transparent text-2xl font-bold tracking-tight text-blue-950 tabular-nums outline-none"
                  id="top-up-amount"
                  inputMode="numeric"
                  onChange={(event) => setAmount(parseAmount(event.target.value))}
                  value={amount === 0 ? '' : new Intl.NumberFormat('vi-VN').format(amount)}
                />
                <span className="text-lg font-bold text-slate-400">₫</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_TOP_UP_AMOUNTS.map((preset) => (
                  <button
                    className={`inline-flex h-9 items-center rounded-lg border px-3.5 text-[12.5px] font-semibold tabular-nums transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
                      amount === preset
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                    key={preset}
                    onClick={() => setAmount(preset)}
                    type="button"
                  >
                    {new Intl.NumberFormat('vi-VN').format(preset)}
                  </button>
                ))}
              </div>
              <p className="text-[11.5px] leading-relaxed text-slate-400">
                Số nguyên đồng, lớn hơn 0. Cổng thanh toán không nhận số lẻ.
              </p>
            </div>

            <dl className="flex flex-col gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-sm font-bold text-blue-950">Cộng vào ví trường</dt>
                <dd className="text-xl font-extrabold tracking-tight text-indigo-700 tabular-nums">
                  {formatVndWhole(amount)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-slate-200 pt-2.5">
                <dt className="text-[13px] text-slate-600">Phí dịch vụ</dt>
                <dd className="text-[13px] font-medium text-slate-500">Cộng thêm, hiện trên đơn</dd>
              </div>
            </dl>

            {/*
              KHÔNG tự tính phí ở đây. Tỷ lệ phí là biên lãi và cố ý KHÔNG được phơi qua API -- xem
              javadoc của QuotaPricingResponse: nó chỉ được xuất hiện dưới dạng một dòng phí đã cộng
              vào đơn hàng. Gõ một hằng số 5% vào client là dựng bản sao thứ hai của con số đó, và
              hôm nào đổi cấu hình thì trường thấy một giá rồi bị tính một giá khác.
              Tổng chính xác nằm ở trang đơn ngay bước sau, do backend tính.
            */}
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
              <strong className="font-bold">Phí cộng THÊM, không trích ra khỏi số dư.</strong> Con số bạn nhập ở trên
              là số <strong className="font-bold">ví nhận được</strong>, không phải số tiền phải trả. Tổng phải trả —
              đã gồm phí dịch vụ — hiện đầy đủ trên trang đơn ở bước tiếp theo, và bạn vẫn huỷ được đơn ở đó nếu đổi ý.
            </p>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
              <p className="max-w-[34ch] text-[11.5px] leading-relaxed text-slate-400">
                Đơn được tạo ở trạng thái chờ thanh toán. Phiên thanh toán chỉ mở khi bạn bấm trả trên trang đơn.
              </p>
              <div className="flex shrink-0 gap-2.5">
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
                  onClick={() => onSubmit(amount)}
                  type="button"
                >
                  {isSubmitting ? 'Đang tạo đơn...' : 'Tạo đơn nạp thêm'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-5">
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
              <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-amber-700" />
              <div>
                <p className="text-[13.5px] font-bold text-amber-800">
                  Trường chưa có gói đăng ký nào đang hoạt động
                </p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-amber-700">
                  Ví chỉ bị tiêu khi hạn mức kèm gói đã cạn. Chưa có gói nào chạy thì tiền nạp vào nằm im — không lượt
                  chấm nào chạm tới được. Tiền trong ví <strong className="font-bold">vẫn sống qua mọi lần gia hạn</strong>,
                  nên chặn ở đây là chặn nạp <strong className="font-bold">sớm</strong>, không phải gắn tiền vào một gói cụ thể.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2.5">
              <button
                className="inline-flex h-11 items-center rounded-lg border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                onClick={onClose}
                type="button"
              >
                Đóng
              </button>
              <button
                className="inline-flex h-11 items-center rounded-lg bg-indigo-600 px-5 text-sm font-bold text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                onClick={onGoToPlans}
                type="button"
              >
                Xem các gói dịch vụ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
