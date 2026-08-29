import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import {
  formatDateTime,
  formatVnd,
  getDebtEventDisplay,
  getOverageDisplay,
  QUOTA_LABELS,
  type SchoolDebtEvent,
} from '../types'

type DebtEventsTableProps = {
  errorMessage?: string
  events: SchoolDebtEvent[]
  footer?: ReactNode
  isError: boolean
  isLoading: boolean
  onRetry: () => void
}

export function DebtEventsTable({ errorMessage, events, footer, isError, isLoading, onRetry }: DebtEventsTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-black text-blue-950">
              <th className="px-6 py-3.5">Thời điểm</th>
              <th className="px-4 py-3.5">Hạn mức</th>
              <th className="px-4 py-3.5">Sự kiện</th>
              <th className="px-4 py-3.5">Kích hoạt (VNĐ)</th>
              <th className="px-4 py-3.5">Đã dùng / Hạn mức (VNĐ)</th>
              <th className="px-4 py-3.5">Chênh lệch</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-6 py-10 text-center text-sm font-semibold text-slate-500" colSpan={6}>
                  Đang tải lịch sử nợ...
                </td>
              </tr>
            ) : null}

            {isError ? (
              <tr>
                <td className="px-6 py-10 text-center" colSpan={6}>
                  <p className="text-sm font-semibold text-red-600">{errorMessage ?? 'Không thể tải lịch sử nợ.'}</p>
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

            {!isLoading && !isError && events.length === 0 ? (
              <tr>
                <td className="px-6 py-14 text-center" colSpan={6}>
                  <Inbox aria-hidden="true" className="mx-auto size-9 text-slate-300" />
                  <p className="mt-2 text-sm font-semibold text-slate-500">Trường chưa từng nợ hạn mức</p>
                </td>
              </tr>
            ) : null}

            {!isLoading && !isError
              ? events.map((event) => {
                  const eventDisplay = getDebtEventDisplay(event.eventType)
                  const overageDisplay = getOverageDisplay(event.overageVnd)

                  return (
                    <tr className="border-b border-slate-100" key={event.id}>
                      <td className="px-6 py-4 text-sm text-slate-600">{formatDateTime(event.occurredAt)}</td>
                      <td className="px-4 py-4 text-sm font-bold text-indigo-700">{QUOTA_LABELS[event.quotaType]}</td>
                      <td className="px-4 py-4">
                        <StatusBadge label={eventDisplay.label} tone={eventDisplay.tone} />
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                        {event.triggerAmountVnd === null ? '-' : formatVnd(event.triggerAmountVnd)}
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-slate-900">
                        {formatVnd(event.usedAmountVnd)} / {formatVnd(event.totalAllocatedVnd)}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge label={overageDisplay.label} tone={overageDisplay.tone} />
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
