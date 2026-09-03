import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { ArrowLeft, Clock, Loader2 } from 'lucide-react'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { useFeedbackToast } from '@/shared/ui/useFeedbackToast'
import { PaymentMethodField } from '@/shared/payment/PaymentMethodField'
import { clearPendingOrder, goToCheckout } from '@/shared/payment/checkout'
import { DEFAULT_PAYMENT_METHOD, type PaymentLink, type PaymentMethod } from '@/shared/payment/types'
import { useCreateCheckoutUrlMutation } from '../api/useOrderMutations'
import { useOrderQuery } from '../api/useOrderQueries'
import { CancelOrderDialog } from '../components/CancelOrderDialog'
import { PaymentInfoCard } from '../components/PaymentInfoCard'
import { PayosQrPanel } from '../components/PayosQrPanel'
import { formatDateTime, formatRemaining, formatVnd } from '../format'
import { getOrderStatusDisplay, getPaidDestination } from '../types'

// Nhịp hỏi lại khi đơn còn chờ tiền. Đây là phép hỏi RẺ (đọc DB của mình), nên chạy nền được — và
// chính nó làm cho trang tự chuyển trạng thái mà người dùng không phải bấm gì.
const SETTLING_POLL_MS = 10_000

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return undefined
}

export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { feedbackToast, showError } = useFeedbackToast()

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(DEFAULT_PAYMENT_METHOD)
  const [isCancelOpen, setCancelOpen] = useState(false)
  // Mã QR đang hiện. Giữ ở state chứ không nằm trên URL: chuỗi VietQR dài và không phải thứ để
  // chia sẻ. Mất khi F5 -- bấm Thanh toán lại sẽ nhận đúng mã cũ, vì use case dựng lại từ payload
  // đã lưu ở payment_records thay vì phát phiên mới.
  const [qrLink, setQrLink] = useState<PaymentLink | null>(null)

  // "Đang ghi nhận" là trạng thái của TRANG, không phải của backend: đơn vẫn PENDING, nhưng mình có
  // lý do tin là tiền đã ra — vừa quay về từ cổng. Đánh dấu bằng query param để F5 không mất.
  const isReturningFromGateway = searchParams.get('settling') === '1'

  const orderQuery = useOrderQuery(orderId, SETTLING_POLL_MS)
  const checkoutMutation = useCreateCheckoutUrlMutation()

  const order = orderQuery.data ?? null
  const isPending = order?.status === 'PENDING'
  // QR không có sự kiện quay về: quét xong thì tab này không nhận được gì cả. Nên vừa hiện mã là
  // đã coi như đang chờ ghi nhận, và vòng hỏi lại chạy ngay -- xem CheckoutAction.QR ở BE.
  const isSettling = isPending && (isReturningFromGateway || qrLink !== null)

  // Đơn đã rời PENDING thì không còn gì để chờ — dọn dấu vết để F5 không quay lại hộp chờ.
  useEffect(() => {
    if (order && order.status !== 'PENDING') {
      clearPendingOrder()
      if (isReturningFromGateway) {
        searchParams.delete('settling')
        setSearchParams(searchParams, { replace: true })
      }
    }
  }, [order, isReturningFromGateway, searchParams, setSearchParams])

  const remaining = useMemo(() => formatRemaining(order?.expiresAt), [order?.expiresAt])

  async function handlePay() {
    if (!orderId) {
      return
    }

    try {
      const link = await checkoutMutation.mutateAsync({ orderId, provider: paymentMethod })
      if (link.action === 'QR' && link.qrCode) {
        setQrLink(link)
        return
      }
      goToCheckout(link)
    } catch (error) {
      showError(getErrorMessage(error) ?? 'Không thể mở phiên thanh toán.')
    }
  }

  if (orderQuery.isLoading) {
    return <p className="px-1 py-10 text-sm font-semibold text-slate-500">Đang tải đơn hàng...</p>
  }

  if (orderQuery.isError || !order) {
    return (
      <section className="mx-auto max-w-220 grid gap-4">
        <ErrorBanner message={getErrorMessage(orderQuery.error) ?? 'Không tìm thấy đơn hàng.'} />
        <Link className="text-sm font-semibold text-indigo-600 hover:text-indigo-800" to="/school-admin/orders">
          Về Đơn hàng
        </Link>
      </section>
    )
  }

  const statusDisplay = isSettling
    ? { label: 'Đang ghi nhận', tone: 'info' as const }
    : getOrderStatusDisplay(order.status)
  const paidDestination = getPaidDestination(order.type)
  const showFee = (order.chargedFeeVnd ?? 0) > 0
  const showDiscount = (order.discountAmountVnd ?? 0) > 0
  // Đơn chỉ có tối đa 1 dòng PAID (ràng buộc DB), nên khi có invoice, dòng PAID trong payments
  // chính là lần thanh toán mà invoice đó đại diện — không cần BE trỏ paymentId riêng.
  const invoicePayment = order.invoice
    ? (order.payments ?? []).find((payment) => payment.status === 'PAID') ?? null
    : null

  return (
    <section className="mx-auto grid max-w-300 gap-4">
      <Link
        className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-indigo-600 transition hover:text-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        to="/school-admin/orders"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Đơn hàng
      </Link>

      {/*
        Hai cột từ xl trở lên. Kéo dài một cột đơn ra 1200px thì mỗi dòng tiền có nhãn ở mép trái và
        số ở mép phải, cách nhau cả gang tay — đọc bằng mắt không nối được hai đầu. Đẩy phần siêu dữ
        liệu (mã đơn, mốc thời gian, hóa đơn) sang cột phụ vừa lấp chỗ trống vừa giữ dòng tiền ngắn.
      */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-blue-950">{order.description ?? 'Đơn hàng'}</h1>
            <StatusBadge label={statusDisplay.label} tone={statusDisplay.tone} />
          </div>

          <div className="mt-5 flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-[13.5px] text-slate-700">Tiền hàng</span>
            <span className="text-[13.5px] font-semibold text-blue-950 tabular-nums">
              {formatVnd(order.subtotalAmountVnd)}
            </span>
          </div>

          {showDiscount ? (
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-[13.5px] text-slate-700">Bù phần chưa dùng của kỳ hiện tại</span>
              <span className="text-[13.5px] font-semibold text-emerald-700 tabular-nums">
                −{formatVnd(order.discountAmountVnd)}
              </span>
            </div>
          ) : null}

          {showFee ? (
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-[13.5px] text-slate-700">Phí dịch vụ</span>
              <span className="text-[13.5px] font-semibold text-amber-700 tabular-nums">
                +{formatVnd(order.chargedFeeVnd)}
              </span>
            </div>
          ) : null}

          <div className="h-px bg-slate-200" />

          <div className="flex items-baseline justify-between gap-4">
            <span className="text-sm font-bold text-blue-950">Phải trả</span>
            <span className="text-[22px] font-extrabold tracking-tight text-blue-950 tabular-nums">
              {formatVnd(order.totalAmountVnd)}
            </span>
          </div>

          {order.type === 'TOPUP' ? (
            <p className="text-[11.5px] leading-snug text-slate-400">
              Ví trường nhận đúng{' '}
              <strong className="font-semibold text-slate-600">{formatVnd(order.subtotalAmountVnd)}</strong> — phí dịch
              vụ là tiền công, không vào ví tiêu được.
            </p>
          ) : null}
        </div>

        {isPending && !isSettling ? (
          <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-5">
            <PaymentMethodField name="order-payment-provider" onChange={setPaymentMethod} value={paymentMethod} />

            <div className="mt-1 flex flex-wrap items-center gap-2.5">
              <button
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-indigo-600 px-5 text-sm font-bold text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                disabled={checkoutMutation.isPending}
                onClick={() => void handlePay()}
                type="button"
              >
                {checkoutMutation.isPending ? 'Đang mở cổng thanh toán...' : 'Thanh toán'}
              </button>
              <button
                className="inline-flex h-11 items-center rounded-lg px-3.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                onClick={() => setCancelOpen(true)}
                type="button"
              >
                Hủy đơn
              </button>
              <span className="text-[11.5px] text-slate-400">Chỉ hủy được khi chưa mở phiên thanh toán.</span>
            </div>
          </div>
        ) : null}

        {qrLink?.qrCode && isPending ? (
          <PayosQrPanel checkoutUrl={qrLink.checkoutUrl} qrCode={qrLink.qrCode} transfer={qrLink.transfer} />
        ) : null}

        {isSettling ? (
          <div className="mt-5 flex flex-wrap items-center gap-3.5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3.5">
            <Loader2 aria-hidden="true" className="size-[18px] shrink-0 animate-spin text-indigo-700" />
            <div className="flex min-w-60 flex-1 flex-col gap-0.5">
              <span className="text-[13px] font-semibold text-indigo-900">
                Hệ thống đang xác nhận trạng thái thanh toán
              </span>
              <span className="text-[11.5px] text-indigo-600">
                Trang tự hỏi lại đều đặn — đóng tab cũng không sao, gói vẫn được cấp khi tiền về.
              </span>
            </div>
            <button
              className="inline-flex h-9.5 items-center rounded-lg border border-indigo-200 bg-white px-4 text-[13px] font-semibold whitespace-nowrap text-indigo-700 transition hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={orderQuery.isFetching}
              onClick={() => void orderQuery.refetch()}
              type="button"
            >
              {orderQuery.isFetching
                ? 'Đang kiểm tra...'
                : qrLink
                  ? 'Xác nhận đã thanh toán'
                  : 'Kiểm tra lại ngay'}
            </button>
          </div>
        ) : null}

        {order.status === 'SUCCESS' ? (
          <div className="mt-5 flex flex-col gap-4 border-t border-slate-200 pt-5">
            {/* Số hóa đơn nằm ở cột phụ bên phải — ở đây chỉ còn lối đi tiếp. */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-[12.5px] leading-snug text-slate-500">
                Không còn bước nào cần bạn xác nhận.
              </span>
              <button
                className="inline-flex h-11 items-center rounded-lg bg-indigo-600 px-5 text-sm font-bold whitespace-nowrap text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                onClick={() => navigate(paidDestination.to)}
                type="button"
              >
                {paidDestination.label}
              </button>
            </div>
          </div>
        ) : null}

        {order.status === 'EXPIRED' || order.status === 'CANCELLED' || order.status === 'FAILED' ? (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
            <span className="text-[13px] text-slate-500">
              Đơn đã đóng và không thu tiền. Trường có thể đặt đơn mới.
            </span>
            <button
              className="inline-flex h-11 items-center rounded-lg border border-indigo-200 bg-white px-5 text-sm font-bold whitespace-nowrap text-indigo-700 transition hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              onClick={() => navigate('/school-admin/subscription/plans')}
              type="button"
            >
              Chọn gói lại
            </button>
          </div>
        ) : null}
        </div>

        <aside className="flex flex-col gap-4">
          <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-[13px] font-bold text-blue-950">Thông tin đơn</h2>
            <dl className="mt-3.5 grid grid-cols-[80px_1fr] items-baseline gap-x-3 gap-y-3">
              <dt className="text-[12.5px] text-slate-500">Mã đơn</dt>
              <dd className="justify-self-end font-mono text-[12.5px] font-semibold text-blue-950">#{order.id.slice(0, 8)}</dd>

              <dt className="text-[12.5px] text-slate-500">Đặt lúc</dt>
              <dd className="justify-self-end text-[12.5px] font-semibold text-blue-950 tabular-nums">
                {formatDateTime(order.createdAt)}
              </dd>

              {order.invoice ? (
                <>
                  <div className="col-span-2 h-px bg-slate-100" />
                  <dt className="text-[12.5px] text-slate-500">Hóa đơn</dt>
                  <dd className="justify-self-end break-all text-right font-mono text-[12.5px] font-semibold text-blue-950">
                    {order.invoice.invoiceNumber}
                  </dd>

                  <dt className="text-[12.5px] text-slate-500">Phát hành</dt>
                  <dd className="justify-self-end text-[12.5px] font-semibold text-blue-950 tabular-nums">
                    {formatDateTime(order.invoice.issueDate)}
                  </dd>
                </>
              ) : null}
            </dl>
          </div>

          {invoicePayment ? <PaymentInfoCard payment={invoicePayment} /> : null}

          {isPending && remaining ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-center gap-2 text-amber-800">
                <Clock aria-hidden="true" className="size-4 shrink-0" />
                <h2 className="text-[13px] font-bold">Hạn thanh toán</h2>
              </div>
              <p className="mt-2 text-lg font-extrabold text-amber-900 tabular-nums">Còn {remaining}</p>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-amber-700">
                Quá hạn thì đơn tự đóng và phải đặt lại. Hạn này cũng chính là hạn đã gửi sang cổng thanh toán.
              </p>
            </div>
          ) : null}
        </aside>
      </div>

      {isCancelOpen ? (
        <CancelOrderDialog
          onCancelled={() => {
            setCancelOpen(false)
            void orderQuery.refetch()
          }}
          onClose={() => setCancelOpen(false)}
          order={order}
        />
      ) : null}

      {feedbackToast}
    </section>
  )
}
