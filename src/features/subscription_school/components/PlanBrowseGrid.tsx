import { CheckCircle2, Star } from 'lucide-react'
import {
  formatMinutes,
  formatPlanPeriod,
  formatVnd,
  QUOTA_ICONS,
  QUOTA_LABELS,
  QUOTA_TYPES,
  type MySubscription,
  type RequestType,
  type SubscriptionPlan,
} from '../types'

type PlanBrowseGridProps = {
  currentSubscription: MySubscription | null
  isLoading: boolean
  onSelect: (plan: SubscriptionPlan, requestType: RequestType) => void
  plans: SubscriptionPlan[]
}

export function PlanBrowseGrid({ currentSubscription, isLoading, onSelect, plans }: PlanBrowseGridProps) {
  if (isLoading) {
    return <p className="text-sm font-semibold text-slate-500">Đang tải danh sách gói...</p>
  }

  const hasActivePlan = currentSubscription?.status === 'ACTIVE' && currentSubscription.plan
  const activePlan = hasActivePlan ? currentSubscription!.plan! : null

  // Gói đang dùng luôn hiện đầu tiên — sort ổn định (stable) nên các gói còn lại vẫn giữ nguyên
  // thứ tự cũ (createdAt DESC từ BE) so với nhau, chỉ mỗi gói hiện tại được kéo lên trước.
  const sortedPlans = [...plans].sort((a, b) => {
    const aIsCurrent = activePlan?.id === a.id ? 0 : 1
    const bIsCurrent = activePlan?.id === b.id ? 0 : 1
    return aIsCurrent - bIsCurrent
  })

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {sortedPlans.map((plan) => {
        const isCurrent = activePlan?.id === plan.id
        let ctaLabel = 'Đăng ký'
        let requestType: RequestType = 'REGISTRATION'
        let disabled = false

        if (isCurrent) {
          ctaLabel = 'Gói hiện tại'
          disabled = true
        } else if (activePlan && plan.priceVnd > activePlan.priceVnd) {
          ctaLabel = 'Nâng cấp'
          requestType = 'UPGRADE'
        } else if (activePlan && plan.priceVnd < activePlan.priceVnd) {
          ctaLabel = 'Không thể chuyển xuống gói thấp hơn'
          disabled = true
        }

        return (
          <div
            className={[
              'relative rounded-2xl border p-6',
              isCurrent
                ? 'border-emerald-300 bg-emerald-50/60 shadow-lg shadow-emerald-100'
                : plan.isMostPopular
                  ? 'border-indigo-300 bg-white shadow-lg shadow-indigo-100'
                  : 'border-slate-200 bg-white',
            ].join(' ')}
            key={plan.id}
          >
            {isCurrent ? (
              <span className="absolute -top-3 left-6 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-extrabold text-white">
                <CheckCircle2 aria-hidden="true" className="size-3.5" />
                Đang sử dụng
              </span>
            ) : plan.isMostPopular ? (
              <span className="absolute -top-3 left-6 inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1 text-xs font-extrabold text-white">
                <Star aria-hidden="true" className="size-3.5" />
                Phổ biến nhất
              </span>
            ) : null}

            <h3 className="text-lg font-black text-blue-950">{plan.name}</h3>
            <p className="mt-1 min-h-9.5 text-[12.5px] leading-5 text-slate-500">{plan.tagline ?? ''}</p>

            <div className="mt-3.5 flex items-baseline gap-1.5">
              <span className="text-[26px] font-extrabold text-slate-900">{formatVnd(plan.priceVnd)}</span>
              <span className="text-sm text-slate-500">/ {formatPlanPeriod(plan.periodType, plan.periodCount)}</span>
            </div>

            <div className="mt-4.5 grid gap-3 border-t border-slate-200 pt-4.5">
              {QUOTA_TYPES.map((quotaType) => {
                const quota = plan.quotas.find((item) => item.quotaType === quotaType)
                const Icon = QUOTA_ICONS[quotaType]

                return (
                  <div className="flex items-center gap-2.5" key={quotaType}>
                    <Icon aria-hidden="true" className="size-4.5 text-indigo-600" />
                    <span className="flex-1 text-[13px] text-slate-600">{QUOTA_LABELS[quotaType]}</span>
                    <span className="text-sm font-extrabold text-slate-900">
                      {formatVnd(quota?.includedAmountVnd)}
                    </span>
                  </div>
                )
              })}
              <div className="flex items-center gap-2.5">
                <span className="text-[13px] text-slate-600">Thời gian tối đa mỗi bài</span>
                <span className="ml-auto text-sm font-extrabold text-slate-900">
                  {formatMinutes(plan.maxTimePerAttemptMin)}
                </span>
              </div>
            </div>

            <button
              className={[
                'mt-4.5 w-full h-11 rounded-lg text-sm font-black transition',
                isCurrent
                  ? 'cursor-not-allowed border border-emerald-300 bg-emerald-100 text-emerald-700'
                  : disabled
                    ? 'cursor-not-allowed border border-dashed border-slate-300 bg-slate-50 text-slate-400'
                    : plan.isMostPopular
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'border-1.5 border-indigo-600 bg-white text-indigo-700 hover:bg-indigo-50',
              ].join(' ')}
              disabled={disabled}
              onClick={() => onSelect(plan, requestType)}
              type="button"
            >
              {ctaLabel}
            </button>
          </div>
        )
      })}
    </div>
  )
}
