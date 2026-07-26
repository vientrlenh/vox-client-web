export type QuotaType = 'GRADING' | 'CLASS_TEST' | 'PRACTICE'
export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED'
export type RequestType = 'REGISTRATION' | 'UPGRADE'
export type InvoiceStatus = 'PAID' | 'PENDING' | 'FAILED' | 'CANCELLED'

export const QUOTA_TYPES: QuotaType[] = ['GRADING', 'CLASS_TEST', 'PRACTICE']

export const QUOTA_LABELS: Record<QuotaType, string> = {
  CLASS_TEST: 'Bài kiểm tra trên lớp',
  GRADING: 'Bài thi cần chấm',
  PRACTICE: 'Lượt ôn luyện cá nhân',
}

// includedQuantity / totalAllocated / usedQuantity đều tính bằng GIÂY audio xử lý —
// quy đổi sang phút khi hiển thị cho dễ hiểu, chỉ gửi lại giây khi gọi API.
export function secondsToMinutes(seconds?: number | null) {
  return Math.round((Number(seconds) || 0) / 60)
}

export function minutesToSeconds(minutes?: number | null) {
  return Math.round((Number(minutes) || 0) * 60)
}

export function formatQuotaMinutes(seconds?: number | null) {
  return `${new Intl.NumberFormat('vi-VN').format(secondsToMinutes(seconds))} phút`
}

export function formatPricePerMinute(pricePerSecond?: number | null) {
  return `${formatVnd((Number(pricePerSecond) || 0) * 60)} / phút`
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
  status: 'ACTIVE' | 'ARCHIVED'
  quotas: PlanQuota[]
}

export type SubscriptionPlanPage = {
  content: SubscriptionPlan[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type MySubscription = {
  id: string
  schoolId: string
  planId: string
  startDate: string | null
  endDate: string | null
  status: SubscriptionStatus
  pricePaidSnapshot: number
  cancelledAt: string | null
  plan: SubscriptionPlan | null
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

export type PaymentLink = {
  invoiceId: string
  orderCode: number
  paymentLinkId: string
  checkoutUrl: string
}

export type TokenTopUpState = Record<QuotaType, number>

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

export function daysUntil(value?: string | null) {
  if (!value) {
    return null
  }

  const end = new Date(value)

  if (Number.isNaN(end.getTime())) {
    return null
  }

  return Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

const EXPIRING_THRESHOLD_DAYS = 30

export function getSubscriptionStatusDisplay(status: SubscriptionStatus, endDate?: string | null) {
  if (status === 'ACTIVE') {
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

export function getUsageBarColor(pct: number) {
  if (pct >= 90) {
    return '#ef4444'
  }
  if (pct >= 75) {
    return '#f59e0b'
  }
  return '#4f46e5'
}
