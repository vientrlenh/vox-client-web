export type QuotaType = 'EXAM' | 'PRACTICE'
export type SubscriptionPlanStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
export type SchoolSubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'SUSPENDED'
export type SubscriptionPlanPeriod = 'DAY' | 'MONTH' | 'YEAR'

export const QUOTA_TYPES: QuotaType[] = ['EXAM', 'PRACTICE']

export const QUOTA_LABELS: Record<QuotaType, string> = {
  EXAM: 'Bài kiểm tra', 
  PRACTICE: 'Lượt ôn luyện cá nhân',
}

export const QUOTA_SHORT_LABELS: Record<QuotaType, string> = {
  EXAM: 'Kiểm tra', 
  PRACTICE: 'Ôn luyện',
}

export type SubscriptionPlanQuota = {
  id: string
  quotaType: QuotaType
  includedAmountVnd: number
}

export type SubscriptionPlan = {
  id: string
  name: string
  tagline: string | null
  priceVnd: number
  periodType: SubscriptionPlanPeriod
  periodCount: number
  maxTimePerAttemptMin: number | null
  status: SubscriptionPlanStatus
  version: number
  createdAt: string | null
  updatedAt: string | null
  createdBy: string | null
  updatedBy: string | null
  replacedByPlanId: string | null
  quotas: SubscriptionPlanQuota[]
}

export type SubscriptionPlanPage = {
  content: SubscriptionPlan[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type SubscriptionPlanListItem = {
  subscription: SubscriptionPlan
  isMostPopular: boolean
}

export type SchoolSubscription = {
  id: string
  schoolId: string
  subscriptionPlanId: string
  startDate: string | null
  endDate: string | null
  status: SchoolSubscriptionStatus
  pricePaidSnapshot: number
  cancelledAt: string | null
  createdAt: string | null
  // System Admin cưỡng chế đình chỉ (mất quyền dùng NGAY, khác cancelledAt chỉ tắt gia hạn) — cả 2 null
  // khi không bị đình chỉ.
  suspendedAt: string | null
  suspendedReason: string | null
  suspendedBy: string | null
  plan: Pick<
    SubscriptionPlan,
    'id' | 'maxTimePerAttemptMin' | 'name' | 'periodCount' | 'periodType' | 'priceVnd' | 'quotas'
  > | null
  // Đi qua dataloader schoolBySchoolSubscription ở BE — trước đây phải tra tên trường bằng một
  // lượt gọi riêng ở client rồi ghép tay theo schoolId.
  school: { id: string; name: string | null } | null
}

export type SchoolSubscriptionPage = {
  content: SchoolSubscription[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}


export type SchoolFilters = {
  keyword: string
  status: '' | SchoolSubscriptionStatus
  subscriptionPlanId: string
}

export type SubscriptionQuota = {
  id: string
  subscriptionId: string
  quotaType: QuotaType
  totalAllocatedAmountVnd: number
  usedAmountVnd: number
}

export type CreateSubscriptionPlanPayload = {
  name: string
  tagline: string // yêu cầu ở dưới backend kể cả trước chỉnh sửa thì vẫn là không được để trống
  priceVnd: number
  periodType: SubscriptionPlanPeriod
  periodCount: number
  maxTimePerAttemptMin: number // không null
  quotas: { 
    quotaType: QuotaType 
    includedAmountVnd: number 
  }[]
}

export type UpdateSubscriptionPlanPayload = Partial<CreateSubscriptionPlanPayload>

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

/**
 * Chu kỳ gói = periodCount x periodType, thay cho validityDays cũ. Gói tính theo tháng/năm thì hạn
 * phải rơi đúng ngày tương ứng, nên hiển thị đúng đơn vị BE đang dùng chứ không quy hết về ngày.
 */
export function formatPeriod(periodType?: SubscriptionPlanPeriod | null, periodCount?: number | null) {
  if (!periodType || !periodCount) {
    return '-'
  }

  return `${periodCount} ${PERIOD_LABELS[periodType]}`
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

/**
 * Đình chỉ và hủy là HAI việc khác nhau, và đây là chỗ dễ nhầm nhất:
 *
 * - SUSPENDED = System Admin cưỡng chế cắt quyền dùng NGAY.
 * - CANCELLED / cancelledAt = chỉ tắt gia hạn, trường vẫn dùng bình thường tới hết endDate.
 *
 * Hai ca đó phải khác tông màu, nếu không người trực sẽ đọc "đã hủy" thành "đã mất quyền" rồi đi
 * trấn an nhầm trường.
 */
export function getSchoolSubscriptionStatusDisplay(
  status: SchoolSubscriptionStatus,
  endDate?: string | null,
  cancelledAt?: string | null,
) {
  if (status === 'SUSPENDED') {
    return { label: 'Đình chỉ', tone: 'danger' as const }
  }

  if (status === 'EXPIRED') {
    return { label: 'Hết hạn', tone: 'neutral' as const }
  }

  if (status === 'CANCELLED' || cancelledAt) {
    return { label: 'Đã hủy gia hạn', tone: 'warning' as const }
  }

  const remaining = daysUntil(endDate)

  if (remaining !== null && remaining >= 0 && remaining <= EXPIRING_THRESHOLD_DAYS) {
    return { label: 'Sắp hết hạn', tone: 'warning' as const }
  }

  return { label: 'Đang chạy', tone: 'success' as const }
}

export function getPlanStatusDisplay(status: SubscriptionPlanStatus) {
  if (status === 'DRAFT') {
    return { label: 'Nháp', tone: 'neutral' as const }
  }

  if (status === 'ACTIVE') {
    return { label: 'Đang bán', tone: 'success' as const }
  }

  return { label: 'Ngừng bán', tone: 'warning' as const }
}

/**
 * Thông điệp lỗi để hiện cho người dùng.
 *
 * graphQLRequest và apiClient đều ném Error đã mang message tiếng Việt từ BE, nên ưu tiên dùng lại
 * nguyên văn; chỉ rơi về câu chung khi không đọc được gì.
 */
export function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }

  return 'Đã có lỗi xảy ra. Vui lòng thử lại.'
}
