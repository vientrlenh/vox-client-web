import { useEffect } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { Loader2 } from 'lucide-react'
import { clearPendingOrder, readPendingOrder } from '@/shared/payment/checkout'

/**
 * Điểm đáp của ba URL mà cổng thanh toán trả người dùng về.
 *
 * Trang này KHÔNG kết luận gì về kết quả: URL cổng trả về chỉ là thứ cổng nói, chưa qua xác thực
 * nào, và webhook có thể chưa tới. Việc duy nhất của nó là đưa người dùng về ĐÚNG ĐƠN, nơi có trạng
 * thái thật cùng vòng hỏi lại.
 *
 * Không tra được đơn thì về danh sách Đơn hàng — đơn vẫn nằm đó, kể cả đơn còn treo.
 */
export function PaymentResultPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    // BE dựng success_url/error_url/cancel_url theo từng phiên và chúng nằm TRONG chữ ký, nên khi
    // nào BE gắn ?orderId= vào đó thì đây là nguồn tin cậy hơn hẳn sessionStorage. Đọc trước.
    const orderId = searchParams.get('orderId') ?? readPendingOrder()

    if (!orderId) {
      clearPendingOrder()
      navigate('/school-admin/orders', { replace: true })
      return
    }

    // Người dùng chủ động hủy trên trang cổng thì đơn vẫn PENDING và chưa có gì để ghi nhận — về
    // thẳng đơn ở trạng thái chờ, không bật hộp "đang xác nhận".
    const isCancelled = location.pathname.endsWith('/cancel') || searchParams.get('cancel') === 'true'
    const target = isCancelled
      ? `/school-admin/orders/${orderId}`
      : `/school-admin/orders/${orderId}?settling=1`

    clearPendingOrder()
    navigate(target, { replace: true })
  }, [location.pathname, navigate, searchParams])

  return (
    <section className="mx-auto grid max-w-md gap-4 py-20 text-center">
      <Loader2 aria-hidden="true" className="mx-auto size-8 animate-spin text-indigo-600" />
      <p className="text-sm font-semibold text-slate-600">Đang đưa bạn về đơn hàng...</p>
      <Link className="text-sm font-semibold text-indigo-600 hover:text-indigo-800" to="/school-admin/orders">
        Về Đơn hàng
      </Link>
    </section>
  )
}
