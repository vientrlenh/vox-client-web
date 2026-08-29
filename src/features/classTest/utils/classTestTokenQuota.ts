import { QUOTA_LABELS, formatVnd, type SubscriptionQuota } from '@/features/subscription_school/types'
import type { MyClassTestQuotaAllocation } from '@/features/subscription_school/api/useMyClassTestQuotaAllocationQuery'

function remainingOf(quota: SubscriptionQuota | undefined): number {
  // Không có row = BE coi như "không tìm thấy hạn mức" và chặn luôn (PlanLimitExceededException),
  // nên phía FE cũng phải coi như hết sạch (0), không phải "không giới hạn".
  if (!quota) {
    return 0
  }
  return quota.totalAllocatedAmountVnd - quota.usedAmountVnd
}

function shortfallLine(label: string, estimatedCostVnd: number, remaining: number): string | null {
  if (estimatedCostVnd <= remaining) {
    return null
  }
  return `Thiếu ${formatVnd(estimatedCostVnd - remaining)} hạn mức ${label}`
}

export type ClassTestQuotaWarningInput = {
  examName: string
  /** Do BE tính — xem useExamTokenEstimateQuery. FE KHÔNG tự nhân lại công thức nữa. */
  estimatedCostVnd: number | undefined
  // Bài kiểm tra trên lớp trừ vào cùng một ví EXAM với thi tập trung -- KHÔNG có ví CLASS_TEST
  // riêng, xem QuotaType ở BE (từng có, đã gỡ vì bị trừ trùng cùng một khoản chi hai lần).
  examQuota: SubscriptionQuota | undefined
  personalAllocation: MyClassTestQuotaAllocation | null | undefined
}

// Soi ước lượng chi phí VND của BE trước cả hai hạn mức mà BE sẽ chặn khi thật sự publish/sửa/thêm
// học sinh. Đây chỉ là cảnh báo sớm phía client — BE vẫn là nơi chặn thật. Con số ước lượng lấy thẳng
// từ query examTokenEstimate thay vì nhân lại ở đây: thời lượng bài thi đã gồm thời lượng phát
// AUDIO/VIDEO còn chi phí thì không, nên tự nhân là ra số khác hẳn cái BE dùng để chặn.
export function buildClassTestQuotaWarning({
  examName,
  estimatedCostVnd,
  examQuota,
  personalAllocation,
}: ClassTestQuotaWarningInput): string | null {
  // Chưa tải xong ước lượng thì im lặng thay vì cảnh báo sai (0 = coi như miễn phí).
  if (estimatedCostVnd == null || estimatedCostVnd <= 0) {
    return null
  }

  const reasons = [
    shortfallLine(`"${QUOTA_LABELS.EXAM}" của trường`, estimatedCostVnd, remainingOf(examQuota)),
    personalAllocation
      ? shortfallLine(
          'cá nhân bạn được cấp',
          estimatedCostVnd,
          personalAllocation.allocatedAmountVnd - personalAllocation.usedAmountVnd,
        )
      : null,
  ].filter((reason): reason is string => reason != null)

  if (reasons.length === 0) {
    return null
  }

  return [`Bài "${examName}" ước tính cần ${formatVnd(estimatedCostVnd)} xử lý`, ...reasons].join('\n')
}
