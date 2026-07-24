import { Search } from 'lucide-react'
import type { SchoolFilters, SubscriptionPlan } from '../types'

type SchoolSubscriptionsFiltersBarProps = {
  filters: SchoolFilters
  onChange: (name: keyof SchoolFilters, value: string) => void
  plans: SubscriptionPlan[]
}

const selectClassName =
  'h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'

export function SchoolSubscriptionsFiltersBar({ filters, onChange, plans }: SchoolSubscriptionsFiltersBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          className="h-10 w-56 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          onChange={(event) => onChange('keyword', event.target.value)}
          placeholder="Tìm tên trường..."
          value={filters.keyword}
        />
      </div>

      <select
        className={selectClassName}
        onChange={(event) => onChange('planId', event.target.value)}
        value={filters.planId}
      >
        <option value="">Tất cả gói</option>
        {plans.map((plan) => (
          <option key={plan.id} value={plan.id}>
            {plan.name}
          </option>
        ))}
      </select>

      <select
        className={selectClassName}
        onChange={(event) => onChange('status', event.target.value)}
        value={filters.status}
      >
        <option value="">Tất cả trạng thái</option>
        <option value="ACTIVE">Đang hoạt động</option>
        <option value="EXPIRED">Đã hết hạn</option>
        <option value="CANCELLED">Đã hủy</option>
      </select>
    </div>
  )
}
