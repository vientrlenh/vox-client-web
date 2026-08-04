import { ArrowRight, Archive, Clock, Pencil, Star } from 'lucide-react'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import {
  formatMinutes,
  formatQuotaMinutes,
  formatVnd,
  getPlanStatusDisplay,
  QUOTA_LABELS,
  QUOTA_TYPES,
  type SubscriptionPlan,
} from '../types'

type PlanCardProps = {
  getPlanName: (planId: string | null) => string
  onArchive: (plan: SubscriptionPlan) => void
  onEdit: (plan: SubscriptionPlan) => void
  plan: SubscriptionPlan
}

export function PlanCard({ getPlanName, onArchive, onEdit, plan }: PlanCardProps) {
  const statusDisplay = getPlanStatusDisplay(plan.status)
  const quotaByType = new Map(plan.quotas.map((quota) => [quota.quotaType, quota]))

  return (
    <div
      className={[
        'relative rounded-2xl border bg-white p-6',
        plan.popular ? 'border-indigo-300 shadow-lg shadow-indigo-100' : 'border-slate-200',
      ].join(' ')}
    >
      {plan.popular ? (
        <span className="absolute -top-3 left-6 inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1 text-xs font-extrabold text-white">
          <Star aria-hidden="true" className="size-3.5" />
          Phổ biến nhất
        </span>
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-extrabold text-blue-950">{plan.name}</h3>
            <StatusBadge label={statusDisplay.label} tone={statusDisplay.tone} />
          </div>
          <p className="mt-1 max-w-52 text-[12.5px] text-slate-500">{plan.tagline ?? 'Chưa có mô tả'}</p>
          {plan.status === 'ARCHIVED' && plan.replacedByPlanId ? (
            <p className="mt-1.5 flex items-center gap-1 text-[12px] font-semibold text-indigo-600">
              <ArrowRight aria-hidden="true" className="size-3.5" />
              Thay thế bởi: {getPlanName(plan.replacedByPlanId)}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 gap-1.5">
          {!plan.hasActiveSubscribers ? (
            <button
              aria-label="Sửa gói"
              className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-indigo-700 transition hover:bg-indigo-50"
              onClick={() => onEdit(plan)}
              type="button"
            >
              <Pencil aria-hidden="true" className="size-4" />
            </button>
          ) : null}
          {plan.status === 'ACTIVE' ? (
            <button
              aria-label="Lưu trữ gói"
              className="inline-flex size-9 items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 transition hover:bg-red-50"
              onClick={() => onArchive(plan)}
              type="button"
            >
              <Archive aria-hidden="true" className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="text-[26px] font-extrabold text-slate-900">{formatVnd(plan.pricePerYear)}</span>
        <span className="text-sm text-slate-500">/ {plan.validityDays} ngày</span>
      </div>

      <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4">
        {QUOTA_TYPES.map((quotaType) => (
          <div className="flex items-center gap-2.5" key={quotaType}>
            <span className="flex-1 text-[13px] text-slate-600">{QUOTA_LABELS[quotaType]}</span>
            <span className="text-sm font-extrabold text-slate-900">
              {formatQuotaMinutes(quotaByType.get(quotaType)?.includedQuantity)}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-2.5">
          <Clock aria-hidden="true" className="size-4 shrink-0 text-orange-600" />
          <span className="flex-1 text-[13px] text-slate-600">Thời gian tối đa mỗi bài</span>
          <span className="text-sm font-extrabold text-slate-900">{formatMinutes(plan.maxTimePerAttemptMin)}</span>
        </div>
      </div>
    </div>
  )
}
