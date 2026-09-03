export type OrderType = 'SUBSCRIPTION_REQUEST' | 'SUBSCRIPTION_UPGRADE' | 'TOPUP'
export type OrderStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'EXPIRED'

export type OrderItem = {
  id: string
  type: string | null
  itemId: string
  unitPriceVnd: number | null
  amountVnd: number | null
  quantity: number | null
}

/** Hóa đơn chỉ tồn tại SAU khi tiền về, nên null ở đây là câu trả lời đúng chứ không phải nạp hụt. */
export type Invoice = {
  invoiceNumber: string
  issueDate: string
}

export type PaymentRecordStatus = 'PENDING' | 'PAID' | 'FAILED'

/** Một LẦN THỬ thanh toán cho đơn — một đơn có thể có nhiều dòng nếu trường thử lại sau khi hủy/hết hạn phiên. */
export type PaymentRecord = {
  id: string
  orderId: string
  amountVnd: number | null
  method: string | null
  provider: string | null
  status: PaymentRecordStatus
  providerOrderRef: string | null
  /** Chỉ khác null khi dòng còn PENDING. */
  checkoutUrl: string | null
  paidAt: string | null
  createdAt: string | null
}

/**
 * Đơn mang BỐN con số tiền: bất biến {@code total = subtotal + fee - discount}.
 *
 * Hiện dòng phí và dòng bù theo SỐ TIỀN (> 0), không theo loại đơn: "chỉ nạp thêm mới có phí" là
 * luật ở factory của Order, không phải ràng buộc của DB — schema cho phép đơn gói mang phí, và nó
 * đã mang thật.
 */
export type Order = {
  id: string
  type: OrderType
  description: string | null
  subtotalAmountVnd: number | null
  chargedFeeVnd: number | null
  discountAmountVnd: number | null
  totalAmountVnd: number | null
  status: OrderStatus
  createdAt: string | null
  updatedAt: string | null
  /** Hạn chót trả tiền, chốt lúc tạo đơn — KHÔNG tự tính từ updatedAt cộng hằng số. */
  expiresAt: string | null
  items: OrderItem[] | null
  invoice: Invoice | null
  payments: PaymentRecord[] | null
}

export type OrderPage = {
  content: Order[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  SUBSCRIPTION_REQUEST: 'Đăng ký gói',
  SUBSCRIPTION_UPGRADE: 'Nâng cấp gói',
  TOPUP: 'Nạp thêm số dư',
}

export function getOrderStatusDisplay(status: OrderStatus) {
  if (status === 'SUCCESS') {
    return { label: 'Đã thanh toán', tone: 'success' as const }
  }
  if (status === 'PENDING') {
    return { label: 'Chờ thanh toán', tone: 'warning' as const }
  }
  if (status === 'EXPIRED') {
    return { label: 'Đã hết hạn', tone: 'neutral' as const }
  }
  if (status === 'CANCELLED') {
    return { label: 'Đã hủy', tone: 'neutral' as const }
  }
  return { label: 'Thất bại', tone: 'danger' as const }
}

/**
 * Đích sau khi trả tiền xong. Đơn nạp thêm KHÔNG đụng tới gói — nó cộng vào ví cấp trường — nên
 * đưa về trang gói là chỉ vào một thứ không hề đổi.
 */
export function getPaidDestination(type: OrderType) {
  if (type === 'TOPUP') {
    return { label: 'Xem số dư ví', to: '/school-admin/subscription/mine' }
  }
  return { label: 'Xem gói của tôi', to: '/school-admin/subscription/mine' }
}
