import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { CircleCheck, CircleX, Clock, Loader2 } from 'lucide-react'
import { useAppSelector } from '@/app/store/hooks'
import { clearPendingOrder, readPendingOrder } from '@/shared/payment/checkout'
import { myOrdersQueryKeys, useMyOrdersQuery } from '../api/useMyOrdersQuery'
import { mySubscriptionQueryKeys } from '../api/useMySubscriptionQuery'
import { mySubscriptionUsageQueryKeys } from '../api/useMySubscriptionUsageQuery'
import type { OrderStatus } from '../types'

type Outcome = 'cancelled' | 'checking' | 'failed' | 'pending' | 'success'

function outcomeFromOrderStatus(status: OrderStatus): Outcome {
  if (status === 'SUCCESS') {
    return 'success'
  }
  if (status === 'CANCELLED') {
    return 'cancelled'
  }
  if (status === 'FAILED' || status === 'EXPIRED') {
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

// Dùng làm outcome hiển thị tức thời (và fallback khi không lưu được orderId lúc rời trang, hoặc
// không tải được lịch sử đơn để đối soát) — đoán tạm từ đường dẫn/query param. Kém tin cậy hơn
// trạng thái thật từ BE vì đây chỉ là thứ cổng thanh toán nói trên URL, chưa qua xác thực nào; trạng
// thái thật (chốt bởi webhook hoặc job đối soát định kỳ phía BE) sẽ ghi đè ngay khi poll thấy được.
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
    message: 'Bạn đã hủy giao dịch trên cổng thanh toán. Gói / số dư chưa được kích hoạt hoặc cộng thêm.',
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
    message: 'Giao dịch không thành công. Gói / số dư chưa được kích hoạt hoặc cộng thêm. Vui lòng thử lại.',
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
    message: 'Thanh toán thành công. Gói / số dư của trường sẽ được kích hoạt hoặc cộng thêm trong giây lát.',
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

// Không có endpoint đối soát chủ động một-lần phía BE (webhook và PendingOrderReconciler tự chốt
// đơn ở phía sau) — poll ngắn hạn lịch sử đơn gần nhất thay vào đó, để vẫn bắt kịp lúc BE chốt xong
// mà không cần trang này tự gây ra một lần "chốt" nào.
const RECENT_ORDERS_PAGE_SIZE = 5
const POLL_INTERVAL_MS = 3000

export function PaymentResultPage({ backTo }: PaymentResultPageProps) {
  const [searchParams] = useSearchParams()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAppSelector((state) => state.auth.user)

  // Đọc một lần lúc mount: goToCheckout() đã lưu orderId vào sessionStorage ngay trước khi rời
  // trang. Poll liên tục theo chu kỳ cố định trong suốt vòng đời trang này (tối đa AUTO_REDIRECT_SECONDS
  // nhờ effect tự điều hướng đi bên dưới) thay vì tự tắt sớm — vài lần gọi thừa sau khi đã có kết quả
  // là chấp nhận được, đổi lại tránh phải suy luận thời điểm "dừng" bằng state phái sinh.
  const [pendingOrderId] = useState(() => readPendingOrder())
  const [secondsLeft, setSecondsLeft] = useState(AUTO_REDIRECT_SECONDS)

  const ordersQuery = useMyOrdersQuery(1, RECENT_ORDERS_PAGE_SIZE, {
    enabled: Boolean(pendingOrderId),
    refetchInterval: POLL_INTERVAL_MS,
  })

  const matchedOrder = pendingOrderId
    ? ordersQuery.data?.content.find((order) => order.id === pendingOrderId)
    : undefined

  const outcome: Outcome = matchedOrder
    ? outcomeFromOrderStatus(matchedOrder.status)
    : pendingOrderId && !ordersQuery.isError
      ? 'checking'
      : resolveOutcomeFromUrl(pathname, searchParams)

  const resolvedBackTo =
    backTo ?? (user?.roles.includes('SYSTEM_ADMIN') ? SYSTEM_ADMIN_BACK_TO : SCHOOL_ADMIN_BACK_TO)

  // Xóa orderId đã ghi nhớ ngay khi biết chắc kết quả (không còn PENDING): giữ lại thì lần thanh
  // toán sau vào trang này sẽ đối chiếu nhầm đơn cũ. Không đụng React state ở đây nên không kích
  // hoạt render lại — chỉ dọn sessionStorage.
  useEffect(() => {
    if (pendingOrderId && matchedOrder && matchedOrder.status !== 'PENDING') {
      clearPendingOrder()
    }
    // Chỉ theo dõi status (giá trị nguyên thủy): matchedOrder là object mới mỗi lần poll dù nội
    // dung không đổi, đưa cả object vào deps sẽ khiến effect chạy lại mỗi 3s vô ích.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedOrder?.status, pendingOrderId])

  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: mySubscriptionQueryKeys.all })
    void queryClient.invalidateQueries({ queryKey: mySubscriptionUsageQueryKeys.all })
    void queryClient.invalidateQueries({ queryKey: myOrdersQueryKeys.all })
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
        <h1 className="mt-4 text-2xl font-black text-blue-950">{display.title}</h1>
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
