import { Building2, ClipboardList, CreditCard, Wallet } from 'lucide-react'
import { StatCard } from '@/shared/ui/StatCard'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import {
  formatDate,
  formatVnd,
  getRequestStatusDisplay,
  getRequestTypeDisplay,
  type SchoolSubscription,
  type SubscriptionPlan,
  type SubscriptionRequest,
} from '../types'

const BAR_COLORS = ['bg-indigo-300', 'bg-indigo-600', 'bg-violet-600', 'bg-cyan-500', 'bg-emerald-600']

type SubscriptionOverviewPanelProps = {
  activeSubscriptions: SchoolSubscription[]
  getSchoolName: (schoolId: string) => string
  isLoading: boolean
  pendingRequestsCount: number
  plans: SubscriptionPlan[]
  recentRequests: SubscriptionRequest[]
}

export function SubscriptionOverviewPanel({
  activeSubscriptions,
  getSchoolName,
  isLoading,
  pendingRequestsCount,
  plans,
  recentRequests,
}: SubscriptionOverviewPanelProps) {
  const totalRevenue = activeSubscriptions.reduce((sum, sub) => sum + sub.pricePaidSnapshot, 0)
  const uniqueSchools = new Set(activeSubscriptions.map((sub) => sub.schoolId)).size

  const revenueByPlan = plans
    .map((plan) => {
      const subs = activeSubscriptions.filter((sub) => sub.planId === plan.id)
      return {
        id: plan.id,
        name: plan.name,
        revenue: subs.reduce((sum, sub) => sum + sub.pricePaidSnapshot, 0),
        schoolCount: subs.length,
      }
    })
    .sort((a, b) => b.revenue - a.revenue)
  const maxRevenue = Math.max(1, ...revenueByPlan.map((item) => item.revenue))

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Wallet aria-hidden="true" className="size-4.5" />}
          iconTone="emerald"
          label="Doanh thu (gói đang hoạt động)"
          value={isLoading ? '...' : formatVnd(totalRevenue)}
        />
        <StatCard
          icon={<CreditCard aria-hidden="true" className="size-4.5" />}
          iconTone="indigo"
          label="Gói đang hoạt động"
          value={isLoading ? '...' : activeSubscriptions.length}
        />
        <StatCard
          icon={<Building2 aria-hidden="true" className="size-4.5" />}
          iconTone="violet"
          label="Trường đang sử dụng"
          value={isLoading ? '...' : uniqueSchools}
        />
        <StatCard
          icon={<ClipboardList aria-hidden="true" className="size-4.5" />}
          iconTone="amber"
          label="Yêu cầu chờ xử lý"
          value={isLoading ? '...' : pendingRequestsCount}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-black text-blue-950">Doanh thu theo gói</h2>
          <p className="mt-1 text-sm text-slate-500">
            Tổng hợp theo giá trị gói (pricePaidSnapshot) của các trường đang hoạt động.
          </p>

          <div className="mt-5 grid gap-4">
            {revenueByPlan.length === 0 ? (
              <p className="text-sm font-medium text-slate-400">Chưa có dữ liệu doanh thu.</p>
            ) : (
              revenueByPlan.map((item, index) => (
                <div key={item.id}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-bold text-slate-900">
                      {item.name} <span className="font-medium text-slate-400">· {item.schoolCount} trường</span>
                    </span>
                    <span className="font-bold text-slate-600">{formatVnd(item.revenue)}</span>
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${BAR_COLORS[index % BAR_COLORS.length]}`}
                      style={{ width: `${Math.round((item.revenue / maxRevenue) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-black text-blue-950">Yêu cầu gần đây</h2>
          <p className="mt-1 text-sm text-slate-500">Đăng ký / nâng cấp gói mới nhất từ các trường.</p>

          <div className="mt-5 grid gap-4">
            {recentRequests.length === 0 ? (
              <p className="text-sm font-medium text-slate-400">Không có yêu cầu nào gần đây.</p>
            ) : (
              recentRequests.map((request) => {
                const statusDisplay = getRequestStatusDisplay(request.status)
                const typeDisplay = getRequestTypeDisplay(request.requestType)

                return (
                  <div className="flex items-start justify-between gap-3" key={request.id}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">{getSchoolName(request.schoolId)}</p>
                      <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                        <StatusBadge label={typeDisplay.label} tone={typeDisplay.tone} />
                        {formatDate(request.submittedAt)}
                      </p>
                    </div>
                    <StatusBadge label={statusDisplay.label} tone={statusDisplay.tone} />
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
