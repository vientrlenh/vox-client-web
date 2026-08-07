import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { CircleCheck, CircleX, Clock, Loader2 } from 'lucide-react'
import { useAppSelector } from '@/app/store/hooks'
import { clearPendingInvoice, readPendingInvoice } from '@/shared/payment/checkout'
import { useSyncInvoicePaymentStatusMutation } from '../api/useSyncInvoicePaymentStatusMutation'
import { invoiceQueryKeys } from '../api/useInvoicesQuery'
import { mySubscriptionQueryKeys } from '../api/useMySubscriptionQuery'
import { mySubscriptionUsageQueryKeys } from '../api/useMySubscriptionUsageQuery'
import type { InvoiceStatus } from '../types'

type Outcome = 'cancelled' | 'checking' | 'failed' | 'pending' | 'success'

function outcomeFromInvoiceStatus(status: InvoiceStatus): Outcome {
  if (status === 'PAID') {
    return 'success'
  }
  if (status === 'CANCELLED') {
    return 'cancelled'
  }
  if (status === 'FAILED') {
    return 'failed'
  }
  return 'pending'
}

// SePay không gắn tham số nào lên URL quay về mà phân biệt kết quả bằng chính đường dẫn: BE dựng
// success_url/error_url/cancel_url từ SEPAY_RETURN_BASE_URL cộng đúng ba path này.
const PATH_OUTCOMES: Record<string, Outcome> = {
  '/payment/cancel': 'cancelled',
  '/payment/error': 'failed',
  '/payment/success': 'success',
}

// Dự phòng khi không đối soát được với BE (vd mất mạng, hoặc không lưu được invoiceId lúc rời
// trang) — đoán tạm từ đường dẫn/query param để không hiện trắng trang. Kém tin cậy hơn hẳn
// sync-status vì đây chỉ là thứ cổng thanh toán nói trên URL, chưa qua xác thực nào.
function resolveOutcomeFromUrl(pathname: string, searchParams: URLSearchParams): Outcome {
  const pathOutcome = PATH_OUTCOMES[pathname]
  if (pathOutcome) {
    return pathOutcome
  }

  // PayOS tự gắn thêm status/cancel/code vào returnUrl/cancelUrl.
  const status = searchParams.get('status')
  if (status === 'PAID') {
    return 'success'
  }
  if (status === 'CANCELLED') {
    return 'cancelled'
  }
  if (status === 'FAILED') {
    return 'failed'
  }

  const cancel = searchParams.get('cancel')
  if (cancel === 'true') {
    return 'cancelled'
  }

  const code = searchParams.get('code')
  if (code !== null) {
    return code === '00' ? 'success' : 'cancelled'
  }

  return 'pending'
}

const AUTO_REDIRECT_SECONDS = 60

const OUTCOME_DISPLAY: Record<Outcome, { icon: typeof CircleCheck; iconClass: string; message: string; title: string }> = {
  cancelled: {
    icon: CircleX,
    iconClass: 'bg-red-50 text-red-600',
    message: 'Bạn đã hủy giao dịch trên cổng thanh toán. Gói / token chưa được kích hoạt hoặc cộng thêm.',
    title: 'Đã hủy thanh toán',
  },
  checking: {
    icon: Loader2,
    iconClass: 'bg-slate-100 text-slate-500',
    message: 'Đang xác nhận kết quả thanh toán với cổng thanh toán...',
    title: 'Đang kiểm tra...',
  },
  failed: {
    icon: CircleX,
    iconClass: 'bg-red-50 text-red-600',
    message: 'Giao dịch không thành công. Gói / token chưa được kích hoạt hoặc cộng thêm. Vui lòng thử lại.',
    title: 'Thanh toán thất bại',
  },
  pending: {
    icon: Clock,
    iconClass: 'bg-amber-50 text-amber-600',
    message:
      'Chúng tôi đang chờ xác nhận thanh toán từ cổng thanh toán. Vui lòng quay lại trang Gói dịch vụ sau ít phút để kiểm tra.',
    title: 'Đang xử lý thanh toán',
  },
  success: {
    icon: CircleCheck,
    iconClass: 'bg-emerald-50 text-emerald-600',
    message: 'Thanh toán thành công. Gói / token của trường sẽ được kích hoạt hoặc cộng thêm trong giây lát.',
    title: 'Thanh toán thành công',
  },
}

