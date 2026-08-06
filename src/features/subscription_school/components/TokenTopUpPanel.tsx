import { ClipboardList, Coins, FileCheck2, Headphones, ShoppingCart } from 'lucide-react'
import { PaymentMethodField } from '@/shared/payment/PaymentMethodField'
import {
  formatPricePerMinute,
  formatVnd,
  QUOTA_LABELS,
  QUOTA_TYPES,
  type PaymentMethod,
  type QuotaType,
  type SubscriptionPlan,
  type TokenTopUpState,
} from '../types'

const QUOTA_ICONS: Record<QuotaType, typeof FileCheck2> = {
  CLASS_TEST: ClipboardList,
  GRADING: FileCheck2,
  PRACTICE: Headphones,
}

const MAX_MINUTES = 600
const STEP_MINUTES = 5

type TokenTopUpPanelProps = {
  isSubmitting: boolean
  onChange: (quotaType: QuotaType, minutes: number) => void
  onPaymentMethodChange: (method: PaymentMethod) => void
  onSubmit: () => void
  paymentMethod: PaymentMethod
  plan: SubscriptionPlan
  state: TokenTopUpState
}

export function TokenTopUpPanel({
  isSubmitting,
  onChange,
  onPaymentMethodChange,
  onSubmit,
  paymentMethod,
  plan,
  state,
}: TokenTopUpPanelProps) {
  // plan.quotas[].tokenUnitPrice = giá VNĐ cho 1 GIÂY audio; slider ở đây thao tác theo PHÚT
  // cho dễ hiểu, nên quy đổi *60 khi tính giá và khi gửi API (xem handleBuyTokens ở trang cha).
  const pricePerSecondByType = new Map(plan.quotas.map((quota) => [quota.quotaType, quota.tokenUnitPrice]))
  const total = QUOTA_TYPES.reduce(
    (sum, quotaType) => sum + state[quotaType] * (pricePerSecondByType.get(quotaType) ?? 0) * 60,
    0,
  )

  return (
    <div className="rounded-2xl border-1.5 border-indigo-600 bg-white p-6 sm:p-7">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <Coins aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h3 className="text-lg font-extrabold text-blue-950">Mua thêm thời gian xử lý cho gói đang dùng</h3>
          <p className="mt-0.5 text-sm text-slate-500">
            Gói <span className="font-bold text-indigo-700">{plan.name}</span> — giá theo phút tính riêng cho từng hạn mức
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        <div className="grid gap-6">
          {QUOTA_TYPES.map((quotaType) => {
            const pricePerSecond = pricePerSecondByType.get(quotaType) ?? 0
            const qtyMinutes = state[quotaType]
            const Icon = QUOTA_ICONS[quotaType]

            return (
              <div key={quotaType}>
                <div className="flex items-center gap-2.5">
                  <Icon aria-hidden="true" className="size-4.5 text-indigo-600" />
                  <span className="flex-1 text-sm font-bold text-slate-900">{QUOTA_LABELS[quotaType]}</span>
                  <span className="text-xs text-slate-400">{formatPricePerMinute(pricePerSecond)}</span>
                </div>
                <div className="mt-3 flex items-center gap-4">
                  <input
                    className="h-1.5 flex-1 accent-indigo-600"
                    max={MAX_MINUTES}
                    min={0}
                    onChange={(event) => onChange(quotaType, Math.max(0, Number(event.target.value) || 0))}
                    step={STEP_MINUTES}
                    type="range"
                    value={qtyMinutes}
                  />
                  <div className="flex items-baseline gap-2">
                    <input
                      className="h-10 w-24 rounded-lg border border-slate-200 px-2.5 text-right text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                      min={0}
                      onChange={(event) => onChange(quotaType, Math.max(0, Number(event.target.value) || 0))}
                      type="number"
                      value={qtyMinutes}
                    />
                    <span className="text-xs text-slate-400">phút</span>
                    <span className="w-24 text-xs text-slate-400">= {formatVnd(qtyMinutes * pricePerSecond * 60)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5.5">
          <div className="text-sm font-semibold text-slate-500">Tổng chi phí</div>
          <div className="mt-1.5 text-[28px] font-extrabold text-indigo-600">{formatVnd(total)}</div>
          <div className="mt-4 grid gap-2">
            {QUOTA_TYPES.map((quotaType) => (
              <div className="flex justify-between text-[12.5px] text-slate-600" key={quotaType}>
                <span>{QUOTA_LABELS[quotaType]}</span>
                <span className="font-bold">+{new Intl.NumberFormat('vi-VN').format(state[quotaType])} phút</span>
              </div>
            ))}
          </div>
          <div className="mt-5 border-t border-slate-200 pt-4">
            <PaymentMethodField
              disabled={isSubmitting}
              name="token-purchase-payment-method"
              onChange={onPaymentMethodChange}
              value={paymentMethod}
            />
          </div>
          <button
            className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 text-sm font-black text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting || total <= 0}
            onClick={onSubmit}
            type="button"
          >
            <ShoppingCart aria-hidden="true" className="size-4.5" />
            {isSubmitting ? 'Đang chuyển đến cổng thanh toán...' : 'Mua thêm'}
          </button>
        </div>
      </div>
    </div>
  )
}
