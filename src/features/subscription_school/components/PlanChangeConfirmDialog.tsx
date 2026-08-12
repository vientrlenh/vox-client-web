import { ArrowRight, Sparkles } from 'lucide-react'
import { PaymentMethodField } from '@/shared/payment/PaymentMethodField'
import {
  formatMinutes,
  formatUsd,
  formatVnd,
  QUOTA_LABELS,
  QUOTA_TYPES,
  type PaymentMethod,
  type RenewalPreview,
} from '../types'

type PlanChangeConfirmDialogProps = {
  isSubmitting: boolean
  onCancel: () => void
  onConfirm: () => void
  onPaymentMethodChange: (method: PaymentMethod) => void
  paymentMethod: PaymentMethod
  preview: RenewalPreview | null
}

export function PlanChangeConfirmDialog({
  isSubmitting,
  onCancel,
  onConfirm,
  onPaymentMethodChange,
  paymentMethod,
  preview,
}: PlanChangeConfirmDialogProps) {
  if (!preview) {
    return null
  }

  const { currentPlan, renewalPlan } = preview
  const currentQuotaByType = new Map(currentPlan.quotas.map((quota) => [quota.quotaType, quota]))
  const renewalQuotaByType = new Map(renewalPlan.quotas.map((quota) => [quota.quotaType, quota]))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <section
        aria-labelledby="plan-change-confirm-title"
        aria-modal="true"
        className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-2xl"
        role="dialog"
      >
        <div className="flex size-13 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          <Sparkles aria-hidden="true" className="size-6.5" />
        </div>
        <h2 className="mt-4 text-xl font-extrabold text-blue-950" id="plan-change-confirm-title">
          Gói dịch vụ đã được cập nhật
        </h2>
        <p className="mt-1.5 text-sm leading-6 text-slate-500">
          Gói <strong className="text-slate-700">{currentPlan.name}</strong> đã ngừng cung cấp. Khi gia hạn, bạn sẽ
          chuyển sang gói <strong className="text-slate-700">{renewalPlan.name}</strong> — cùng mức giá, nhiều tính
          năng hơn.
        </p>

        <div className="mt-5 rounded-2xl border border-slate-200 p-4.5">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 pb-3 text-xs font-extrabold uppercase tracking-wide text-slate-400">
            <span>{currentPlan.name}</span>
            <span />
            <span className="text-right text-indigo-600">{renewalPlan.name}</span>
          </div>

          <div className="grid gap-2.5 border-t border-slate-100 pt-3.5">
            {QUOTA_TYPES.map((quotaType) => {
              const before = currentQuotaByType.get(quotaType)?.includedQuantity
              const after = renewalQuotaByType.get(quotaType)?.includedQuantity
              const improved = (after ?? 0) > (before ?? 0)
              return (
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-[13px]" key={quotaType}>
                  <span className="text-slate-500">{QUOTA_LABELS[quotaType]}</span>
                  <ArrowRight aria-hidden="true" className="size-3.5 text-slate-300" />
                  <span
                    className={[
                      'text-right font-bold',
                      improved ? 'text-emerald-600' : 'text-slate-900',
                    ].join(' ')}
                  >
                    {formatUsd(before)} → {formatUsd(after)}
                  </span>
                </div>
              )
            })}

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-[13px]">
              <span className="text-slate-500">Thời gian tối đa mỗi bài</span>
              <ArrowRight aria-hidden="true" className="size-3.5 text-slate-300" />
              <span className="text-right font-bold text-slate-900">
                {formatMinutes(currentPlan.maxTimePerAttemptMin)} → {formatMinutes(renewalPlan.maxTimePerAttemptMin)}
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-baseline justify-between border-t border-slate-100 pt-3.5">
            <span className="text-[13px] font-bold text-slate-500">Giá gia hạn</span>
            <span className="text-lg font-extrabold text-indigo-600">
              {formatVnd(renewalPlan.pricePerYear)} / {renewalPlan.validityDays} ngày
            </span>
          </div>
        </div>

        <div className="mt-5">
          <PaymentMethodField
            disabled={isSubmitting}
            name="renewal-payment-method"
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
            Để sau
          </button>
          <button
            className="inline-flex h-12 flex-[1.3] items-center justify-center gap-2 rounded-lg bg-indigo-600 text-sm font-black text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            onClick={onConfirm}
            type="button"
          >
            {isSubmitting ? 'Đang chuyển đến cổng thanh toán...' : 'Đồng ý, tiếp tục gia hạn'}
          </button>
        </div>
      </section>
    </div>
  )
}