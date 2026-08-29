import { ArrowUpCircle, RefreshCw, ShoppingBag } from 'lucide-react'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { getUsageTone, usagePercent } from '@/shared/ui/UsageProgressBar'
import {
  QUOTA_LABELS,
  QUOTA_TYPES,
  formatPeriod,
  type MySubscription,
  type SubscriptionQuotaRecord,
} from '../model'
import { daysUntil, formatDate, formatMinutes, formatVnd, getSubscriptionStatusDisplay } from '../types'

type MyPlanCardProps = {
  isCancelling: boolean
  isLoading: boolean
  isRenewing: boolean
  isUsageLoading: boolean
  onCancel: () => void
  onGoBrowse: () => void
  onRenew: () => void
  subscription: MySubscription | null
  usage: SubscriptionQuotaRecord[]
}

// Ô hạn mức đổi cả nền lẫn chữ theo mức dùng, không chỉ mỗi thanh: cả thẻ này tồn tại để trả lời
// "còn dùng được bao nhiêu", nên ô sắp cạn phải đọc được khi liếc qua chứ không bắt người dùng so
// độ dài hai thanh.
const TONE_STYLES = {
  critical: {
    bar: 'bg-red-500',
    box: 'border-red-200 bg-red-50',
    hint: 'Đã cạn',
    label: 'text-red-800',
    track: 'bg-red-100',
    value: 'text-red-700',
  },
  ok: {
    bar: 'bg-indigo-600',
    box: 'border-slate-200 bg-white',
    hint: 'đã dùng',
    label: 'text-slate-600',
    track: 'bg-slate-100',
    value: 'text-indigo-600',
  },
  warning: {
    bar: 'bg-amber-500',
    box: 'border-amber-200 bg-amber-50',
    hint: 'Sắp cạn',
    label: 'text-amber-800',
    track: 'bg-amber-100',
    value: 'text-amber-700',
  },
} as const

