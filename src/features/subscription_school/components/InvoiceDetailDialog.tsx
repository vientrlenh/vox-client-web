import { ExternalLink, Receipt, X } from 'lucide-react'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { formatDate, formatDateTime, formatVnd, getInvoiceStatusDisplay, type Invoice } from '../types'

const SOURCE_LABELS: Record<Invoice['sourceType'], string> = {
  SUBSCRIPTION: 'Gia hạn gói',
  SUBSCRIPTION_REQUEST: 'Đăng ký / Nâng cấp gói',
  TOKEN_PURCHASE: 'Mua token',
}

type InvoiceDetailDialogProps = {
  invoice: Invoice | null
  onClose: () => void
}

export function InvoiceDetailDialog({ invoice, onClose }: InvoiceDetailDialogProps) {
  if (!invoice) {
    return null
  }

  const statusDisplay = getInvoiceStatusDisplay(invoice.status)

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
          {invoice.invoiceNumber}
        </h2>
        <div className="mt-2">
          <StatusBadge label={statusDisplay.label} tone={statusDisplay.tone} />
        </div>

        <div className="mt-5 grid gap-3.5 rounded-2xl border border-slate-200 p-4.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Loại</span>
            <span className="font-bold text-indigo-700">{SOURCE_LABELS[invoice.sourceType]}</span>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 pt-3.5">
            <span className="text-slate-500">Số tiền</span>
            <span className="text-lg font-extrabold text-slate-900">{formatVnd(invoice.amount)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 pt-3.5">
            <span className="text-slate-500">Ngày tạo</span>
            <span className="font-bold text-slate-900">{formatDate(invoice.issueDate)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 pt-3.5">
            <span className="text-slate-500">Ngày thanh toán</span>
            <span className="font-bold text-slate-900">{formatDateTime(invoice.paidAt)}</span>
          </div>
        </div>

        <div className="mt-5.5 flex gap-3">
          {invoice.status === 'PENDING' && invoice.checkoutUrl ? (
            <a
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 text-sm font-black text-white transition hover:bg-indigo-700"
              href={invoice.checkoutUrl}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink aria-hidden="true" className="size-4.5" />
              Tiếp tục thanh toán
            </a>
          ) : (
            <button
              className="h-12 flex-1 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              onClick={onClose}
              type="button"
            >
              Đóng
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
