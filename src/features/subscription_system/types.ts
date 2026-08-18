export type QuotaType = 'GRADING' | 'CLASS_TEST' | 'PRACTICE'
export type PlanStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'SUSPENDED'
export type RequestType = 'REGISTRATION' | 'UPGRADE'
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type InvoiceStatus = 'PAID' | 'PENDING' | 'FAILED' | 'CANCELLED'
export type SchoolDebtEventType = 'LOCKED' | 'CAP_EXCEEDED' | 'CLEARED'

export const QUOTA_TYPES: QuotaType[] = ['GRADING', 'CLASS_TEST', 'PRACTICE']

export const QUOTA_LABELS: Record<QuotaType, string> = {
  CLASS_TEST: 'Bài kiểm tra trên lớp',
  GRADING: 'Bài Kiểm Tra Tập Trung',
  PRACTICE: 'Lượt ôn luyện cá nhân',
}

export const QUOTA_SHORT_LABELS: Record<QuotaType, string> = {
  CLASS_TEST: 'KT lớp',
  GRADING: 'Chấm bài',
  PRACTICE: 'Ôn luyện',
}

export type PlanQuota = {
  id: string
  quotaType: QuotaType
  includedQuantity: number
  tokenUnitPrice: number
}

export type SubscriptionPlan = {
  id: string
  name: string
  tagline: string | null
  pricePerYear: number
  validityDays: number
  maxTimePerAttemptMin: number | null
  popular: boolean
  status: PlanStatus
  version: number
  createdAt: string | null
  createdBy: string | null
  replacedByPlanId: string | null
  // Margin dịch vụ riêng của gói này (vd 0.20 = 20%) -- kết hợp với usdToVndRate (quotaPricing
  // query) để tính giá gợi ý, không ảnh hưởng quota deduction/guard.
  serviceFeeRatio: number
  quotas: PlanQuota[]
}

