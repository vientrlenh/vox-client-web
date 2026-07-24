import type { ReactNode } from 'react'
import { Check, Inbox, X } from 'lucide-react'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { TabPillGroup } from '@/shared/ui/TabPill'
import type { SchoolLookupEntry } from '../api/useSchoolLookup'
import {
  formatDate,
  formatVnd,
  getRequestStatusDisplay,
  getRequestTypeDisplay,
  type RequestStatus,
  type SubscriptionRequest,
} from '../types'

type SubscriptionRequestsTableProps = {
  errorMessage?: string
  footer?: ReactNode
  getPlanName: (planId: string | null) => string
  getSchool: (schoolId: string) => SchoolLookupEntry | null
  isActionPending: boolean
  isError: boolean
  isLoading: boolean
  onApprove: (request: SubscriptionRequest) => void
  onReject: (request: SubscriptionRequest) => void
  onRetry: () => void
  onStatusChange: (status: RequestStatus) => void
  requests: SubscriptionRequest[]
  status: RequestStatus
}

export function SubscriptionRequestsTable({
  errorMessage,
  footer,
  getPlanName,
  getSchool,
  isActionPending,
  isError,
  isLoading,
  onApprove,
  onReject,
  onRetry,
  onStatusChange,
  requests,
  status,
}: SubscriptionRequestsTableProps) {
  return (
    <div className="grid gap-4">
      <TabPillGroup
        items={[
          { label: 'Chờ xử lý', value: 'PENDING' },
          { label: 'Đã duyệt', value: 'APPROVED' },
          { label: 'Đã từ chối', value: 'REJECTED' },
        ]}
        onChange={onStatusChange}
        value={status}
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-extrabold text-blue-950">
                <th className="px-6 py-3.5">Trường</th>
                <th className="px-4 py-3.5">Loại</th>
                <th className="px-4 py-3.5">Gói yêu cầu</th>
                <th className="px-4 py-3.5">Giá trị</th>
                <th className="px-4 py-3.5">Ngày gửi</th>
                {status === 'PENDING' ? <th className="px-4 py-3.5 text-right">Xử lý</th> : <th className="px-4 py-3.5">Trạng thái</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-6 py-10 text-center text-sm font-semibold text-slate-500" colSpan={6}>
                    Đang tải yêu cầu...
                  </td>
                </tr>
              ) : null}

              {isError ? (
                <tr>
                  <td className="px-6 py-10 text-center" colSpan={6}>
                    <p className="text-sm font-semibold text-red-600">{errorMessage ?? 'Không thể tải yêu cầu.'}</p>
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

              {!isLoading && !isError && requests.length === 0 ? (
                <tr>
                  <td className="px-6 py-14 text-center" colSpan={6}>
                    <Inbox aria-hidden="true" className="mx-auto size-9 text-slate-300" />
                    <p className="mt-2 text-sm font-semibold text-slate-500">Không có yêu cầu nào</p>
                  </td>
                </tr>
              ) : null}

              {!isLoading && !isError
                ? requests.map((request) => {
                    const school = getSchool(request.schoolId)
                    const typeDisplay = getRequestTypeDisplay(request.requestType)
                    const statusDisplay = getRequestStatusDisplay(request.status)

                    return (
                      <tr className="border-b border-slate-100 align-middle" key={request.id}>
                        <td className="px-6 py-4">
                          <div className="font-mono text-xs font-bold text-slate-400">{request.id.slice(0, 8)}</div>
                          <div className="mt-0.5 text-sm font-bold text-slate-900">{school?.name ?? request.schoolId}</div>
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge label={typeDisplay.label} tone={typeDisplay.tone} />
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600">
                          <span className="text-slate-400">{getPlanName(request.currentPlanId)}</span>
                          {' → '}
                          <span className="font-extrabold text-indigo-700">{getPlanName(request.requestedPlanId)}</span>
                        </td>
                        <td className="px-4 py-4 text-sm font-extrabold text-slate-900">{formatVnd(request.amount)}</td>
                        <td className="px-4 py-4 text-sm text-slate-600">{formatDate(request.submittedAt)}</td>
                        <td className="px-4 py-4">
                          {status === 'PENDING' ? (
                            <div className="flex justify-end gap-2">
                              <button
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={isActionPending}
                                onClick={() => onApprove(request)}
                                type="button"
                              >
                                <Check aria-hidden="true" className="size-3.5" />
                                Duyệt
                              </button>
                              <button
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={isActionPending}
                                onClick={() => onReject(request)}
                                type="button"
                              >
                                <X aria-hidden="true" className="size-3.5" />
                                Từ chối
                              </button>
                            </div>
                          ) : (
                            <StatusBadge label={statusDisplay.label} tone={statusDisplay.tone} />
                          )}
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
    </div>
  )
}
