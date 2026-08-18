import { ArrowUpCircle, Clock, RefreshCw, ShoppingBag } from 'lucide-react'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import {
  daysUntil,
  formatDate,
  formatMinutes,
  formatVnd,
  getSubscriptionStatusDisplay,
  type MySubscription,
} from '../types'

type MyPlanCardProps = {
  isCancelling: boolean
  isLoading: boolean
  isRenewing: boolean
  onCancel: () => void
  onGoBrowse: () => void
  onRenew: () => void
  subscription: MySubscription | null
}

export function MyPlanCard({
  isCancelling,
  isLoading,
  isRenewing,
  onCancel,
  onGoBrowse,
  onRenew,
  subscription,
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
          className="mt-5 inline-flex h-11 items-center gap-2 rounded-lg bg-indigo-600 px-5 text-sm font-black text-white transition hover:bg-indigo-700"
          onClick={onGoBrowse}
          type="button"
        >
          <ArrowUpCircle aria-hidden="true" className="size-4.5" />
          Đăng ký gói ngay
        </button>
      </div>
    )
  }

  const statusDisplay = getSubscriptionStatusDisplay(subscription.status, subscription.endDate, subscription.cancelledAt)
  const isActive = subscription.status === 'ACTIVE'
  const isCancelled = Boolean(subscription.cancelledAt)

  return (
    <div className="rounded-2xl border border-slate-200 bg-linear-to-br from-cyan-950 via-blue-900 to-indigo-900 p-7 text-white">
      <StatusBadge label={statusDisplay.label} tone={statusDisplay.tone} />
      <h2 className="mt-3 text-2xl font-black">Gói {subscription.plan.name}</h2>
      <p className="mt-1.5 text-sm text-white/75">
        {formatDate(subscription.startDate)} – {formatDate(subscription.endDate)}
      </p>
      {isActive && !isCancelled && subscription.status !== 'SUSPENDED' ? (
        (() => {
          const remaining = daysUntil(subscription.endDate)
          return remaining !== null && remaining >= 0 ? (
            <p className="mt-1 text-xs font-bold text-white/70">Còn {remaining} ngày</p>
          ) : null
        })()
      ) : null}
      {isCancelled ? (
        <p className="mt-1.5 text-sm text-amber-200">
          Bạn đã hủy — vẫn dùng bình thường tới hết {formatDate(subscription.endDate)}, sau đó sẽ không tự gia hạn.
        </p>
      ) : null}
      {subscription.status === 'SUSPENDED' ? (
        <p className="mt-1.5 text-sm text-red-200">
          Gói đã bị đình chỉ{subscription.suspendedReason ? `: "${subscription.suspendedReason}"` : ''}. Liên hệ hệ
          thống để biết thêm chi tiết.
        </p>
      ) : null}
      <p className="mt-2 flex items-center gap-1.5 text-sm text-white/85">
        <Clock aria-hidden="true" className="size-4" />
        Thời gian tối đa mỗi bài: {formatMinutes(subscription.plan.maxTimePerAttemptMin)}
      </p>

      <div className="mt-5 flex flex-wrap items-baseline gap-6">
        <div>
          <div className="text-xs text-white/70">Chi phí đã thanh toán</div>
          <div className="text-xl font-extrabold">{formatVnd(subscription.pricePaidSnapshot)}</div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2.5">
        <button
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-white px-4.5 text-sm font-black text-indigo-950 transition hover:bg-white/90"
          onClick={onGoBrowse}
          type="button"
        >
          <ArrowUpCircle aria-hidden="true" className="size-4.5" />
          Nâng cấp gói
        </button>
        <button
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4.5 text-sm font-bold text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isRenewing}
          onClick={onRenew}
          type="button"
        >
          <RefreshCw aria-hidden="true" className="size-4" />
          {isRenewing ? 'Đang chuyển đến cổng thanh toán...' : 'Gia hạn'}
        </button>
        {isActive && !isCancelled ? (
          <button
            className="inline-flex h-11 items-center rounded-lg border border-red-300/40 bg-red-500/10 px-4.5 text-sm font-bold text-red-100 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isCancelling}
            onClick={onCancel}
            type="button"
          >
            Hủy gói
          </button>
        ) : null}
      </div>
    </div>
  )
}
