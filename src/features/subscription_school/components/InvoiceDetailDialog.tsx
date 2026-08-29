import { Ban, ExternalLink, Receipt, X } from 'lucide-react'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { formatDate, formatDateTime, formatVnd, getOrderStatusDisplay, type Order, type OrderType } from '../types'

const SOURCE_LABELS: Record<OrderType, string> = {
  SUBSCRIPTION_REQUEST: 'Đăng ký gói',
  SUBSCRIPTION_UPGRADE: 'Nâng cấp gói',
  TOPUP: 'Nạp thêm số dư',
}

type InvoiceDetailDialogProps = {
  isCancelling?: boolean
  onCancel: (orderId: string) => void
  order: Order | null
  onClose: () => void
}

export function InvoiceDetailDialog({ isCancelling, onCancel, order, onClose }: InvoiceDetailDialogProps) {
  if (!order) {
    return null
  }

  const statusDisplay = getOrderStatusDisplay(order.status)
  const pendingCheckoutUrl =
    order.status === 'PENDING' ? order.payments.find((payment) => payment.status === 'PENDING')?.checkoutUrl : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <section
        aria-labelledby="invoice-detail-title"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex size-13 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <Receipt aria-hidden="true" className="size-6.5" />
          </div>
          <button
            aria-label="Đóng chi tiết hóa đơn"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <h2 className="mt-4 font-mono text-lg font-black text-blue-950" id="invoice-detail-title">
          {order.invoice?.invoiceNumber ?? 'Chưa có hóa đơn'}
        </h2>
        <div className="mt-2">
          <StatusBadge label={statusDisplay.label} tone={statusDisplay.tone} />
        </div>

        <div className="mt-5 grid gap-3.5 rounded-2xl border border-slate-200 p-4.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Loại</span>
            <span className="font-bold text-indigo-700">{SOURCE_LABELS[order.type]}</span>
          </div>
          {order.subtotalAmountVnd != null ? (
            <div className="flex items-center justify-between border-t border-slate-100 pt-3.5">
              <span className="text-slate-500">Tạm tính</span>
              <span className="font-bold text-slate-900">{formatVnd(order.subtotalAmountVnd)}</span>
            </div>
          ) : null}
          {order.chargedFeeVnd ? (
            <div className="flex items-center justify-between border-t border-slate-100 pt-3.5">
              <span className="text-slate-500">Phí dịch vụ</span>
              <span className="font-bold text-slate-900">+{formatVnd(order.chargedFeeVnd)}</span>
            </div>
          ) : null}
          {order.discountAmountVnd ? (
            <div className="flex items-center justify-between border-t border-slate-100 pt-3.5">
              <span className="text-slate-500">Giảm trừ</span>
              <span className="font-bold text-emerald-600">-{formatVnd(order.discountAmountVnd)}</span>
            </div>
          ) : null}
          <div className="flex items-center justify-between border-t border-slate-100 pt-3.5">
            <span className="text-slate-500">Tổng tiền</span>
            <span className="text-lg font-extrabold text-slate-900">{formatVnd(order.totalAmountVnd)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 pt-3.5">
            <span className="text-slate-500">Ngày tạo đơn</span>
            <span className="font-bold text-slate-900">{formatDate(order.createdAt)}</span>
          </div>
          {order.invoice ? (
            <div className="flex items-center justify-between border-t border-slate-100 pt-3.5">
              <span className="text-slate-500">Ngày phát hành hóa đơn</span>
              <span className="font-bold text-slate-900">{formatDateTime(order.invoice.issueDate)}</span>
            </div>
          ) : null}
        </div>

        <div className="mt-5.5 flex gap-3">
          {order.status === 'PENDING' ? (
            <button
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white text-sm font-black text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isCancelling}
              onClick={() => onCancel(order.id)}
              type="button"
            >
              <Ban aria-hidden="true" className="size-4.5" />
              {isCancelling ? 'Đang hủy...' : 'Hủy đơn'}
            </button>
          ) : null}
          {pendingCheckoutUrl ? (
            <a
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 text-sm font-black text-white transition hover:bg-indigo-700"
              href={pendingCheckoutUrl}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink aria-hidden="true" className="size-4.5" />
              Tiếp tục thanh toán
            </a>
          ) : null}
          {order.status !== 'PENDING' ? (
            <button
              className="h-12 flex-1 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              onClick={onClose}
              type="button"
            >
              Đóng
            </button>
          ) : null}
        </div>
      </section>
    </div>
  )
}
