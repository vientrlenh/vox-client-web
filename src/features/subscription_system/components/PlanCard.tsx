import { ArrowRight, Archive, ClipboardList, Clock, FileCheck2, Headphones, Pencil, Rocket, Star, Trash2 } from 'lucide-react'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import {
  formatMinutes,
  formatUsd,
  formatVnd,
  getPlanStatusDisplay,
  QUOTA_LABELS,
  QUOTA_TYPES,
  type QuotaType,
  type SubscriptionPlan,
} from '../types'

const QUOTA_ICONS: Record<QuotaType, typeof FileCheck2> = {
  CLASS_TEST: ClipboardList,
  GRADING: FileCheck2,
  PRACTICE: Headphones,
}

const QUOTA_ICON_STYLES: Record<QuotaType, string> = {
  CLASS_TEST: 'bg-blue-50 text-blue-600',
  GRADING: 'bg-violet-50 text-violet-600',
  PRACTICE: 'bg-emerald-50 text-emerald-600',
}

type PlanCardProps = {
  getPlanName: (planId: string | null) => string
  onArchive: (plan: SubscriptionPlan) => void
  onDeleteDraft: (plan: SubscriptionPlan) => void
  onEdit: (plan: SubscriptionPlan) => void
  onPublish: (plan: SubscriptionPlan) => void
  plan: SubscriptionPlan
}

export function PlanCard({ getPlanName, onArchive, onDeleteDraft, onEdit, onPublish, plan }: PlanCardProps) {
  const statusDisplay = getPlanStatusDisplay(plan.status)
  const quotaByType = new Map(plan.quotas.map((quota) => [quota.quotaType, quota]))
  const isDraft = plan.status === 'DRAFT'
  const isArchived = plan.status === 'ARCHIVED'

  return (
    <div
      className={[
        'relative overflow-hidden rounded-2xl border bg-white transition',
        plan.popular
          ? 'border-indigo-300 shadow-lg shadow-indigo-100'
          : isArchived
            ? 'border-slate-200 opacity-85'
            : 'border-slate-200 hover:border-indigo-200 hover:shadow-md',
      ].join(' ')}
    >
      <div
        className={[
          'h-1.5 w-full',
          plan.popular
            ? 'bg-linear-to-r from-blue-950 via-indigo-600 to-violet-600'
            : plan.status === 'ACTIVE'
              ? 'bg-emerald-500'
              : 'bg-slate-200',
        ].join(' ')}
      />

      {plan.popular ? (
        <span className="absolute top-4 right-4 inline-flex items-center gap-1.5 rounded-full bg-linear-to-r from-blue-950 via-indigo-600 to-violet-600 px-3 py-1 text-xs font-extrabold text-white shadow-sm">
          <Star aria-hidden="true" className="size-3.5" />
          Phổ biến nhất
        </span>
      ) : null}

      <div className="p-6">
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
            {isDraft ? (
              <button
                aria-label="Sửa gói"
                className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-indigo-700 transition hover:bg-indigo-50"
                onClick={() => onEdit(plan)}
                type="button"
              >
                <Pencil aria-hidden="true" className="size-4" />
              </button>
            ) : null}
            {isDraft ? (
              <button
                aria-label="Xuất bản gói"
                className="inline-flex size-9 items-center justify-center rounded-lg border border-emerald-200 bg-white text-emerald-600 transition hover:bg-emerald-50"
                onClick={() => onPublish(plan)}
                type="button"
              >
                <Rocket aria-hidden="true" className="size-4" />
              </button>
            ) : null}
            {isDraft ? (
              <button
                aria-label="Xóa gói nháp"
                className="inline-flex size-9 items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 transition hover:bg-red-50"
                onClick={() => onDeleteDraft(plan)}
                type="button"
              >
                <Trash2 aria-hidden="true" className="size-4" />
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
          <span className="text-[26px] font-extrabold text-indigo-700">{formatVnd(plan.pricePerYear)}</span>
          <span className="text-sm text-slate-500">/ {plan.validityDays} ngày</span>
        </div>

        <div className="mt-4 grid gap-3 border-t border-slate-200 pt-4">
          {QUOTA_TYPES.map((quotaType) => {
            const Icon = QUOTA_ICONS[quotaType]

            return (
              <div className="flex items-center gap-2.5" key={quotaType}>
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${QUOTA_ICON_STYLES[quotaType]}`}
                >
                  <Icon aria-hidden="true" className="size-3.5" />
                </span>
                <span className="flex-1 text-[13px] text-slate-600">{QUOTA_LABELS[quotaType]}</span>
                <span className="text-sm font-extrabold text-slate-900">
                  {formatUsd(quotaByType.get(quotaType)?.includedQuantity)}
                </span>
              </div>
            )
          })}
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
              <Clock aria-hidden="true" className="size-3.5" />
            </span>
            <span className="flex-1 text-[13px] text-slate-600">Thời gian tối đa mỗi bài</span>
            <span className="text-sm font-extrabold text-slate-900">{formatMinutes(plan.maxTimePerAttemptMin)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
