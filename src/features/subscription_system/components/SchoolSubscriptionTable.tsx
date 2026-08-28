import { AlertTriangle, Clock } from 'lucide-react'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import type { SchoolSubscription } from '../types'
import {
  formatDate,
  formatDateTime,
  formatPeriod,
  formatVnd,
  getSchoolSubscriptionStatusDisplay,
} from '../types'

type SchoolSubscriptionTableProps = {
  emptyMessage: string
  isLoading: boolean
  items: SchoolSubscription[]
  onSuspend: (subscription: SchoolSubscription) => void
  onUnsuspend: (subscription: SchoolSubscription) => void
  /** Ẩn cột Gói trên trang chi tiết gói — mọi dòng ở đó đều cùng một gói. */
  showPlanColumn?: boolean
  /**
   * Id các trường đang có ca thi chạy. ForceSuspendSubscriptionUseCase TỪ CHỐI đình chỉ trong lúc đó
   * -- cắt quyền giữa ca làm hỏng bài của học sinh đang ngồi trong phòng, lỗi không thuộc về các em.
   * Chặn nút kèm lý do NGAY thay vì để bấm rồi mới báo lỗi.
   */
  suspendBlockedSchoolIds?: Set<string>
}

const actionClassName =
  'rounded text-[13px] font-bold text-indigo-600 transition hover:text-indigo-800 disabled:cursor-not-allowed'

export function SchoolSubscriptionTable({
  emptyMessage,
  isLoading,
  items,
  onSuspend,
  onUnsuspend,
  showPlanColumn = true,
  suspendBlockedSchoolIds,
}: SchoolSubscriptionTableProps) {
  if (isLoading) {
    return <p className="px-6 py-10 text-center text-sm font-bold text-slate-500">Đang tải danh sách trường...</p>
  }

  if (items.length === 0) {
    return <p className="px-6 py-10 text-center text-sm font-bold text-slate-500">{emptyMessage}</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-500">
            <th className="px-6 py-3.5">Trường</th>
            {showPlanColumn ? <th className="px-4 py-3.5">Gói</th> : null}
            <th className="px-4 py-3.5">Hiệu lực</th>
            <th className="px-4 py-3.5 text-right">Đã trả</th>
            <th className="px-4 py-3.5">Trạng thái</th>
            <th className="px-6 py-3.5 text-right">Hành động</th>
          </tr>
        </thead>
        <tbody>
          {items.map((subscription) => {
            const display = getSchoolSubscriptionStatusDisplay(
              subscription.status,
              subscription.endDate,
              subscription.cancelledAt,
            )
            const isSuspended = subscription.status === 'SUSPENDED'
            const isClosed = subscription.status === 'EXPIRED'
            const isSuspendBlocked = suspendBlockedSchoolIds?.has(subscription.schoolId) ?? false

            return (
              <tr className="border-b border-slate-100 last:border-b-0" key={subscription.id}>
                <td className="px-6 py-4 text-sm font-bold text-blue-950">
                  {subscription.school?.name ?? subscription.schoolId}
                  {isSuspended ? (
                    // Ba cột suspended_* bị xóa trắng lúc gỡ đình chỉ, nên đây là nơi duy nhất đọc
                    // được lần đình chỉ ĐANG hiệu lực -- lịch sử bền vững nằm ở sổ sự kiện.
                    <div className="mt-2 flex max-w-md items-start gap-2 rounded-lg bg-red-50 px-3 py-2 font-medium">
                      <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-red-700" />
                      <p className="text-xs leading-5 text-red-900">
                        <span className="font-bold">{subscription.suspendedReason ?? 'Không ghi lý do'}</span>
                        <span className="text-red-700"> — {formatDateTime(subscription.suspendedAt)}</span>
                      </p>
                    </div>
                  ) : null}
                </td>

                {showPlanColumn ? (
                  <td className="px-4 py-4 text-sm text-slate-600">
                    {subscription.plan
                      ? `${subscription.plan.name} · ${formatPeriod(
                          subscription.plan.periodType,
                          subscription.plan.periodCount,
                        )}`
                      : '-'}
                  </td>
                ) : null}

                <td className="px-4 py-4 text-sm text-slate-600 tabular-nums whitespace-nowrap">
                  {formatDate(subscription.startDate)} → {formatDate(subscription.endDate)}
                </td>

                <td className="px-4 py-4 text-right text-sm font-bold text-blue-950 tabular-nums">
                  {formatVnd(subscription.pricePaidSnapshot)}
                </td>

                <td className="px-4 py-4">
                  <div className="flex flex-col items-start gap-1">
                    <StatusBadge label={display.label} tone={display.tone} />
                    {subscription.cancelledAt && subscription.status !== 'EXPIRED' ? (
                      // Hủy chỉ tắt gia hạn — trường vẫn dùng bình thường tới hết endDate. Nói rõ ra
                      // để người trực không đọc "đã hủy" thành "đã mất quyền".
                      <span className="text-xs font-medium text-slate-400">
                        Còn dùng tới {formatDate(subscription.endDate)}
                      </span>
                    ) : null}
                  </div>
                </td>

                <td className="px-6 py-4">
                  <div className="flex flex-col items-end gap-1">
                    {isSuspended ? (
                      <button className={actionClassName} onClick={() => onUnsuspend(subscription)} type="button">
                        Gỡ đình chỉ
                      </button>
                    ) : isClosed ? (
                      <span className="text-[13px] text-slate-300">—</span>
                    ) : (
                      <>
                        <button
                          className={
                            isSuspendBlocked
                              ? 'cursor-not-allowed text-[13px] font-bold text-slate-400'
                              : actionClassName
                          }
                          disabled={isSuspendBlocked}
                          onClick={() => onSuspend(subscription)}
                          type="button"
                        >
                          Đình chỉ
                        </button>
                        {isSuspendBlocked ? (
                          <span className="inline-flex items-center gap-1 text-right text-xs font-medium text-amber-700">
                            <Clock aria-hidden="true" className="size-3 shrink-0" />
                            Đang có ca thi chạy
                          </span>
                        ) : null}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
