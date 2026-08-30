// Danh sách cổng khớp PaymentProvider phía BE.
export type PaymentMethod = 'PAYOS' | 'SEPAY'

/**
 * Cách mở trang thanh toán, do BE quyết định thay vì FE suy ra từ tên cổng. Nhờ vậy thêm một cổng
 * mới không phải sửa FE — trước đây FE buộc phải biết "nếu là SePay thì submit form".
 */
export type CheckoutAction = 'FORM_POST' | 'NONE' | 'QR' | 'REDIRECT'

/**
 * Thông tin để trường TỰ chuyển khoản khi app ngân hàng không quét được mã.
 *
 * transferContent là trường nguy hiểm nhất: cổng dùng nó để khớp tiền với đơn, gõ sai thì tiền về
 * mà đơn vẫn treo và phải đối soát tay. Giao diện phải cho copy chứ đừng bắt gõ lại.
 */
export type BankTransferDetails = {
  bankBin: string | null
  accountNumber: string | null
  accountName: string | null
  amountVnd: number | null
  transferContent: string | null
}

/**
 * Một LẦN THỬ thanh toán cho một ĐƠN.
 *
 * Khác hẳn model cũ, nơi link gắn với HÓA ĐƠN: hóa đơn giờ chỉ được phát SAU khi tiền về, nên lúc mở
 * trang thanh toán nó chưa tồn tại. Điểm tra ngược là orderId + providerOrderRef.
 */
export type PaymentLink = {
  orderId: string
  paymentId: string
  /** Mã mình gửi sang cổng, cũng là thứ cổng gửi lại ở callback. */
  providerOrderRef: string
  provider: PaymentMethod
  action: CheckoutAction
  checkoutUrl: string | null
  /** Chuỗi VietQR để tự vẽ mã. Chỉ có khi action là QR. */
  qrCode: string | null
  /** Thông tin chuyển khoản tay đi kèm mã QR. Chỉ có khi action là QR. */
  transfer: BankTransferDetails | null
  // Các field ẩn phải POST khi action là FORM_POST, null khi là REDIRECT.
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
  PAYOS: 'Hiện mã QR ngay tại đây, không rời trang.',
  SEPAY: 'Chuyển sang trang của SePay rồi quay lại.',
}

export const DEFAULT_PAYMENT_METHOD: PaymentMethod = 'PAYOS'

export function isPaymentMethod(value: string): value is PaymentMethod {
  return (PAYMENT_METHODS as string[]).includes(value)
}
