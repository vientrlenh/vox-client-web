import { QUOTA_LABELS, formatUsd, type SubscriptionQuota } from '@/features/subscription_school/types'
import type { MyClassTestQuotaAllocation } from '@/features/subscription_school/api/useMyClassTestQuotaAllocationQuery'

function remainingOf(quota: SubscriptionQuota | undefined): number {
  // Không có row = BE coi như "không tìm thấy hạn mức" và chặn luôn (PlanLimitExceededException),
  // nên phía FE cũng phải coi như hết sạch (0), không phải "không giới hạn".
  if (!quota) {
    return 0
  }
  return quota.totalAllocated - quota.usedQuantity
}

function shortfallLine(label: string, estimatedCostUsd: number, remaining: number): string | null {
  if (estimatedCostUsd <= remaining) {
    return null
  }
  return `Thiếu ${formatUsd(estimatedCostUsd - remaining)} hạn mức ${label}`
}

export type ClassTestQuotaWarningInput = {
  examName: string
  /** Do BE tính — xem useExamTokenEstimateQuery. FE KHÔNG tự nhân lại công thức nữa. */
  estimatedCostUsd: number | undefined
  gradingQuota: SubscriptionQuota | undefined
  classTestQuota: SubscriptionQuota | undefined
  personalAllocation: MyClassTestQuotaAllocation | null | undefined
}

// Soi ước lượng chi phí USD của BE trước cả 3 hạn mức mà BE sẽ chặn khi thật sự publish/sửa/thêm học
// sinh. Đây chỉ là cảnh báo sớm phía client — BE vẫn là nơi chặn thật. Con số ước lượng lấy thẳng từ
// query examTokenEstimate thay vì nhân lại ở đây: thời lượng bài thi đã gồm thời lượng phát
// AUDIO/VIDEO còn chi phí thì không, nên tự nhân là ra số khác hẳn cái BE dùng để chặn.
export function buildClassTestQuotaWarning({
  examName,
  estimatedCostUsd,
  gradingQuota,
  classTestQuota,
  personalAllocation,
}: ClassTestQuotaWarningInput): string | null {
  // Chưa tải xong ước lượng thì im lặng thay vì cảnh báo sai (0 = coi như miễn phí).
  if (estimatedCostUsd == null || estimatedCostUsd <= 0) {
    return null
  }

  const reasons = [
    shortfallLine(`"${QUOTA_LABELS.GRADING}" của trường`, estimatedCostUsd, remainingOf(gradingQuota)),
    shortfallLine(`"${QUOTA_LABELS.CLASS_TEST}" của trường`, estimatedCostUsd, remainingOf(classTestQuota)),
    personalAllocation
      ? shortfallLine(
          'cá nhân bạn được cấp',
          estimatedCostUsd,
          personalAllocation.allocatedQuantity - personalAllocation.usedQuantity,
        )
      : null,
  ].filter((reason): reason is string => reason != null)

  if (reasons.length === 0) {
    return null
  }

  return [`Bài "${examName}" ước tính cần ${formatUsd(estimatedCostUsd)} xử lý`, ...reasons].join('\n')
}