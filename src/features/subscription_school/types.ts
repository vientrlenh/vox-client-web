import { FileCheck2, Headphones, type LucideIcon } from 'lucide-react'

export type QuotaType = 'EXAM' | 'PRACTICE'
export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'SUSPENDED'
export type SubscriptionPlanStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
export type SubscriptionPlanPeriod = 'DAY' | 'MONTH' | 'YEAR'
export type RequestType = 'REGISTRATION' | 'UPGRADE'
export type OrderStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'EXPIRED'
export type OrderType = 'SUBSCRIPTION_REQUEST' | 'SUBSCRIPTION_UPGRADE' | 'TOPUP'
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED'
export type SchoolDebtEventType = 'LOCKED' | 'CAP_EXCEEDED' | 'CLEARED'

export const QUOTA_TYPES: QuotaType[] = ['EXAM', 'PRACTICE']

export const QUOTA_LABELS: Record<QuotaType, string> = {
  EXAM: 'Chấm thi (thi tập trung & kiểm tra trên lớp)',
  PRACTICE: 'Lượt ôn luyện cá nhân',
}

export const QUOTA_ICONS: Record<QuotaType, LucideIcon> = {
  EXAM: FileCheck2,
  PRACTICE: Headphones,
}

export type PlanQuota = {
  id: string
  quotaType: QuotaType
  // Định mức bao gồm trong giá gói, quy ra VND -- xem SubscriptionPlanQuota ở BE. Không còn
  // tokenUnitPrice: đơn giá "VND cho mỗi $1" trước đây tính sai lệch với tỷ giá thật.
  includedAmountVnd: number
}

export type SubscriptionPlan = {
  id: string
  name: string
  tagline: string | null
  priceVnd: number
  // Chu kỳ gói = periodType x periodCount (vd MONTH x 12), thay cho validityDays cũ.
  periodType: SubscriptionPlanPeriod
  periodCount: number
  maxTimePerAttemptMin: number | null
  status: SubscriptionPlanStatus
  replacedByPlanId: string | null
  quotas: PlanQuota[]
  // Gói đang có nhiều trường dùng nhất toàn hệ thống -- đến từ SubscriptionPlanListItem.isMostPopular
  // ở tầng query, gộp vào đây cho tiện dùng trong UI danh sách gói.
  isMostPopular?: boolean
}

