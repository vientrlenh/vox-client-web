import { StatusBadge, type StatusTone } from '@/shared/ui/StatusBadge'
import { isPaymentMethod, PAYMENT_METHOD_LABELS } from '@/shared/payment/types'
import { formatDateTime, formatVnd } from '../format'
import type { PaymentRecord, PaymentRecordStatus } from '../types'

const STATUS_DISPLAY: Record<PaymentRecordStatus, { label: string; tone: StatusTone }> = {
  FAILED: { label: 'Thất bại', tone: 'danger' },
  PAID: { label: 'Đã thanh toán', tone: 'success' },
  PENDING: { label: 'Chờ thanh toán', tone: 'warning' },
}

function providerLabel(provider: string | null) {
  if (provider && isPaymentMethod(provider)) {
    return PAYMENT_METHOD_LABELS[provider]
  }
  return provider ?? '—'
}

type PaymentHistoryCardProps = {
  payments: PaymentRecord[] | null
}

export function PaymentHistoryCard({ payments }: PaymentHistoryCardProps) {
  const rows = payments ?? []

  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-[13px] font-bold text-blue-950">Lịch sử thanh toán</h2>
      </div>

      {rows.length === 0 ? (
        <p className="px-6 py-8 text-center text-[13px] text-slate-500">Chưa có giao dịch thanh toán nào.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-200 table-fixed border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-500">
                <th className="w-40 px-6 py-3.5" scope="col">Tạo lúc</th>
                <th className="w-32 px-4 py-3.5" scope="col">Cổng</th>
                <th className="w-36 px-4 py-3.5 text-right" scope="col">Số tiền</th>
                <th className="w-36 px-4 py-3.5" scope="col">Trạng thái</th>
                <th className="px-4 py-3.5" scope="col">Mã tham chiếu</th>
                <th className="w-40 px-6 py-3.5" scope="col">Thanh toán lúc</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((payment) => {
                const status = STATUS_DISPLAY[payment.status]
                return (
                  <tr className="border-b border-slate-100 align-top last:border-b-0" key={payment.id}>
                    <td className="px-6 py-4 text-[12.5px] text-slate-600 tabular-nums">
                      {formatDateTime(payment.createdAt)}
                    </td>
                    <td className="px-4 py-4 text-[12.5px] font-semibold text-blue-950">
                      {providerLabel(payment.provider)}
                    </td>
                    <td className="px-4 py-4 text-right text-[13px] font-bold text-blue-950 tabular-nums">
                      {formatVnd(payment.amountVnd)}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge label={status.label} tone={status.tone} />
                    </td>
                    <td className="px-4 py-4 font-mono text-[11.5px] text-slate-500 wrap-break-word">
                      {payment.providerOrderRef ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-[12.5px] text-slate-600 tabular-nums">
                      {formatDateTime(payment.paidAt)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
