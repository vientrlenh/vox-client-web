import { useEffect } from 'react'
import { AlertTriangle, ArrowRight, RefreshCw, X } from 'lucide-react'
import { QUOTA_LABELS, QUOTA_TYPES, formatPeriod, type SubscriptionPlan } from '../model'
import { formatDate, formatVnd, type RenewalPreview } from '../types'

type PlanRenewalDialogProps = {
  errorMessage?: string
  isLoading: boolean
  isSubmitting: boolean
  isOpen: boolean
  onClose: () => void
  onConfirm: (acceptedPlanId: string) => void
  preview: RenewalPreview | null
}

function quotaOf(plan: SubscriptionPlan, quotaType: (typeof QUOTA_TYPES)[number]) {
  return plan.quotas.find((quota) => quota.quotaType === quotaType)?.includedAmountVnd ?? 0
}

/**
 * Bước xem trước BẮT BUỘC trước khi đặt đơn gia hạn.
 *
 * Lý do nó tồn tại nằm ở cờ planChanged: gói đang dùng có thể đã ngừng bán và được gán gói thay thế,
 * nên lần gia hạn tới trường sẽ mua một gói KHÁC, giá khác, hạn mức khác. Thu tiền gói mới mà không
 * cho nhìn trước là điều query này sinh ra để ngăn.
 */
