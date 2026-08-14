import { UsageProgressBar } from '@/shared/ui/UsageProgressBar'
import { QUOTA_ICONS, QUOTA_LABELS, QUOTA_TYPES, type SubscriptionQuota } from '../types'

type UsageBarsGridProps = {
  isLoading: boolean
  usage: SubscriptionQuota[]
}

export function UsageBarsGrid({ isLoading, usage }: UsageBarsGridProps) {
  const usageByType = new Map(usage.map((item) => [item.quotaType, item]))

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {QUOTA_TYPES.map((quotaType) => {
        const item = usageByType.get(quotaType)
        const total = item?.totalAllocated ?? 0
        const used = item?.usedQuantity ?? 0
        const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0
        const warn = pct >= 80
        const Icon = QUOTA_ICONS[quotaType]

        return (
          <div
            className={`rounded-2xl border bg-white p-5 ${warn ? 'border-amber-200' : 'border-slate-200'}`}
            key={quotaType}
          >
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-[10px] bg-indigo-50 text-indigo-600">
                <Icon aria-hidden="true" className="size-4.5" />
              </span>
              <span className="text-sm font-bold text-slate-900">{QUOTA_LABELS[quotaType]}</span>
            </div>

            <UsageProgressBar isLoading={isLoading} total={total} used={used} />

            {!isLoading && warn ? (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs leading-4 text-amber-700">
                Sắp đạt giới hạn — cân nhắc mua thêm token hoặc nâng cấp gói.
              </p>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
