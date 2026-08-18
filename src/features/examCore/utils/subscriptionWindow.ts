import type { MySubscription } from '@/features/subscription_school/types'
import { formatDate } from '../types'

/**
 * Khung mở/đóng của kỳ thi và bài kiểm tra trên lớp phải nằm trong phiên thuê bao của trường —
 * BE chặn ở `SubscriptionPeriodGuardService` (400 `INVALID_STATE`, hoặc 422 `PLAN_LIMIT_EXCEEDED`
 * khi trường chưa có gói). Ở đây chặn trước để người dùng không chọn được ngày sai ngay từ đầu;
 * BE vẫn là nơi chốt.
 *
 * Câu lỗi giữ đúng chữ với BE để người dùng không gặp hai cách diễn đạt cho cùng một luật.
 */

const NO_ACTIVE_SUBSCRIPTION_MESSAGE =
  'Trường chưa có gói dịch vụ đang hoạt động, không thể đặt thời gian cho bài kiểm tra.'

/**
 * `startDate`/`endDate` của gói là chuỗi CHỈ CÓ NGÀY (`2026-01-01`). `new Date('2026-01-01')` đọc
 * theo UTC nên ở giờ VN sẽ lệch mất 7 tiếng — phải dựng từ các thành phần ngày để ra đúng nửa đêm
 * theo giờ địa phương, cùng hệ quy chiếu với `toDateTimeLocalValue`.
 */
function startOfLocalDay(dateOnly: string, dayOffset = 0): Date | null {
  const parts = dateOnly.split('-').map(Number)
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
    return null
  }
  const [year, month, day] = parts
  // Date tự chuẩn hoá khi day tràn cuối tháng, nên +1 ngày không cần xử lý riêng.
  return new Date(year, month - 1, day + dayOffset, 0, 0, 0, 0)
}

function activePeriodOf(
  subscription?: MySubscription | null,
): { endDate: string; startDate: string } | null {
  if (!subscription || subscription.status !== 'ACTIVE') {
    return null
  }
  const { endDate, startDate } = subscription
  if (!startDate || !endDate) {
    return null
  }
  return { endDate, startDate }
}

/**
 * Biên đã sẵn sàng gắn thẳng vào `<input type="datetime-local">`.
 *
 * `endDate` của gói là INCLUSIVE (BE so với hết ngày đó), nên cận trên là 23:59 ngày `endDate` —
 * lấy 00:00 sẽ chặn oan trọn ngày cuối cùng của gói.
 *
 * @returns null khi chưa xác định được hạn gói; lúc đó đừng kẹp gì cả, để BE quyết.
 */
export function getSubscriptionWindowBounds(
  subscription?: MySubscription | null,
): { max: string; min: string } | null {
  const period = activePeriodOf(subscription)
  if (!period) {
    return null
  }
  const start = startOfLocalDay(period.startDate)
  const end = startOfLocalDay(period.endDate)
  if (!start || !end) {
    return null
  }
  return {
    max: `${period.endDate}T23:59`,
    min: `${period.startDate}T00:00`,
  }
}

/**
 * Trả về câu lỗi đầu tiên bị vi phạm, hoặc null — cùng dạng với `validateWindow` của
 * CreateScheduleModal. Native `min`/`max` chỉ chặn thao tác trên picker chứ không chặn giá trị
 * gõ/dán tay, nên vẫn phải kiểm lại bằng JS ở bước submit.
 *
 * @param openAtIso  chuỗi ISO (đầu ra của `toIsoDateTime`); bỏ qua nếu null
 * @param closeAtIso chuỗi ISO; bỏ qua nếu null
 */
export function buildSubscriptionWindowError(
  openAtIso: string | null,
  closeAtIso: string | null,
  subscription?: MySubscription | null,
): string | null {
  if (openAtIso == null && closeAtIso == null) {
    return null
  }
  const period = activePeriodOf(subscription)
  if (!period) {
    return NO_ACTIVE_SUBSCRIPTION_MESSAGE
  }
  const lowerBound = startOfLocalDay(period.startDate)
  const upperBoundExclusive = startOfLocalDay(period.endDate, 1)
  if (!lowerBound || !upperBoundExclusive) {
    return null
  }

  const periodLabel = `từ ${formatDate(period.startDate)} đến ${formatDate(period.endDate)}`
  const isOutside = (isoValue: string | null) => {
    if (!isoValue) {
      return false
    }
    const time = new Date(isoValue).getTime()
    if (Number.isNaN(time)) {
      return false
    }
    return time < lowerBound.getTime() || time >= upperBoundExclusive.getTime()
  }

  if (isOutside(openAtIso)) {
    return `Thời gian mở bài phải nằm trong hạn gói dịch vụ của trường (${periodLabel}).`
  }
  if (isOutside(closeAtIso)) {
    return `Thời gian đóng bài phải nằm trong hạn gói dịch vụ của trường (${periodLabel}).`
  }
  return null
}

export function hasActiveSubscriptionPeriod(subscription?: MySubscription | null): boolean {
  return activePeriodOf(subscription) != null
}

export { NO_ACTIVE_SUBSCRIPTION_MESSAGE }
