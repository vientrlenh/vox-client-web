// Hóa đơn, đơn hàng và số dư ví trường KHÔNG còn ở đây -- chúng là miền riêng, tách sang thư mục
// của chúng. Thuê bao chỉ biết tới gói, kỳ và hạn mức.

// Mô hình gói, kỳ thuê bao và hạn mức sống ở ./model -- re-export để mọi nơi đang import từ
// '../types' không phải đổi đường dẫn, và để KHÔNG tồn tại hai định nghĩa song song cho cùng một
// thứ (MySubscription rò tới tận exam, examCore và classTest qua examCore/utils/subscriptionWindow).
export type {
  MySubscription,
  PlanQuota,
  QuotaType,
  SubscriptionPlan,
  SubscriptionPlanPeriod,
  SubscriptionQuotaRecord,
  SubscriptionStatus,
} from './model'
export { QUOTA_ICONS, QUOTA_LABELS, QUOTA_SHORT_LABELS, QUOTA_TYPES, formatPeriod } from './model'

import type { QuotaType, SubscriptionPlan, SubscriptionQuotaRecord, SubscriptionStatus } from './model'

export type SubscriptionPlanListItem = {
  subscription: SubscriptionPlan
  /** Gói nhiều trường dùng nhất TOÀN hệ thống -- không phải nhiều nhất trong trang hiện tại. */
  isMostPopular: boolean
}

export type SubscriptionPlanPage = {
  content: SubscriptionPlanListItem[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

/**
 * Xem trước lần gia hạn -- khớp SchoolSubscriptionRenewalPreview ở schema.
 *
 * KHÔNG còn unusedCreditAmount: bù trừ ngày chưa dùng giờ chỉ xảy ra khi NÂNG CẤP (cắt ngang kỳ),
 * còn gia hạn thì nối tiếp kỳ cũ nên không có ngày nào bị mất để mà bù. Thêm startsAt vì kỳ mới có
 * thể bắt đầu ở tương lai.
 */
export type RenewalPreview = {
  /** true = gói đang dùng đã bị lưu trữ và trường bị chuyển sang gói thay thế. Phải làm nổi bật. */
  planChanged: boolean
  currentPlan: SubscriptionPlan
  /** id của gói này chính là acceptedPlanId phải gửi lên khi đặt đơn gia hạn. */
  renewalPlan: SubscriptionPlan
  startsAt: string
  amountDue: number
}
// Hình dạng của link thanh toán do @/shared/payment định nghĩa vì cả subscription_school và
// subscription_system đều dùng chung, và vì cách mở trang thanh toán (redirect hay POST form) có
// ràng buộc chữ ký không được phép mỗi nơi tự hiểu một kiểu.
export type { PaymentLink, PaymentMethod } from '@/shared/payment/types'

export type DistributionMode = 'AUTO' | 'MANUAL'

export type QuotaUserAllocation = {
  id: string
  userId: string
  fullName: string | null
  quotaType: QuotaType
  allocatedAmountVnd: number
  usedAmountVnd: number
}

export type QuotaUserAllocationSummary = {
  pool: SubscriptionQuotaRecord
  allocations: QuotaUserAllocation[]
}

export type UserQuotaAmount = {
  userId: string
  amount: number
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

