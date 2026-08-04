import type { ReactNode } from 'react'
import { Eye, Inbox, RefreshCw } from 'lucide-react'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import type { SchoolLookupEntry } from '../api/useSchoolLookup'
import { formatDate, formatVnd, getSubscriptionStatusDisplay, type SchoolSubscription } from '../types'

type SchoolSubscriptionsTableProps = {
  errorMessage?: string
  footer?: ReactNode
  getSchool: (schoolId: string) => SchoolLookupEntry | null
  isActionPending: boolean
  isError: boolean
  isLoading: boolean
  onCancel: (subscription: SchoolSubscription) => void
  onRenew: (subscription: SchoolSubscription) => void
  onRetry: () => void
  onViewDetail: (subscription: SchoolSubscription) => void
  subscriptions: SchoolSubscription[]
}

export function SchoolSubscriptionsTable({
  errorMessage,
  footer,
  getSchool,
  isActionPending,
  isError,
  isLoading,
  onCancel,
  onRenew,
  onRetry,
  onViewDetail,
  subscriptions,
}: SchoolSubscriptionsTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-extrabold text-blue-950">
              <th className="px-6 py-3.5">Trường</th>
              <th className="px-4 py-3.5">Gói</th>
              <th className="px-4 py-3.5">Bắt đầu</th>
              <th className="px-4 py-3.5">Hết hạn</th>
              <th className="px-4 py-3.5">Trạng thái</th>
              <th className="px-4 py-3.5 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-6 py-10 text-center text-sm font-semibold text-slate-500" colSpan={6}>
                  Đang tải danh sách trường...
                </td>
              </tr>
            ) : null}

            {isError ? (
              <tr>
                <td className="px-6 py-10 text-center" colSpan={6}>
                  <p className="text-sm font-semibold text-red-600">{errorMessage ?? 'Không thể tải danh sách trường.'}</p>
                  <button
                    className="mt-3 inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
                    onClick={onRetry}
                    type="button"
                  >
                    Thử lại
                  </button>
                </td>
              </tr>
            ) : null}

            {!isLoading && !isError && subscriptions.length === 0 ? (
              <tr>
                <td className="px-6 py-14 text-center" colSpan={6}>
                  <Inbox aria-hidden="true" className="mx-auto size-9 text-slate-300" />
                  <p className="mt-2 text-sm font-semibold text-slate-500">Không tìm thấy trường phù hợp</p>
                </td>
              </tr>
            ) : null}

            {!isLoading && !isError
              ? subscriptions.map((subscription) => {
                  const school = getSchool(subscription.schoolId)
                  const statusDisplay = getSubscriptionStatusDisplay(
                    subscription.status,
                    subscription.endDate,
                    subscription.cancelledAt,
                  )

                  return (
                    <tr className="border-b border-slate-100 align-top" key={subscription.id}>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-slate-900">{school?.name ?? subscription.schoolId}</div>
                        <div className="mt-0.5 text-xs text-slate-400">
                          <span className="font-mono font-bold">{school?.code ?? '-'}</span>
                          {school?.address ? ` · ${school.address}` : ''}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-bold text-indigo-700">{subscription.plan?.name ?? '-'}</div>
                        <div className="mt-0.5 text-xs text-slate-500">{formatVnd(subscription.pricePaidSnapshot)}</div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">{formatDate(subscription.startDate)}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{formatDate(subscription.endDate)}</td>
                      <td className="px-4 py-4">
                        <StatusBadge label={statusDisplay.label} tone={statusDisplay.tone} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            aria-label="Xem chi tiết"
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                            onClick={() => onViewDetail(subscription)}
                            type="button"
                          >
                            <Eye aria-hidden="true" className="size-3.5" />
                            Chi tiết
                          </button>
                          <button
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={isActionPending}
                            onClick={() => onRenew(subscription)}
                            type="button"
                          >
                            <RefreshCw aria-hidden="true" className="size-3.5" />
                            Gia hạn
                          </button>
                          {subscription.status === 'ACTIVE' && !subscription.cancelledAt ? (
                            <button
                              className="inline-flex h-9 items-center rounded-lg border border-red-200 bg-white px-3 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={isActionPending}
                              onClick={() => onCancel(subscription)}
                              type="button"
                            >
                              Hủy
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })
              : null}
          </tbody>
        </table>
      </div>

      {footer}
    </div>
  )
}