import { formatDurationSeconds } from '@/features/examCore/types'
import { QUOTA_LABELS, type SubscriptionQuota } from '@/features/subscription_school/types'
import type { MyClassTestQuotaAllocation } from '@/features/subscription_school/api/useMyClassTestQuotaAllocationQuery'

// Khớp công thức worst-case của ClassTestTokenQuotaGuardService (BE): thời lượng bài (giây) ×
// số thí sinh × maxAttempt, giả định mọi thí sinh dùng hết toàn bộ thời gian cho mỗi lượt.
export function estimateClassTestTokens(
  examTimeDurationSecond: number | null | undefined,
  maxAttempt: number | null | undefined,
  candidateCount: number,
): number {
  if (!examTimeDurationSecond || examTimeDurationSecond <= 0) {
    return 0
  }
  return examTimeDurationSecond * candidateCount * (maxAttempt ?? 1)
}

function remainingOf(quota: SubscriptionQuota | undefined): number {
  // Không có row = BE coi như "không tìm thấy hạn mức" và chặn luôn (PlanLimitExceededException),
  // nên phía FE cũng phải coi như hết sạch (0), không phải "không giới hạn".
  if (!quota) {
    return 0
  }
  return quota.totalAllocated - quota.usedQuantity
}

function shortfallLine(label: string, estimatedTokens: number, remaining: number): string | null {
  if (estimatedTokens <= remaining) {
    return null
  }
  return `Thiếu ${formatDurationSeconds(estimatedTokens - remaining)} hạn mức ${label}`
}

export type ClassTestQuotaWarningInput = {
  examName: string
  examTimeDurationSecond: number | null | undefined
  maxAttempt: number | null | undefined
  candidateCount: number
  gradingQuota: SubscriptionQuota | undefined
  classTestQuota: SubscriptionQuota | undefined
  personalAllocation: MyClassTestQuotaAllocation | null | undefined
}

// Mirror của ClassTestTokenQuotaGuardService: soi ước lượng token trước cả 3 hạn mức mà BE sẽ
// chặn khi thật sự publish/sửa/thêm học sinh. Đây chỉ là cảnh báo sớm phía client — BE vẫn là nơi
// chặn thật, nên không cần đồng bộ tuyệt đối, chỉ cần đủ gọn để giáo viên nắm ngay đang thiếu gì.
export function buildClassTestQuotaWarning({
  examName,
  examTimeDurationSecond,
  maxAttempt,
  candidateCount,
  gradingQuota,
  classTestQuota,
  personalAllocation,
}: ClassTestQuotaWarningInput): string | null {
  const estimatedTokens = estimateClassTestTokens(examTimeDurationSecond, maxAttempt, candidateCount)
  if (estimatedTokens <= 0) {
    return null
  }

  const reasons = [
    shortfallLine(`"${QUOTA_LABELS.GRADING}" của trường`, estimatedTokens, remainingOf(gradingQuota)),
    shortfallLine(`"${QUOTA_LABELS.CLASS_TEST}" của trường`, estimatedTokens, remainingOf(classTestQuota)),
    personalAllocation
      ? shortfallLine(
          'cá nhân bạn được cấp',
          estimatedTokens,
          personalAllocation.allocatedQuantity - personalAllocation.usedQuantity,
        )
      : null,
  ].filter((reason): reason is string => reason != null)

  if (reasons.length === 0) {
    return null
  }

  return [`Bài "${examName}" ước tính cần ${formatDurationSeconds(estimatedTokens)} xử lý`, ...reasons].join('\n')
}