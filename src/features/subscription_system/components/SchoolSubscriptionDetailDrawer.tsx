import { useState } from 'react'
import { ClipboardList, ExternalLink, FileCheck2, Headphones, Inbox, X } from 'lucide-react'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { Pagination } from '@/shared/components/Pagination'
import { useSchoolSubscriptionUsageQuery } from '../api/useSchoolSubscriptionUsageQuery'
import { useSchoolInvoicesQuery } from '../api/useSchoolInvoicesQuery'
import type { SchoolLookupEntry } from '../api/useSchoolLookup'
import {
  formatDate,
  formatQuotaMinutes,
  formatVnd,
  getInvoiceStatusDisplay,
  getSubscriptionStatusDisplay,
  getUsageBarColor,
  QUOTA_LABELS,
  QUOTA_TYPES,
  secondsToMinutes,
  type QuotaType,
  type SchoolSubscription,
} from '../types'

const QUOTA_ICONS: Record<QuotaType, typeof FileCheck2> = {
  CLASS_TEST: ClipboardList,
  GRADING: FileCheck2,
  PRACTICE: Headphones,
}

const SOURCE_LABELS = {
  SUBSCRIPTION: 'Gia hạn gói',
  SUBSCRIPTION_REQUEST: 'Đăng ký / Nâng cấp gói',
  TOKEN_PURCHASE: 'Mua token',
} as const

const INVOICES_PAGE_SIZE = 5
const DEFAULT_PAGE = 1

type SchoolSubscriptionDetailDrawerProps = {
  isOpen: boolean
  onClose: () => void
  school: SchoolLookupEntry | null
  subscription: SchoolSubscription | null
}