export type SubscriptionPlanPage = {
  content: SubscriptionPlan[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type RenewalPreview = {
  // true = gói gia hạn khác gói đang dùng (trường bị chuyển sang gói thay thế vì gói cũ đã ARCHIVED).
  planChanged: boolean
  currentPlan: SubscriptionPlan
  renewalPlan: SubscriptionPlan
  // Kỳ mới bắt đầu chạy khi nào -- ngay bây giờ nếu không còn kỳ nào hiệu lực, hoặc ngày hết hạn
  // của kỳ hiện tại. KHÔNG có bù trừ ngày chưa dùng: kỳ mới nối tiếp kỳ đang chạy, không đè lên.
  startsAt: string
  // Giá gói gia hạn, CHƯA gồm phí dịch vụ -- phí cộng vào lúc đặt đơn.
  amountDue: number
}

export type MySubscription = {
  id: string
  schoolId: string
  subscriptionPlanId: string
  startDate: string | null
  endDate: string | null
  status: SubscriptionStatus
  pricePaidSnapshot: number
  cancelledAt: string | null
  // System Admin cưỡng chế đình chỉ (mất quyền dùng NGAY, khác cancelledAt chỉ tắt gia hạn) — cả 2 null
  // khi không bị đình chỉ.
  suspendedAt: string | null
  suspendedReason: string | null
  plan: SubscriptionPlan | null
}

export type SubscriptionQuota = {
  id: string
  schoolSubscriptionId: string
  quotaType: QuotaType
  totalAllocatedAmountVnd: number
  usedAmountVnd: number
}

export type OrderItem = {
  id: string
  orderId: string
  type: string | null
  itemId: string
  unitPriceVnd: number | null
  amountVnd: number | null
  quantity: number | null
}

export type OrderInvoice = {
  invoiceNumber: string
  issueDate: string
}

export type Payment = {
  id: string
  orderId: string
  amountVnd: number
  method: string | null
  provider: string | null
  status: PaymentStatus
  providerOrderRef: string | null
  // Chỉ có ở lần thử còn PENDING -- phiên của lần thử đã chốt thì bên cổng đã đóng.
  checkoutUrl: string | null
  paidAt: string | null
  createdAt: string | null
}

export type Order = {
  id: string
  schoolId: string | null
  type: OrderType
  description: string | null
  subtotalAmountVnd: number | null
  totalAmountVnd: number | null
  chargedFeeVnd: number | null
  discountAmountVnd: number | null
  status: OrderStatus
  createdAt: string | null
  updatedAt: string | null
  expiresAt: string | null
  items: OrderItem[] | null
  // NULL khi đơn chưa thu được tiền -- chỉ đơn SUCCESS mới được phát hóa đơn.
  invoice: OrderInvoice | null
  // Mới nhất trước, rỗng khi trường chưa bấm thanh toán lần nào.
  payments: Payment[]
}

export type OrderPage = {
  content: Order[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

// Sổ audit "nguyên nhân nợ hạn mức AI" của chính trường mình -- xem ViewSchoolDebtEventsUseCase.
export type SchoolDebtEvent = {
  id: string
  schoolId: string
  subscriptionId: string
  eventType: SchoolDebtEventType
  quotaType: QuotaType
  triggerExamSessionId: string | null
  triggerAmountVnd: number | null
  totalAllocatedVnd: number
  usedAmountVnd: number
  overageVnd: number
  occurredAt: string | null
}

export type SchoolDebtEventPage = {
  content: SchoolDebtEvent[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

// Hình dạng của link thanh toán do @/shared/payment định nghĩa vì cả subscription_school và
// subscription_system đều dùng chung, và vì cách mở trang thanh toán (redirect hay POST form) có
// ràng buộc chữ ký không được phép mỗi nơi tự hiểu một kiểu.
export type { PaymentLink, PaymentMethod } from '@/shared/payment/types'

// Số tiền VND người dùng muốn nạp thêm cho từng ví hạn mức -- chỉ là tiện ích chia nhỏ lúc nhập
// liệu, lúc đặt đơn cả hai được CỘNG LẠI thành một khoản creditAmountVnd duy nhất nạp vào
// SchoolBalance chung của trường (BE không có khái niệm nạp riêng theo từng loại quota).
export type TokenTopUpState = Record<QuotaType, number>

export type DistributionMode = 'AUTO' | 'MANUAL'

export type QuotaUserAllocation = {
  userId: string
  fullName: string | null
  quotaType: QuotaType
  allocatedAmountVnd: number
  usedAmountVnd: number
}

export type QuotaUserAllocationPool = {
  id: string
  schoolSubscriptionId: string
  quotaType: QuotaType
  totalAllocatedAmountVnd: number
  usedAmountVnd: number
}

export type QuotaUserAllocationSummary = {
  pool: QuotaUserAllocationPool
  allocations: QuotaUserAllocation[]
}

export type UserQuotaAmount = {
  userId: string
  amountVnd: number
}

export type AllocateQuotaPayload = {
  mode: DistributionMode
  allocations: UserQuotaAmount[]
}

export type MutationResult<TData> = {
  data: TData
  message: string
}

export function formatVnd(value?: number | null) {
  const amount = Number(value) || 0
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(amount))} ₫`
}

export function formatDate(value?: string | null) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
  }).format(date)
}

export function formatDateTime(value?: string | null) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
  }).format(date)
}

export function formatMinutes(minutes?: number | null) {
  if (!minutes) {
    return '-'
  }

  return `${Math.round(minutes)} phút`
}

const PERIOD_LABELS: Record<SubscriptionPlanPeriod, string> = {
  DAY: 'ngày',
  MONTH: 'tháng',
  YEAR: 'năm',
}

export function formatPlanPeriod(periodType: SubscriptionPlanPeriod, periodCount: number) {
  return `${periodCount} ${PERIOD_LABELS[periodType]}`
}

const VN_TIMEZONE_OFFSET_MS = 7 * 60 * 60 * 1000

export function daysUntil(value?: string | null) {
  if (!value) {
    return null
  }

  const end = new Date(value)

  if (Number.isNaN(end.getTime())) {
    return null
  }

  // "end" là LocalDate "yyyy-MM-dd" từ BE nên new Date() parse ra đúng UTC midnight của ngày đó.
  // Phải quy "hôm nay" về cùng kiểu neo (UTC midnight của ngày lịch theo giờ VN) trước khi trừ —
  // nếu trừ thẳng với Date.now() (thời điểm thực), quanh ranh giới nửa đêm giờ VN kết quả có thể
  // lệch tới 7 tiếng so với số ngày thực tế còn lại theo lịch VN.
  const nowVn = new Date(Date.now() + VN_TIMEZONE_OFFSET_MS)
  const todayVnAsUtcMidnight = Date.UTC(nowVn.getUTCFullYear(), nowVn.getUTCMonth(), nowVn.getUTCDate())

  return Math.round((end.getTime() - todayVnAsUtcMidnight) / (1000 * 60 * 60 * 24))
}

const EXPIRING_THRESHOLD_DAYS = 7

export function getSubscriptionStatusDisplay(
  status: SubscriptionStatus,
  endDate?: string | null,
  cancelledAt?: string | null,
) {
  if (status === 'SUSPENDED') {
    return { label: 'Đã đình chỉ', tone: 'danger' as const }
  }

  if (status === 'ACTIVE') {
    // Đã bấm Hủy nhưng gói không cắt ngay — dùng bình thường tới hết endDate, chỉ là sẽ không tự
    // gia hạn nữa.
    if (cancelledAt) {
      return { label: 'Sẽ hết hạn (đã hủy)', tone: 'neutral' as const }
    }

    const remaining = daysUntil(endDate)

    if (remaining !== null && remaining <= EXPIRING_THRESHOLD_DAYS && remaining >= 0) {
      return { label: 'Sắp hết hạn', tone: 'warning' as const }
    }

    return { label: 'Đang hoạt động', tone: 'success' as const }
  }

  if (status === 'EXPIRED') {
    return { label: 'Đã hết hạn', tone: 'danger' as const }
  }

  return { label: 'Đã hủy', tone: 'neutral' as const }
}

export function getOrderStatusDisplay(status: OrderStatus) {
  if (status === 'SUCCESS') {
    return { label: 'Thành công', tone: 'success' as const }
  }

  if (status === 'PENDING') {
    return { label: 'Chờ thanh toán', tone: 'warning' as const }
  }

  if (status === 'CANCELLED') {
    return { label: 'Đã hủy', tone: 'neutral' as const }
  }

  if (status === 'EXPIRED') {
    return { label: 'Đã hết hạn', tone: 'neutral' as const }
  }

  return { label: 'Thất bại', tone: 'danger' as const }
}

export function getDebtEventDisplay(eventType: SchoolDebtEventType) {
  if (eventType === 'LOCKED') {
    return { label: 'Khóa do nợ', tone: 'danger' as const }
  }

  if (eventType === 'CAP_EXCEEDED') {
    return { label: 'Vượt trần cảnh báo', tone: 'warning' as const }
  }

  return { label: 'Đã hết nợ', tone: 'success' as const }
}

// overageVnd = usedAmountVnd - totalAllocatedVnd (xem SchoolDebtNotificationService.logDebtEvent) --
// dương nghĩa là đang vượt hạn mức, âm nghĩa là đã hết nợ và còn dư bấy nhiêu VND hạn mức.
export function getOverageDisplay(overageVnd: number) {
  if (overageVnd > 0) {
    return { label: `Vượt ${formatVnd(overageVnd)}`, tone: 'danger' as const }
  }

  if (overageVnd < 0) {
    return { label: `Còn dư ${formatVnd(Math.abs(overageVnd))}`, tone: 'success' as const }
  }

  return { label: formatVnd(0), tone: 'neutral' as const }
}
