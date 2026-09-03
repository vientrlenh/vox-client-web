import { StatusBadge } from '@/shared/ui/StatusBadge'
import { isPaymentMethod, PAYMENT_METHOD_LABELS } from '@/shared/payment/types'
import { formatDateTime, formatVnd } from '../format'
import type { PaymentRecord } from '../types'

function providerLabel(provider: string | null) {
  if (provider && isPaymentMethod(provider)) {
    return PAYMENT_METHOD_LABELS[provider]
  }
  return provider ?? '—'
}

type PaymentInfoCardProps = {
  payment: PaymentRecord
}

/**
 * Payment gắn với hóa đơn của đơn — không phải danh sách mọi lần thử. `payment` truyền vào luôn là
 * dòng PAID duy nhất (đơn chỉ có tối đa 1 dòng PAID, ràng buộc uq_payment_records_one_paid_per_order
 * ở BE), nên đây chính là lần thanh toán mà invoice của đơn đại diện.
 */
export function PaymentInfoCard({ payment }: PaymentInfoCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-[13px] font-bold text-blue-950">Thông tin thanh toán</h2>
      <dl className="mt-3.5 grid grid-cols-[120px_1fr] items-baseline gap-x-3 gap-y-3">
        <dt className="text-[12.5px] text-slate-500">Cổng thanh toán</dt>
        <dd className="justify-self-end text-[12.5px] font-semibold text-blue-950">
          {providerLabel(payment.provider)}
        </dd>

        <dt className="text-[12.5px] text-slate-500">Số tiền</dt>
        <dd className="justify-self-end text-[12.5px] font-semibold text-blue-950 tabular-nums">
          {formatVnd(payment.amountVnd)}
        </dd>

        <dt className="text-[12.5px] text-slate-500">Trạng thái</dt>
        <dd className="justify-self-end">
          <StatusBadge label="Đã thanh toán" tone="success" />
        </dd>

        <dt className="text-[12.5px] text-slate-500">Thanh toán lúc</dt>
        <dd className="justify-self-end text-[12.5px] font-semibold text-blue-950 tabular-nums">
          {formatDateTime(payment.paidAt)}
        </dd>
      </dl>
    </section>
  )
}