export function SchoolSubscriptionDetailDrawer({
  isOpen,
  onClose,
  school,
  subscription,
}: SchoolSubscriptionDetailDrawerProps) {
  const [invoicesPage, setInvoicesPage] = useState(DEFAULT_PAGE)
  const schoolId = subscription?.schoolId ?? null

  const usageQuery = useSchoolSubscriptionUsageQuery(isOpen ? schoolId : null)
  const invoicesQuery = useSchoolInvoicesQuery(isOpen ? schoolId : null, invoicesPage, INVOICES_PAGE_SIZE)

  if (!isOpen || !subscription) {
    return null
  }

  const statusDisplay = getSubscriptionStatusDisplay(subscription.status, subscription.endDate)
  const usageByType = new Map((usageQuery.data ?? []).map((item) => [item.quotaType, item]))
  const quotaByType = new Map((subscription.plan?.quotas ?? []).map((quota) => [quota.quotaType, quota]))

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <button
        aria-label="Đóng chi tiết đăng ký bằng lớp phủ"
        className="absolute inset-0 bg-slate-950/45"
        onClick={onClose}
        type="button"
      />
      <aside
        aria-labelledby="school-subscription-detail-title"
        aria-modal="true"
        className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col overflow-hidden bg-white shadow-2xl shadow-slate-950/20"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="min-w-0">
            <h2 className="text-lg font-black text-blue-950" id="school-subscription-detail-title">
              {school?.name ?? subscription.schoolId}
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              <span className="font-mono font-bold">{school?.code ?? '-'}</span>
              {school?.address ? ` · ${school.address}` : ''}
            </p>
          </div>
          <button
            aria-label="Đóng chi tiết đăng ký"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="grid gap-6">
            <div className="rounded-2xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-500">Gói đang dùng</p>
                  <p className="mt-1 text-lg font-extrabold text-indigo-700">{subscription.plan?.name ?? '-'}</p>
                </div>
                <StatusBadge label={statusDisplay.label} tone={statusDisplay.tone} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Giá đã thanh toán</p>
                  <p className="mt-0.5 font-bold text-slate-900">{formatVnd(subscription.pricePaidSnapshot)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Ngày bắt đầu</p>
                  <p className="mt-0.5 font-bold text-slate-900">{formatDate(subscription.startDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Ngày hết hạn</p>
                  <p className="mt-0.5 font-bold text-slate-900">{formatDate(subscription.endDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Ngày hủy</p>
                  <p className="mt-0.5 font-bold text-slate-900">{formatDate(subscription.cancelledAt)}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-black text-blue-950">Hạn mức sử dụng</p>
              <div className="mt-3 grid gap-3">
                {QUOTA_TYPES.map((quotaType) => {
                  const Icon = QUOTA_ICONS[quotaType]
                  const usage = usageByType.get(quotaType)
                  const planQuota = quotaByType.get(quotaType)
                  const total = usage?.totalAllocated ?? planQuota?.includedQuantity ?? 0
                  const used = usage?.usedQuantity ?? 0
                  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0
                  const color = getUsageBarColor(pct)

                  return (
                    <div className="rounded-lg border border-slate-200 p-4" key={quotaType}>
                      <div className="flex items-center gap-2">
                        <Icon aria-hidden="true" className="size-4 text-indigo-600" />
                        <span className="text-sm font-bold text-blue-950">{QUOTA_LABELS[quotaType]}</span>
                      </div>

                      {usageQuery.isLoading ? (
                        <p className="mt-3 text-xs font-semibold text-slate-400">Đang tải...</p>
                      ) : (
                        <>
                          <div className="mt-3 flex items-baseline gap-1.5">
                            <span className="text-xl font-extrabold text-slate-900">
                              {new Intl.NumberFormat('vi-VN').format(secondsToMinutes(used))}
                            </span>
                            <span className="text-xs text-slate-400">
                              / {new Intl.NumberFormat('vi-VN').format(secondsToMinutes(total))} phút
                            </span>
                          </div>
                          <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full" style={{ backgroundColor: color, width: `${pct}%` }} />
                          </div>
                          <div className="mt-1.5 flex items-center justify-between">
                            <span className="text-xs text-slate-500">
                              Còn lại {formatQuotaMinutes(Math.max(0, total - used))}
                            </span>
                            <span className="text-xs font-extrabold" style={{ color }}>
                              {pct}%
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div>
              <p className="text-sm font-black text-blue-950">Hóa đơn</p>
              <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full min-w-[520px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-extrabold text-blue-950">
                      <th className="px-4 py-3">Mã hóa đơn</th>
                      <th className="px-3 py-3">Ngày</th>
                      <th className="px-3 py-3">Loại</th>
                      <th className="px-3 py-3">Số tiền</th>
                      <th className="px-3 py-3">Trạng thái</th>
                      <th className="px-3 py-3 text-right">Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoicesQuery.isLoading ? (
                      <tr>
                        <td className="px-4 py-8 text-center text-xs font-semibold text-slate-500" colSpan={6}>
                          Đang tải hóa đơn...
                        </td>
                      </tr>
                    ) : null}

                    {!invoicesQuery.isLoading && (invoicesQuery.data?.content.length ?? 0) === 0 ? (
                      <tr>
                        <td className="px-4 py-8 text-center" colSpan={6}>
                          <Inbox aria-hidden="true" className="mx-auto size-7 text-slate-300" />
                          <p className="mt-1.5 text-xs font-semibold text-slate-500">Chưa có hóa đơn nào</p>
                        </td>
                      </tr>
                    ) : null}

                    {!invoicesQuery.isLoading
                      ? (invoicesQuery.data?.content ?? []).map((invoice) => {
                          const invoiceStatusDisplay = getInvoiceStatusDisplay(invoice.status)

                          return (
                            <tr className="border-b border-slate-100" key={invoice.id}>
                              <td className="px-4 py-3 font-mono text-xs font-bold text-slate-900">
                                {invoice.invoiceNumber}
                              </td>
                              <td className="px-3 py-3 text-xs text-slate-600">{formatDate(invoice.paidAt)}</td>
                              <td className="px-3 py-3 text-xs font-bold text-indigo-700">
                                {SOURCE_LABELS[invoice.sourceType]}
                              </td>
                              <td className="px-3 py-3 text-xs font-extrabold text-slate-900">
                                {formatVnd(invoice.amount)}
                              </td>
                              <td className="px-3 py-3">
                                <StatusBadge label={invoiceStatusDisplay.label} tone={invoiceStatusDisplay.tone} />
                              </td>
                              <td className="px-3 py-3 text-right">
                                {invoice.status === 'PENDING' && invoice.checkoutUrl ? (
                                  <a
                                    className="inline-flex size-7 items-center justify-center rounded-lg border border-slate-200 text-indigo-700 transition hover:bg-indigo-50"
                                    href={invoice.checkoutUrl}
                                    rel="noreferrer"
                                    target="_blank"
                                  >
                                    <ExternalLink aria-hidden="true" className="size-3.5" />
                                  </a>
                                ) : (
                                  <span className="text-xs text-slate-400">—</span>
                                )}
                              </td>
                            </tr>
                          )
                        })
                      : null}
                  </tbody>
                </table>
              </div>
              <div className="mt-3">
                <Pagination
                  currentPage={invoicesPage}
                  itemName="hóa đơn"
                  onPageChange={setInvoicesPage}
                  totalElements={invoicesQuery.data?.totalElements ?? 0}
                  totalPages={invoicesQuery.data?.totalPages ?? 0}
                />
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
