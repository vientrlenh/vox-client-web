import { QUOTA_LABELS, formatUsd, type SubscriptionQuota } from '@/features/subscription_school/types'
import type { MyClassTestQuotaAllocation } from '@/features/subscription_school/api/useMyClassTestQuotaAllocationQuery'

// Khớp công thức worst-case của ClassTestTokenQuotaGuardService (BE): thời lượng bài (giây) ×
// số thí sinh × maxAttempt × giá USD/giây, giả định mọi thí sinh dùng hết toàn bộ thời gian cho
// mỗi lượt. pricePerSecondUsd lấy từ query quotaPricing (useQuotaPricingQuery) — cùng nguồn
// QuotaPricingProperties mà BE thật sự dùng để chặn, không hardcode ở FE.
export function estimateClassTestCostUsd(
  examTimeDurationSecond: number | null | undefined,
  maxAttempt: number | null | undefined,
  candidateCount: number,
  pricePerSecondUsd: number,
): number {
  if (!examTimeDurationSecond || examTimeDurationSecond <= 0) {
    return 0
  }
  return examTimeDurationSecond * candidateCount * (maxAttempt ?? 1) * pricePerSecondUsd
}

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
  examTimeDurationSecond: number | null | undefined
  maxAttempt: number | null | undefined
  candidateCount: number
  gradingQuota: SubscriptionQuota | undefined
  classTestQuota: SubscriptionQuota | undefined
  personalAllocation: MyClassTestQuotaAllocation | null | undefined
  pricePerSecondUsd: number | undefined
}

// Mirror của ClassTestTokenQuotaGuardService: soi ước lượng chi phí USD trước cả 3 hạn mức mà BE
// sẽ chặn khi thật sự publish/sửa/thêm học sinh. Đây chỉ là cảnh báo sớm phía client — BE vẫn là
// nơi chặn thật, nên không cần đồng bộ tuyệt đối, chỉ cần đủ gọn để giáo viên nắm ngay đang thiếu gì.
export function buildClassTestQuotaWarning({
  examName,
  examTimeDurationSecond,
  maxAttempt,
  candidateCount,
  gradingQuota,
  classTestQuota,
  personalAllocation,
  pricePerSecondUsd,
}: ClassTestQuotaWarningInput): string | null {
  // Chưa tải xong giá thì chưa ước lượng được gì — im lặng thay vì cảnh báo sai (0 = coi như miễn phí).
  if (pricePerSecondUsd == null) {
    return null
  }

  const estimatedCostUsd = estimateClassTestCostUsd(examTimeDurationSecond, maxAttempt, candidateCount, pricePerSecondUsd)
  if (estimatedCostUsd <= 0) {
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