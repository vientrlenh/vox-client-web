// Danh sách cổng khớp với PaymentMethodRequest.VALID_METHODS phía BE. MANUAL cố tình không có ở
// đây: đó là hóa đơn đối soát tay, không cổng nào tạo được link thanh toán cho nó.
export type PaymentMethod = 'PAYOS' | 'SEPAY'

/**
 * Cách mở trang thanh toán, do BE quyết định thay vì FE suy ra từ tên cổng. Nhờ vậy thêm một cổng
 * mới không phải sửa FE — trước đây FE buộc phải biết "nếu là SePay thì submit form".
 *
 * 'NONE': đơn đã chốt PAID ngay lúc tạo link (vd amountDue = 0 sau khi bù đủ 100% giá gói mới lúc
 * nâng cấp), không có gì để điều hướng sang cổng — xem CreatePaymentCheckoutUrlUseCase ở BE.
 */
export type CheckoutAction = 'FORM_POST' | 'NONE' | 'REDIRECT'

// Khớp PaymentCheckoutResponse ở BE (POST /api/v1/payments/checkout-url). KHÔNG còn invoiceId:
// hóa đơn chỉ phát sau khi tiền về, lúc phát link chưa có hóa đơn nào tồn tại -- FE đối soát kết
// quả thanh toán bằng orderId, xem PaymentResultPage.
export type PaymentLink = {
  orderId: string
  paymentId: string
  providerOrderRef: string | null
  provider: PaymentMethod
  action: CheckoutAction
  checkoutUrl: string
  // Các field ẩn phải POST khi action là FORM_POST, rỗng khi là REDIRECT.
  //
  // THỨ TỰ KEY LÀ MỘT PHẦN CỦA HỢP ĐỒNG, không phải chi tiết trình bày: SePay ký HMAC trên chuỗi
  // ghép các cặp key=value theo đúng thứ tự BE đã dựng. Sắp xếp lại hay dựng lại object ở giữa
  // đường là mọi giao dịch bị từ chối vì sai chữ ký.
  fields: Record<string, string> | null
}

export const PAYMENT_METHODS: PaymentMethod[] = ['PAYOS', 'SEPAY']

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  PAYOS: 'PayOS',
  SEPAY: 'SePay',
}

export const PAYMENT_METHOD_DESCRIPTIONS: Record<PaymentMethod, string> = {
  PAYOS: 'Quét mã VietQR hoặc chuyển khoản qua ứng dụng ngân hàng.',
  SEPAY: 'Chuyển khoản ngân hàng, thẻ nội địa hoặc thẻ quốc tế.',
}

export const DEFAULT_PAYMENT_METHOD: PaymentMethod = 'PAYOS'

// Dùng cho confirmWithSelection() ở các luồng chỉ có một nút bấm, không có dialog riêng.
export const PAYMENT_METHOD_OPTIONS = PAYMENT_METHODS.map((method) => ({
  label: PAYMENT_METHOD_LABELS[method],
  value: method as string,
}))

export function isPaymentMethod(value: string): value is PaymentMethod {
  return (PAYMENT_METHODS as string[]).includes(value)
}
