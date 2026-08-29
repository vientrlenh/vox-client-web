import { CreditCard } from 'lucide-react'
import { PaymentMethodField } from '@/shared/payment/PaymentMethodField'
import { PAYMENT_METHOD_LABELS } from '@/shared/payment/types'
import {
  formatVnd,
  QUOTA_LABELS,
  QUOTA_TYPES,
  type PaymentMethod,
  type RequestType,
  type SubscriptionPlan,
} from '../types'

type PaymentConfirmDialogProps = {
  isSubmitting: boolean
  onCancel: () => void
  onConfirm: () => void
  onPaymentMethodChange: (method: PaymentMethod) => void
  paymentMethod: PaymentMethod
  plan: SubscriptionPlan | null
  requestType: RequestType
}

export function PaymentConfirmDialog({
  isSubmitting,
  onCancel,
  onConfirm,
  onPaymentMethodChange,
  paymentMethod,
  plan,
  requestType,
}: PaymentConfirmDialogProps) {
  if (!plan) {
    return null
  }

  const modeLabel = requestType === 'UPGRADE' ? 'nâng cấp gói' : 'đăng ký gói'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <section
        aria-labelledby="payment-confirm-title"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl"
        role="dialog"
      >
        <div className="flex size-13 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          <CreditCard aria-hidden="true" className="size-6.5" />
        </div>
        <h2 className="mt-4 text-xl font-black text-blue-950" id="payment-confirm-title">
          Xác nhận {modeLabel}
        </h2>
        <p className="mt-1.5 text-sm leading-6 text-slate-500">
          Bạn sẽ được chuyển đến cổng thanh toán đã chọn. Gói được kích hoạt tự động ngay sau khi thanh toán thành công.
        </p>

        <div className="mt-5 rounded-2xl border border-slate-200 p-4.5">
          <div className="flex items-baseline justify-between">
            <span className="text-[15px] font-extrabold text-blue-950">Gói {plan.name}</span>
            <span className="text-xl font-extrabold text-indigo-600">{formatVnd(plan.priceVnd)}</span>
          </div>
          <div className="mt-3.5 grid gap-2.5 border-t border-slate-100 pt-3.5">
            {QUOTA_TYPES.map((quotaType) => {
              const quota = plan.quotas.find((item) => item.quotaType === quotaType)
              return (
                <div className="flex justify-between text-[13px]" key={quotaType}>
                  <span className="text-slate-500">{QUOTA_LABELS[quotaType]}</span>
                  <span className="font-bold text-slate-900">
                    {formatVnd(quota?.includedAmountVnd)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-5">
          <PaymentMethodField
            disabled={isSubmitting}
            name="subscription-request-payment-method"
            onChange={onPaymentMethodChange}
            value={paymentMethod}
          />
        </div>

        <div className="mt-5.5 flex gap-3">
          <button
            className="h-12 flex-1 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            onClick={onCancel}
            type="button"
          >
            Quay lại
          </button>
          <button
            className="inline-flex h-12 flex-[1.3] items-center justify-center gap-2 rounded-lg bg-indigo-600 text-sm font-black text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            onClick={onConfirm}
            type="button"
          >
            <CreditCard aria-hidden="true" className="size-4.5" />
            {isSubmitting
              ? 'Đang chuyển đến cổng thanh toán...'
              : `Thanh toán với ${PAYMENT_METHOD_LABELS[paymentMethod]}`}
          </button>
        </div>
      </section>
    </div>
  )
}