export function PlanRenewalDialog({
  errorMessage,
  isLoading,
  isSubmitting,
  isOpen,
  onClose,
  onConfirm,
  preview,
}: PlanRenewalDialogProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', onKeyDown)
      return () => document.removeEventListener('keydown', onKeyDown)
    }
    return undefined
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  const changed = preview?.planChanged ?? false

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/45 px-4 py-10">
      <section
        aria-labelledby="plan-renewal-title"
        aria-modal="true"
        className="w-full max-w-xl rounded-2xl bg-white shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-3.5 border-b border-slate-200 px-5 py-5">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={`mt-0.5 inline-flex size-9.5 shrink-0 items-center justify-center rounded-full border ${
                changed ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-indigo-200 bg-indigo-50 text-indigo-700'
              }`}
            >
              <RefreshCw aria-hidden="true" className="size-4.75" />
            </span>
            <div className="min-w-0">
              <h2 className="text-[17px] font-bold text-blue-950" id="plan-renewal-title">
                {changed ? 'Gói gia hạn đã thay đổi' : 'Gia hạn gói dịch vụ'}
              </h2>
              <p className="mt-1 text-[12.5px] leading-snug text-slate-500">
                {changed
                  ? 'Xem kỹ gói thay thế trước khi đặt đơn — đây là gói trường sẽ dùng ở kỳ tới.'
                  : 'Kỳ mới nối tiếp kỳ hiện tại, giữ nguyên gói đang dùng.'}
              </p>
            </div>
          </div>
          <button
            aria-label="Đóng hộp thoại"
            className="inline-flex size-8.5 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-5 py-5">
          {isLoading ? (
            <p className="py-6 text-center text-sm font-semibold text-slate-500">Đang tải thông tin gia hạn...</p>
          ) : errorMessage ? (
            <p className="rounded-[10px] border border-red-200 bg-red-50 px-3.5 py-3 text-[13px] text-red-800" role="alert">
              {errorMessage}
            </p>
          ) : preview ? (
            <>
              {changed ? (
                <>
                  <p className="flex items-start gap-2.5 rounded-[10px] border border-amber-200 bg-amber-50 px-3.5 py-3 text-[12.5px] leading-relaxed text-amber-800">
                    <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                    <span>
                      <strong className="font-bold">Gói bạn đang dùng đã ngừng bán.</strong> Khi gia hạn, trường sẽ
                      chuyển sang gói thay thế dưới đây — giá và hạn mức có thể khác gói cũ.
                    </span>
                  </p>

                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2.5">
                    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <span className="text-[10.5px] font-bold tracking-wider text-slate-400 uppercase">Đang dùng</span>
                      <span className="text-sm font-bold text-slate-600">{preview.currentPlan.name}</span>
                      <span className="text-lg font-extrabold text-slate-500 tabular-nums">
                        {formatVnd(preview.currentPlan.priceVnd)}
                      </span>
                      {QUOTA_TYPES.map((quotaType) => (
                        <div className="flex justify-between gap-2 text-xs" key={quotaType}>
                          <span className="text-slate-400">{QUOTA_LABELS[quotaType]}</span>
                          <span className="font-semibold text-slate-500 tabular-nums">
                            {formatVnd(quotaOf(preview.currentPlan, quotaType))}
                          </span>
                        </div>
                      ))}
                    </div>

                    <ArrowRight aria-hidden="true" className="size-5 text-slate-400" />

                    <div className="flex flex-col gap-2 rounded-xl border-[1.5px] border-indigo-600 bg-indigo-50 p-4">
                      <span className="text-[10.5px] font-bold tracking-wider text-indigo-700 uppercase">
                        Khi gia hạn
                      </span>
                      <span className="text-sm font-bold text-blue-950">{preview.renewalPlan.name}</span>
                      <span className="text-lg font-extrabold text-blue-950 tabular-nums">
                        {formatVnd(preview.renewalPlan.priceVnd)}
                      </span>
                      {QUOTA_TYPES.map((quotaType) => (
                        <div className="flex justify-between gap-2 text-xs" key={quotaType}>
                          <span className="text-indigo-600">{QUOTA_LABELS[quotaType]}</span>
                          <span className="font-bold text-blue-950 tabular-nums">
                            {formatVnd(quotaOf(preview.renewalPlan, quotaType))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <span className="text-[10.5px] font-bold tracking-wider text-slate-400 uppercase">Gói gia hạn</span>
                  <span className="text-sm font-bold text-blue-950">
                    {preview.renewalPlan.name} ·{' '}
                    {formatPeriod(preview.renewalPlan.periodType, preview.renewalPlan.periodCount)}
                  </span>
                  <span className="text-lg font-extrabold text-blue-950 tabular-nums">
                    {formatVnd(preview.renewalPlan.priceVnd)}
                  </span>
                </div>
              )}

              <div className="grid gap-2.5 rounded-[10px] border border-slate-200 px-3.5 py-3">
                <div className="flex justify-between gap-3">
                  <span className="text-[12.5px] text-slate-500">Kỳ mới bắt đầu</span>
                  <span className="text-[12.5px] font-semibold text-blue-950 tabular-nums">
                    {formatDate(preview.startsAt)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[13px] font-bold text-blue-950">Giá gói</span>
                  <span className="text-lg font-extrabold tracking-tight text-blue-950 tabular-nums">
                    {formatVnd(preview.amountDue)}
                  </span>
                </div>
              </div>

              {/*
                amountDue là GIÁ GÓI, không phải số phải trả: phí dịch vụ chỉ được cộng lúc đặt đơn
                (xem javadoc của SchoolSubscriptionRenewalPreviewResponse). Không tự nhân tỷ lệ phí ở
                đây — tỷ lệ là config toàn hệ thống và đổi được bất cứ lúc nào; chép xuống client là
                dựng lại đúng bản sao lệch giá mà việc bỏ token_unit_price đã dọn đi một lần rồi.
                Số phải trả thật hiện ở trang đơn ngay sau bước này.
              */}
              <p className="text-[11.5px] leading-relaxed text-slate-400">
                Chưa gồm phí dịch vụ — phí được cộng khi đặt đơn, và số phải trả đầy đủ hiện ở trang đơn hàng ngay sau
                đây. Gia hạn nối tiếp kỳ hiện tại nên không có khoản bù trừ nào.
              </p>
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-end gap-2.5 border-t border-slate-200 px-5 py-4">
          <button
            className="inline-flex h-10.5 items-center rounded-lg border border-slate-200 bg-white px-4 text-[13.5px] font-semibold text-slate-600 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={onClose}
            type="button"
          >
            Để sau
          </button>
          <button
            className="inline-flex h-10.5 items-center rounded-lg bg-indigo-600 px-5 text-[13.5px] font-bold text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!preview || isSubmitting}
            onClick={() => preview && onConfirm(preview.renewalPlan.id)}
            type="button"
          >
            {isSubmitting ? 'Đang đặt đơn...' : changed ? 'Đồng ý và đặt đơn' : 'Đặt đơn gia hạn'}
          </button>
        </div>
      </section>
    </div>
  )
}
