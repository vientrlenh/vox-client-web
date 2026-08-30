import { CheckCircle2, Star } from 'lucide-react'
import {
  QUOTA_ICONS,
  QUOTA_LABELS,
  QUOTA_TYPES,
  formatPeriod,
  type MySubscription,
  type PlanQuota,
  type SubscriptionPlan,
} from '../model'
import { formatMinutes, formatVnd, type SubscriptionPlanListItem } from '../types'

type PlanBrowseGridProps = {
  currentSubscription: MySubscription | null
  isLoading: boolean
  items: SubscriptionPlanListItem[]
  onSelect: (plan: SubscriptionPlan) => void
}

/**
 * Ba lối mua, tương ứng đúng ba nhánh của CreateSubscriptionOrderUseCase:
 *
 * - gói đang dùng -> không mua lại được ở đây (gia hạn nằm trên MyPlanCard);
 * - gói ĐẮT HƠN gói đang chạy -> NÂNG CẤP, cắt ngang kỳ hiện tại và được bù phần chưa dùng;
 * - còn lại (rẻ hơn, hoặc chưa có gói nào) -> đơn nối tiếp, kỳ mới chạy sau kỳ hiện tại.
 *
 * Bản trước CHẶN gói rẻ hơn với câu "Không thể chuyển xuống gói thấp hơn" -- sai: backend nhận đơn
 * đó bình thường, chỉ khác là kỳ mới xếp hàng sau chứ không cắt ngang. Chặn ở FE là tự bỏ mất một
 * đường bán mà BE đang mở.
 */
function resolveCta(plan: SubscriptionPlan, activePlan: SubscriptionPlan | null) {
  if (activePlan && activePlan.id === plan.id) {
    return { disabled: true, hint: null, label: 'Gói hiện tại', variant: 'current' as const }
  }

  if (activePlan && plan.priceVnd > activePlan.priceVnd) {
    return {
      disabled: false,
      hint: 'Có hiệu lực ngay, được bù phần chưa dùng của kỳ hiện tại.',
      label: 'Nâng cấp ngay',
      variant: 'primary' as const,
    }
  }

  if (activePlan) {
    return {
      disabled: false,
      hint: 'Kỳ mới nối tiếp, chạy sau khi kỳ hiện tại kết thúc.',
      label: 'Đăng ký cho kỳ sau',
      variant: 'outline' as const,
    }
  }

  return { disabled: false, hint: null, label: 'Đăng ký', variant: 'primary' as const }
}

const CTA_CLASSES = {
  current: 'cursor-not-allowed border border-emerald-200 bg-emerald-50 text-emerald-700',
  outline: 'border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50',
  primary: 'border border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700',
} as const

export function PlanBrowseGrid({ currentSubscription, isLoading, items, onSelect }: PlanBrowseGridProps) {
  if (isLoading) {
    return <p className="text-sm font-semibold text-slate-500">Đang tải danh sách gói...</p>
  }

  const activePlan = currentSubscription?.status === 'ACTIVE' ? currentSubscription.plan : null

  // Gói đang dùng luôn hiện đầu tiên — sort ổn định nên các gói còn lại giữ nguyên thứ tự từ BE.
  const sorted = [...items].sort((a, b) => {
    const aIsCurrent = activePlan?.id === a.subscription.id ? 0 : 1
    const bIsCurrent = activePlan?.id === b.subscription.id ? 0 : 1
    return aIsCurrent - bIsCurrent
  })

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {sorted.map(({ isMostPopular, subscription: plan }) => {
        const isCurrent = activePlan?.id === plan.id
        const cta = resolveCta(plan, activePlan)

        return (
          <div
            className={[
              'relative flex flex-col gap-4 rounded-2xl border p-6',
              isCurrent
                ? 'border-emerald-300 bg-white'
                : isMostPopular
                  ? 'border-indigo-300 bg-white'
                  : 'border-slate-200 bg-white',
            ].join(' ')}
            key={plan.id}
          >
            {isCurrent ? (
              <span className="absolute -top-3 left-6 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">
                <CheckCircle2 aria-hidden="true" className="size-3.5" />
                Đang dùng
              </span>
            ) : isMostPopular ? (
              <span className="absolute -top-3 left-6 inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1 text-xs font-bold text-white">
                <Star aria-hidden="true" className="size-3.5" />
                Phổ biến nhất
              </span>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <h3 className="text-[17px] font-bold text-blue-950">{plan.name}</h3>
              <p className="min-h-9.5 text-[12.5px] leading-5 text-slate-500">{plan.tagline ?? ''}</p>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="text-[25px] font-extrabold tracking-tight text-slate-900 tabular-nums">
                {formatVnd(plan.priceVnd)}
              </span>
              <span className="text-sm text-slate-500">/ {formatPeriod(plan.periodType, plan.periodCount)}</span>
            </div>

            <div className="grid gap-3 border-t border-slate-200 pt-4">
              {QUOTA_TYPES.map((quotaType) => {
                const quota = plan.quotas.find((item: PlanQuota) => item.quotaType === quotaType)
                const Icon = QUOTA_ICONS[quotaType]

                return (
                  <div className="flex items-center gap-2.5" key={quotaType}>
                    <Icon aria-hidden="true" className="size-4.5 shrink-0 text-indigo-600" />
                    <span className="flex-1 text-[13px] text-slate-600">{QUOTA_LABELS[quotaType]}</span>
                    <span className="text-sm font-bold text-slate-900 tabular-nums">
                      {formatVnd(quota?.includedAmountVnd ?? 0)}
                    </span>
                  </div>
                )
              })}
              <div className="flex items-center gap-2.5">
                <span className="flex-1 text-[13px] text-slate-600">Thời gian tối đa mỗi bài</span>
                <span className="text-sm font-bold text-slate-900 tabular-nums">
                  {formatMinutes(plan.maxTimePerAttemptMin)}
                </span>
              </div>
            </div>

            {cta.hint ? (
              <p className="rounded-[10px] border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-600">
                {cta.hint}
              </p>
            ) : null}

            <button
              className={`mt-auto h-11 w-full rounded-lg text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${CTA_CLASSES[cta.variant]}`}
              disabled={cta.disabled}
              onClick={() => onSelect(plan)}
              type="button"
            >
              {cta.label}
            </button>
          </div>
        )
      })}
    </div>
  )
}