export type SubscriptionPlanPage = {
  content: SubscriptionPlan[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type SchoolSubscription = {
  id: string
  schoolId: string
  planId: string
  startDate: string | null
  endDate: string | null
  status: SubscriptionStatus
  pricePaidSnapshot: number
  cancelledAt: string | null
  createdAt: string | null
  // System Admin cưỡng chế đình chỉ (mất quyền dùng NGAY, khác cancelledAt chỉ tắt gia hạn) — cả 2 null
  // khi không bị đình chỉ.
  suspendedAt: string | null
  suspendedReason: string | null
  plan: Pick<SubscriptionPlan, 'id' | 'name' | 'pricePerYear' | 'maxTimePerAttemptMin' | 'quotas' | 'serviceFeeRatio'> | null
}

export type SchoolSubscriptionPage = {
  content: SchoolSubscription[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type SubscriptionRequest = {
  id: string
  schoolId: string
  requestType: RequestType
  currentPlanId: string | null
  requestedPlanId: string
  amount: number
  status: RequestStatus
  submittedAt: string | null
  reviewedBy: string | null
  reviewedAt: string | null
}

export type SubscriptionRequestPage = {
  content: SubscriptionRequest[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type SchoolFilters = {
  keyword: string
  planId: string
  status: '' | SubscriptionStatus
}

export type SubscriptionQuota = {
  id: string
  subscriptionId: string
  quotaType: QuotaType
  totalAllocated: number
  usedQuantity: number
}

export type Invoice = {
  id: string
  invoiceNumber: string
  subscriptionId: string
  sourceType: 'SUBSCRIPTION' | 'SUBSCRIPTION_REQUEST' | 'TOKEN_PURCHASE'
  sourceId: string
  issueDate: string | null
  amount: number
  status: InvoiceStatus
  paymentLinkId: string | null
  checkoutUrl: string | null
  paidAt: string | null
}

export type InvoicePage = {
  content: Invoice[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

// Sổ audit "nguyên nhân nợ hạn mức AI" -- chỉ system admin xem được (xem ViewSchoolDebtEventsUseCase).
export type SchoolDebtEvent = {
  id: string
  schoolId: string
  subscriptionId: string
  eventType: SchoolDebtEventType
  quotaType: QuotaType
  triggerExamSessionId: string | null
  triggerAmountUsd: number | null
  totalAllocatedUsd: number
  usedQuantityUsd: number
  overageUsd: number
  occurredAt: string | null
}

export type SchoolDebtEventPage = {
  content: SchoolDebtEvent[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type CreatePlanPayload = {
  name: string
  tagline: string | null
  pricePerYear: number
  validityDays: number
  maxTimePerAttemptMin: number | null
  // Bỏ trống (undefined) -> BE tự mặc định 0.20 (20%).
  serviceFeeRatio?: number
  quotas: { quotaType: QuotaType; includedQuantity: number }[]
}

export type UpdatePlanPayload = Partial<CreatePlanPayload>

export type MutationResult<TData> = {
  data: TData
  message: string
}

// Xem ghi chú ở subscription_school/types.ts — hình dạng link thanh toán dùng chung cho cả hai
// feature nên được định nghĩa một chỗ duy nhất.
export type { PaymentLink, PaymentMethod } from '@/shared/payment/types'

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
    year: 'numeric',
  }).format(date)
}

export function formatMinutes(minutes?: number | null) {
  if (!minutes) {
    return '-'
  }

  return `${Math.round(minutes)} phút`
}

// includedQuantity / tokenUnitPrice của quota tính theo USD chi phí AI ước tính (xem
// AI_USAGE_QUOTA_USD_MIGRATION.md) — hiển thị/nhập liệu thẳng, không quy đổi đơn vị.
export function formatUsd(value?: number | null) {
  const amount = Number(value) || 0
  return `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(amount)}`
}

export function formatNullableText(value?: string | null) {
  return value?.trim() ? value : '-'
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

  const diffMs = end.getTime() - todayVnAsUtcMidnight
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
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
    // Đã bấm Hủy nhưng gói không cắt ngay — dùng bình thường tới hết endDate (kiểu Claude), chỉ là
    // sẽ không tự gia hạn nữa.
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

export function getPlanStatusDisplay(status: PlanStatus) {
  if (status === 'DRAFT') {
    return { label: 'Nháp', tone: 'warning' as const }
  }

  if (status === 'ACTIVE') {
    return { label: 'Đang áp dụng', tone: 'success' as const }
  }

  return { label: 'Đã lưu trữ', tone: 'neutral' as const }
}

export function getRequestStatusDisplay(status: RequestStatus) {
  if (status === 'PENDING') {
    return { label: 'Chờ xử lý', tone: 'warning' as const }
  }

  if (status === 'APPROVED') {
    return { label: 'Đã duyệt', tone: 'success' as const }
  }

  return { label: 'Đã từ chối', tone: 'danger' as const }
}

export function getInvoiceStatusDisplay(status: InvoiceStatus) {
  if (status === 'PAID') {
    return { label: 'Đã thanh toán', tone: 'success' as const }
  }

  if (status === 'PENDING') {
    return { label: 'Chờ thanh toán', tone: 'warning' as const }
  }

  if (status === 'CANCELLED') {
    return { label: 'Đã hủy', tone: 'neutral' as const }
  }

  return { label: 'Thất bại', tone: 'danger' as const }
}

// overageUsd = usedQuantityUsd - totalAllocatedUsd (xem SchoolDebtNotificationService.logDebtEvent) --
// dương nghĩa là đang vượt hạn mức, âm nghĩa là đã hết nợ và còn dư bấy nhiêu USD hạn mức.
export function getOverageDisplay(overageUsd: number) {
  if (overageUsd > 0) {
    return { label: `Vượt ${formatUsd(overageUsd)}`, tone: 'danger' as const }
  }

  if (overageUsd < 0) {
    return { label: `Còn dư ${formatUsd(Math.abs(overageUsd))}`, tone: 'success' as const }
  }

  return { label: formatUsd(0), tone: 'neutral' as const }
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

export function getRequestTypeDisplay(type: RequestType) {
  if (type === 'UPGRADE') {
    return { label: 'Nâng cấp', tone: 'violet' as const }
  }

  return { label: 'Đăng ký mới', tone: 'info' as const }
}
