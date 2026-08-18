import { ClipboardList, Coins, FileCheck2, Headphones, ShoppingCart } from 'lucide-react'
import { PaymentMethodField } from '@/shared/payment/PaymentMethodField'
import {
  formatUsd,
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

const MAX_USD = 500
const STEP_USD = 5

// serviceFeeRatio là tỉ lệ (vd 0.20 = 20%) -- xem PlanEditorDrawer/QuotaPricingService.tokenUnitPriceFor.
function formatServiceFeeRatio(serviceFeeRatio: number) {
  return `${Math.round(serviceFeeRatio * 100 * 100) / 100}%`
}

type TokenTopUpPanelProps = {
  isSubmitting: boolean
  onChange: (quotaType: QuotaType, amountUsd: number) => void
  onPaymentMethodChange: (method: PaymentMethod) => void
  onSubmit: () => void
  paymentMethod: PaymentMethod
  plan: SubscriptionPlan
  state: TokenTopUpState
  // Tỷ giá USD->VND SỐNG (quotaPricing.usdToVndRate) -- dùng để tính lại giá bán ngay lúc hiển thị,
  // khớp đúng công thức BuyTokensUseCase/CreatePaymentLinkForTokenPurchaseUseCase tính lúc mua thật
  // (QuotaPricingService.tokenUnitPriceFor). plan.quotas[].tokenUnitPrice bị đóng băng lúc tạo gói
  // nên KHÔNG dùng để hiển thị ở đây -- chỉ dùng làm fallback khi tỷ giá sống chưa tải xong.
  usdToVndRate?: number
}

export function TokenTopUpPanel({
  isSubmitting,
  onChange,
  onPaymentMethodChange,
  onSubmit,
  paymentMethod,
  plan,
  state,
  usdToVndRate,
}: TokenTopUpPanelProps) {
  const frozenPriceByType = new Map(plan.quotas.map((quota) => [quota.quotaType, quota.tokenUnitPrice]))
  const livePrice =
    usdToVndRate != null ? Math.round(usdToVndRate * (1 + plan.serviceFeeRatio)) : undefined
  const pricePerUnitByType = new Map(
    QUOTA_TYPES.map((quotaType) => [quotaType, livePrice ?? frozenPriceByType.get(quotaType) ?? 0]),
  )
  const total = QUOTA_TYPES.reduce(
    (sum, quotaType) => sum + state[quotaType] * (pricePerUnitByType.get(quotaType) ?? 0),
    0,
  )

  return (
    <div className="rounded-2xl border-1.5 border-indigo-600 bg-white p-6 sm:p-7">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <Coins aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h3 className="text-lg font-black text-blue-950">Mua thêm hạn mức xử lý cho gói đang dùng</h3>
          <p className="mt-0.5 text-sm text-slate-500">
            Gói <span className="font-bold text-indigo-700">{plan.name}</span> — giá theo $1 hạn mức tính riêng cho từng loại
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        <div className="grid gap-6">
          {QUOTA_TYPES.map((quotaType) => {
            const pricePerUnit = pricePerUnitByType.get(quotaType) ?? 0
            const qtyUsd = state[quotaType]
            const Icon = QUOTA_ICONS[quotaType]

            return (
              <div key={quotaType}>
                <div className="flex items-center gap-2.5">
                  <Icon aria-hidden="true" className="size-4.5 text-indigo-600" />
                  <span className="flex-1 text-sm font-bold text-slate-900">{QUOTA_LABELS[quotaType]}</span>
                  <span className="text-xs text-slate-400">
                    {usdToVndRate != null
                      ? `Tỷ giá ${formatVnd(usdToVndRate)} · Phí DV ${formatServiceFeeRatio(plan.serviceFeeRatio)}`
                      : `${formatVnd(pricePerUnit)} / $1`}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-4">
                  <input
                    className="h-1.5 flex-1 accent-indigo-600"
                    max={MAX_USD}
                    min={0}
                    onChange={(event) => onChange(quotaType, Math.max(0, Number(event.target.value) || 0))}
                    step={STEP_USD}
                    type="range"
                    value={qtyUsd}
                  />
                  <div className="flex items-baseline gap-2">
                    <input
                      className="h-10 w-24 rounded-lg border border-slate-200 px-2.5 text-right text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                      min={0}
                      onChange={(event) => onChange(quotaType, Math.max(0, Number(event.target.value) || 0))}
                      type="number"
                      value={qtyUsd}
                    />
                    <span className="text-xs text-slate-400">USD</span>
                    <span className="w-24 text-xs text-slate-400">= {formatVnd(qtyUsd * pricePerUnit)}</span>
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
                <span className="font-bold">+{formatUsd(state[quotaType])}</span>
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
