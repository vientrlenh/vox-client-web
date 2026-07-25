import type { ReactNode } from 'react'
import { ExternalLink, Inbox } from 'lucide-react'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { formatDate, formatVnd, getInvoiceStatusDisplay, type Invoice } from '../types'

type InvoicesTableProps = {
  errorMessage?: string
  footer?: ReactNode
  invoices: Invoice[]
  isError: boolean
  isLoading: boolean
  onRetry: () => void
}

const SOURCE_LABELS: Record<Invoice['sourceType'], string> = {
  SUBSCRIPTION: 'Gia hạn gói',
  SUBSCRIPTION_REQUEST: 'Đăng ký / Nâng cấp gói',
  TOKEN_PURCHASE: 'Mua token',
}

export function InvoicesTable({ errorMessage, footer, invoices, isError, isLoading, onRetry }: InvoicesTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-extrabold text-blue-950">
              <th className="px-6 py-3.5">Mã hóa đơn</th>
              <th className="px-4 py-3.5">Ngày</th>
              <th className="px-4 py-3.5">Loại</th>
              <th className="px-4 py-3.5">Số tiền</th>
              <th className="px-4 py-3.5">Trạng thái</th>
              <th className="px-4 py-3.5 text-right">Thanh toán</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-6 py-10 text-center text-sm font-semibold text-slate-500" colSpan={6}>
                  Đang tải hóa đơn...
                </td>
              </tr>
            ) : null}

            {isError ? (
              <tr>
                <td className="px-6 py-10 text-center" colSpan={6}>
                  <p className="text-sm font-semibold text-red-600">{errorMessage ?? 'Không thể tải hóa đơn.'}</p>
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

            {!isLoading && !isError && invoices.length === 0 ? (
              <tr>
                <td className="px-6 py-14 text-center" colSpan={6}>
                  <Inbox aria-hidden="true" className="mx-auto size-9 text-slate-300" />
                  <p className="mt-2 text-sm font-semibold text-slate-500">Chưa có hóa đơn nào</p>
                </td>
              </tr>
            ) : null}

            {!isLoading && !isError
              ? invoices.map((invoice) => {
                  const statusDisplay = getInvoiceStatusDisplay(invoice.status)

                  return (
                    <tr className="border-b border-slate-100" key={invoice.id}>
                      <td className="px-6 py-4 font-mono text-sm font-bold text-slate-900">{invoice.invoiceNumber}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{formatDate(invoice.paidAt)}</td>
                      <td className="px-4 py-4 text-sm font-bold text-indigo-700">{SOURCE_LABELS[invoice.sourceType]}</td>
                      <td className="px-4 py-4 text-sm font-extrabold text-slate-900">{formatVnd(invoice.amount)}</td>
                      <td className="px-4 py-4">
                        <StatusBadge label={statusDisplay.label} tone={statusDisplay.tone} />
                      </td>
                      <td className="px-4 py-4 text-right">
                        {invoice.status === 'PENDING' && invoice.checkoutUrl ? (
                          <a
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50"
                            href={invoice.checkoutUrl}
                            rel="noreferrer"
                            target="_blank"
                          >
                            <ExternalLink aria-hidden="true" className="size-3.5" />
                            Tiếp tục thanh toán
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

      {footer}
    </div>
  )
}