type PaymentResultPageProps = {
  // Trang này dùng chung cho cả School Admin và System Admin (System Admin cũng thanh toán khi duyệt
  // request). Route riêng theo role thì truyền sẵn đường quay về; ba route /payment/* của SePay thì
  // không truyền được vì BE chỉ cấu hình được một bộ URL cho mọi role — khi đó suy từ role hiện tại.
  backTo?: string
}

const SYSTEM_ADMIN_BACK_TO = '/system-admin/subscription'
const SCHOOL_ADMIN_BACK_TO = '/school-admin/subscription'

export function PaymentResultPage({ backTo }: PaymentResultPageProps) {
  const [searchParams] = useSearchParams()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const syncMutation = useSyncInvoicePaymentStatusMutation()
  const user = useAppSelector((state) => state.auth.user)

  // Đọc một lần lúc mount: goToCheckout() đã lưu invoiceId vào sessionStorage ngay trước khi rời
  // trang, và ta xóa nó sau khi đối soát xong nên lần đọc sau sẽ ra null.
  const [pendingInvoiceId] = useState(() => readPendingInvoice())
  const [outcome, setOutcome] = useState<Outcome>(() =>
    pendingInvoiceId ? 'checking' : resolveOutcomeFromUrl(pathname, searchParams),
  )
  const [secondsLeft, setSecondsLeft] = useState(AUTO_REDIRECT_SECONDS)
  // Chặn gọi sync-status 2 lần khi React.StrictMode mount/unmount/mount lại effect ở dev mode.
  const syncedInvoiceIdRef = useRef<string | null>(null)

  const resolvedBackTo =
    backTo ?? (user?.roles.includes('SYSTEM_ADMIN') ? SYSTEM_ADMIN_BACK_TO : SCHOOL_ADMIN_BACK_TO)

  useEffect(() => {
    if (!pendingInvoiceId || syncedInvoiceIdRef.current === pendingInvoiceId) {
      return
    }
    syncedInvoiceIdRef.current = pendingInvoiceId

    syncMutation
      .mutateAsync(pendingInvoiceId)
      .then((result) => setOutcome(outcomeFromInvoiceStatus(result.data.status)))
      .catch(() => setOutcome(resolveOutcomeFromUrl(pathname, searchParams)))
      // Xóa dù thành công hay lỗi: giữ lại thì lần thanh toán sau vào trang này sẽ đối soát nhầm
      // hóa đơn cũ.
      .finally(() => clearPendingInvoice())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingInvoiceId])

  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: mySubscriptionQueryKeys.all })
    void queryClient.invalidateQueries({ queryKey: mySubscriptionUsageQueryKeys.all })
    void queryClient.invalidateQueries({ queryKey: invoiceQueryKeys.all })
  }, [queryClient])

  // Nếu người dùng cứ đứng yên ở đây (vd kết quả vẫn "pending" chờ job đối soát định kỳ phía BE),
  // tự quay lại trang Gói dịch vụ sau 60s để không bị kẹt mãi ở màn hình chờ.
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((current) => current - 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (secondsLeft <= 0) {
      navigate(resolvedBackTo)
    }
  }, [navigate, resolvedBackTo, secondsLeft])

  const display = OUTCOME_DISPLAY[outcome]
  const Icon = display.icon

  return (
    <section className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <div className={`mx-auto flex size-14 items-center justify-center rounded-full ${display.iconClass}`}>
          <Icon aria-hidden="true" className={`size-7 ${outcome === 'checking' ? 'animate-spin' : ''}`} />
        </div>
        <h1 className="mt-4 text-xl font-extrabold text-blue-950">{display.title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{display.message}</p>
        <button
          className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-indigo-600 px-5 text-sm font-black text-white transition hover:bg-indigo-700"
          onClick={() => navigate(resolvedBackTo)}
          type="button"
        >
          Quay lại Gói dịch vụ
        </button>
        <p className="mt-3 text-xs text-slate-400">Tự động quay lại sau {Math.max(0, secondsLeft)}s</p>
      </div>
    </section>
  )
}
