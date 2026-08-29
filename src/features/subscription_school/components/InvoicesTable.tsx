import { useState, type ReactNode } from 'react'
import { ExternalLink, Inbox, ReceiptText } from 'lucide-react'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { formatDateTime, formatVnd, getOrderStatusDisplay, type Order, type OrderType } from '../types'
import { InvoiceDetailDialog } from './InvoiceDetailDialog'

type InvoicesTableProps = {
  errorMessage?: string
  footer?: ReactNode
  orders: Order[]
  isError: boolean
  isLoading: boolean
  onRetry: () => void
}

const SOURCE_LABELS: Record<OrderType, string> = {
  SUBSCRIPTION_REQUEST: 'Đăng ký gói',
  SUBSCRIPTION_UPGRADE: 'Nâng cấp gói',
  TOPUP: 'Nạp thêm số dư',
}

// Lần thử thanh toán còn sống của một đơn -- payments trả về mới nhất trước, và tối đa một dòng
// PENDING tại một thời điểm (xem Payment ở BE).
function findPendingCheckoutUrl(order: Order) {
  return order.payments.find((payment) => payment.status === 'PENDING')?.checkoutUrl ?? null
}

export function InvoicesTable({ errorMessage, footer, orders, isError, isLoading, onRetry }: InvoicesTableProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-black text-blue-950">
              <th className="px-6 py-3.5">Mã hóa đơn</th>
              <th className="px-4 py-3.5">Ngày</th>
              <th className="px-4 py-3.5">Loại</th>
              <th className="px-4 py-3.5">Số tiền</th>
              <th className="px-4 py-3.5">Trạng thái</th>
              <th className="px-4 py-3.5 text-right">Thanh toán</th>
              <th className="px-4 py-3.5 text-right">Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-6 py-10 text-center text-sm font-semibold text-slate-500" colSpan={7}>
                  Đang tải hóa đơn...
                </td>
              </tr>
            ) : null}

            {isError ? (
              <tr>
                <td className="px-6 py-10 text-center" colSpan={7}>
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

            {!isLoading && !isError && orders.length === 0 ? (
              <tr>
                <td className="px-6 py-14 text-center" colSpan={7}>
                  <Inbox aria-hidden="true" className="mx-auto size-9 text-slate-300" />
                  <p className="mt-2 text-sm font-semibold text-slate-500">Chưa có hóa đơn nào</p>
                </td>
              </tr>
            ) : null}

            {!isLoading && !isError
              ? orders.map((order) => {
                  const statusDisplay = getOrderStatusDisplay(order.status)
                  const pendingCheckoutUrl = order.status === 'PENDING' ? findPendingCheckoutUrl(order) : null

                  return (
                    <tr className="border-b border-slate-100" key={order.id}>
                      <td className="px-6 py-4 font-mono text-sm font-bold text-slate-900">
                        {order.invoice?.invoiceNumber ?? '—'}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {formatDateTime(order.invoice?.issueDate ?? order.createdAt)}
                      </td>
                      <td className="px-4 py-4 text-sm font-bold text-indigo-700">{SOURCE_LABELS[order.type]}</td>
                      <td className="px-4 py-4 text-sm font-extrabold text-slate-900">
                        {formatVnd(order.totalAmountVnd)}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge label={statusDisplay.label} tone={statusDisplay.tone} />
                      </td>
                      <td className="px-4 py-4 text-right">
                        {pendingCheckoutUrl ? (
                          <a
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50"
                            href={pendingCheckoutUrl}
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
                      <td className="px-4 py-4 text-right">
                        <button
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50"
                          onClick={() => setSelectedOrder(order)}
                          type="button"
                        >
                          <ReceiptText aria-hidden="true" className="size-3.5" />
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  )
                })
              : null}
          </tbody>
        </table>
      </div>

      {footer}

      <InvoiceDetailDialog onClose={() => setSelectedOrder(null)} order={selectedOrder} />
    </div>
  )
}
