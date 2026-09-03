import { FileCheck2, Headphones, type LucideIcon } from 'lucide-react'

/**
 * Mô hình HIỆN TẠI của backend cho phía trường, tách khỏi `./types.ts`.
 *
 * `types.ts` còn giữ mô hình TRƯỚC refactor (pricePerYear, validityDays, includedQuantity,
 * tokenUnitPrice, ba loại quota GRADING/CLASS_TEST/PRACTICE, số đo bằng USD). Các màn chưa migrate
 * -- mua thêm hạn mức, hóa đơn, sổ nợ -- vẫn đọc từ đó, nên xóa thẳng sẽ làm chúng không build được
 * trong khi chúng đang hỏng vì lý do khác. File này là đích đến: cái gì migrate xong thì chuyển
 * sang đây, và `types.ts` teo dần cho tới lúc xóa được.
 *
 * Từ vựng ở đây cố ý khớp `subscription_system/types.ts` -- cùng một backend thì hai phía không
 * được gọi tên khác nhau.
 */

/**
 * Hai loại hạn mức, KHÔNG phải ba. GRADING và CLASS_TEST cũ đã gộp thành EXAM: backend trừ cả kỳ
 * thi tập trung lẫn bài kiểm tra trên lớp vào cùng một ví (xem QuotaType ở subscription.graphqls).
 */
export type QuotaType = 'EXAM' | 'PRACTICE'

export type SubscriptionPlanPeriod = 'DAY' | 'MONTH' | 'YEAR'

export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'SUSPENDED'

export const QUOTA_TYPES: QuotaType[] = ['EXAM', 'PRACTICE']

export const QUOTA_LABELS: Record<QuotaType, string> = {
  EXAM: 'Bài kiểm tra',
  PRACTICE: 'Lượt ôn luyện cá nhân',
}

export const QUOTA_SHORT_LABELS: Record<QuotaType, string> = {
  EXAM: 'Kiểm tra',
  PRACTICE: 'Ôn luyện',
}

export const QUOTA_ICONS: Record<QuotaType, LucideIcon> = {
  EXAM: FileCheck2,
  PRACTICE: Headphones,
}

export type PlanQuota = {
  id: string
  quotaType: QuotaType
  /** Định mức bao gồm trong giá gói, quy ra VND. Không còn tokenUnitPrice đi kèm. */
  includedAmountVnd: number
}

export type SubscriptionPlan = {
  id: string
  name: string
  tagline: string | null
  priceVnd: number
  /** Chu kỳ = periodType x periodCount (vd MONTH x 12). Thay cho validityDays cũ. */
  periodType: SubscriptionPlanPeriod
  periodCount: number
  maxTimePerAttemptMin: number | null
  quotas: PlanQuota[]
}

export type MySubscription = {
  id: string
  schoolId: string
  subscriptionPlanId: string
  startDate: string | null
  endDate: string | null
  status: SubscriptionStatus
  /** Giá đã trả tại thời điểm mua -- chốt cứng, không đổi theo giá gói sau này. */
  pricePaidSnapshot: number
  /** Chỉ tắt gia hạn; gói vẫn dùng được tới hết endDate. Khác hẳn suspendedAt. */
  cancelledAt: string | null
  /** System Admin cưỡng chế đình chỉ -- mất quyền dùng NGAY. Bị xóa trắng khi được gỡ. */
  suspendedAt: string | null
  suspendedReason: string | null
  plan: SubscriptionPlan | null
}

/**
 * Bộ đếm hạn mức của MỘT kỳ. usedAmountVnd KHÔNG BAO GIỜ vượt totalAllocatedAmountVnd -- phần chi
 * vượt trần được chuyển sang ví tự nạp của trường, nên tỉ lệ ở đây trần đúng 100%.
 */
export type SubscriptionQuotaRecord = {
  id: string
  schoolSubscriptionId: string
  quotaType: QuotaType
  totalAllocatedAmountVnd: number
  usedAmountVnd: number
  /**
   * Phần của `totalAllocatedAmountVnd` do trường tự nạp từ ví sang, thay vì do gói cấp.
   *
   * Tuỳ chọn vì không phải truy vấn nào cũng chọn trường này -- màn chia hạn mức cần nó để nói "gói
   * cho bao nhiêu, mình bỏ thêm bao nhiêu", còn thẻ tổng quan gói thì không.
   */
  fundedFromBalanceVnd?: number
}

const PERIOD_LABELS: Record<SubscriptionPlanPeriod, string> = {
  DAY: 'ngày',
  MONTH: 'tháng',
  YEAR: 'năm',
}

export function formatPeriod(periodType?: SubscriptionPlanPeriod | null, periodCount?: number | null) {
  if (!periodType || !periodCount) {
    return '-'
  }

  return `${periodCount} ${PERIOD_LABELS[periodType]}`
}

// Ngưỡng và màu của mức dùng KHÔNG khai lại ở đây -- chúng thuộc shared/ui/UsageProgressBar, nơi
// duy nhất định nghĩa chúng. Xem getUsageTone / usagePercent ở đó.