export function MyPlanCard({
  isCancelling,
  isLoading,
  isRenewing,
  isUsageLoading,
  onCancel,
  onGoBrowse,
  onRenew,
  subscription,
  usage,
}: MyPlanCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
        Đang tải thông tin gói...
      </div>
    )
  }

  if (!subscription || !subscription.plan) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <ShoppingBag aria-hidden="true" className="mx-auto size-9 text-slate-300" />
        <p className="mt-3 text-sm font-bold text-slate-700">Trường bạn chưa đăng ký gói dịch vụ nào</p>
        <p className="mt-1 text-sm text-slate-500">Chọn một gói phù hợp để bắt đầu sử dụng đầy đủ tính năng.</p>
        <button
          className="mt-5 inline-flex h-11 items-center gap-2 rounded-lg bg-indigo-600 px-5 text-sm font-bold text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          onClick={onGoBrowse}
          type="button"
        >
          <ArrowUpCircle aria-hidden="true" className="size-4.5" />
          Đăng ký gói ngay
        </button>
      </div>
    )
  }

  const plan = subscription.plan
  const statusDisplay = getSubscriptionStatusDisplay(
    subscription.status,
    subscription.endDate,
    subscription.cancelledAt,
  )
  const isActive = subscription.status === 'ACTIVE'
  const isSuspended = subscription.status === 'SUSPENDED'
  const isCancelled = Boolean(subscription.cancelledAt)
  const remainingDays = daysUntil(subscription.endDate)

  // Trường đang bị đình chỉ không đặt được đơn mới -- CreateSubscriptionOrderUseCase từ chối khi còn
  // bất kỳ kỳ nào ở SUSPENDED. Tắt nút ở đây để người dùng không bấm vào một thứ chắc chắn hỏng.
  const canBuy = !isSuspended
  const usageByType = new Map(usage.map((record) => [record.quotaType, record]))

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <h2 className="text-[17px] font-bold tracking-tight text-blue-950">Gói {plan.name}</h2>
          <StatusBadge label={statusDisplay.label} tone={statusDisplay.tone} />
        </div>
        {isActive && remainingDays !== null && remainingDays >= 0 ? (
          <span className="text-[13px] font-semibold text-slate-600 tabular-nums">Còn {remainingDays} ngày</span>
        ) : null}
      </div>

      {isCancelled && !isSuspended ? (
        <p className="mt-4 rounded-[10px] border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13px] leading-relaxed text-amber-800">
          Đã hủy gia hạn — hạn mức dưới đây vẫn dùng được tới {formatDate(subscription.endDate)}, sau đó gói không
          tự gia hạn.
        </p>
      ) : null}

      {isSuspended ? (
        <p className="mt-4 rounded-[10px] border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] leading-relaxed text-red-700">
          Gói đang bị đình chỉ
          {subscription.suspendedReason ? `: “${subscription.suspendedReason}”` : ''}. Trường không đặt được đơn
          mới cho tới khi được gỡ đình chỉ.
        </p>
      ) : null}

      <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        {QUOTA_TYPES.map((quotaType) => {
          const record = usageByType.get(quotaType)
          const total = record?.totalAllocatedAmountVnd ?? 0
          const used = record?.usedAmountVnd ?? 0
          const percent = usagePercent(used, total)
          const tone = TONE_STYLES[getUsageTone(percent)]

          return (
            <div className={`flex flex-col gap-3 rounded-xl border p-4.5 ${tone.box}`} key={quotaType}>
              <span className={`text-[13px] font-semibold ${tone.label}`}>{QUOTA_LABELS[quotaType]}</span>

              {isUsageLoading ? (
                <p className="text-sm font-semibold text-slate-400">Đang tải...</p>
              ) : (
                <>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-4xl font-extrabold leading-none tracking-tight tabular-nums ${tone.value}`}>
                      {percent}
                    </span>
                    <span className={`text-base font-bold ${tone.value}`}>%</span>
                    <span className={`ml-1 text-xs ${tone.label}`}>{tone.hint}</span>
                  </div>
                  <div className={`h-2 overflow-hidden rounded-full ${tone.track}`}>
                    <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${percent}%` }} />
                  </div>
                  <span className={`text-xs tabular-nums ${tone.label}`}>
                    {formatVnd(used)} / {formatVnd(total)}
                  </span>
                </>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[12.5px] text-slate-500">
        <span className="tabular-nums">
          {formatDate(subscription.startDate)} – {formatDate(subscription.endDate)}
        </span>
        <span aria-hidden="true" className="text-slate-300">
          ·
        </span>
        <span>
          Chu kỳ {formatPeriod(plan.periodType, plan.periodCount)}
        </span>
        <span aria-hidden="true" className="text-slate-300">
          ·
        </span>
        <span>
          Đã thanh toán{' '}
          <strong className="font-bold text-slate-700 tabular-nums">{formatVnd(subscription.pricePaidSnapshot)}</strong>
        </span>
        <span aria-hidden="true" className="text-slate-300">
          ·
        </span>
        <span>Tối đa {formatMinutes(plan.maxTimePerAttemptMin)} mỗi bài</span>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <button
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-indigo-600 px-5 text-sm font-bold text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          disabled={!canBuy || isRenewing}
          onClick={onRenew}
          type="button"
        >
          <RefreshCw aria-hidden="true" className="size-4" />
          {isRenewing ? 'Đang chuyển đến cổng thanh toán...' : 'Gia hạn'}
        </button>
        <button
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-indigo-200 bg-white px-5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
          disabled={!canBuy}
          onClick={onGoBrowse}
          type="button"
        >
          <ArrowUpCircle aria-hidden="true" className="size-4.5" />
          Nâng cấp
        </button>
        {isActive && !isCancelled ? (
          <button
            className="inline-flex h-11 items-center rounded-lg px-3.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:text-slate-300"
            disabled={isCancelling}
            onClick={onCancel}
            type="button"
          >
            Hủy gia hạn
          </button>
        ) : null}
      </div>
    </div>
  )
}
