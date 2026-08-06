import type { GradingRoundType } from '@/features/grading'

/**
 * Vòng mà giáo viên tạo bài TỰ NHẬN được.
 *
 * `APPEAL` không nằm ở đây: nó gắn với một đơn phúc khảo cụ thể nên phải đi qua màn
 * đơn (`POST /v1/exam-appeals/{id}/reviewer`) — chỗ duy nhất biết luật xung đột lợi
 * ích và biết cách chuyển trạng thái đơn. BE từ chối `APPEAL` ở endpoint claim.
 */
export const CLAIMABLE_ROUND_TYPES = ['INITIAL', 'SPOT_CHECK', 'REMEDIATION'] as const

export type ClaimableRoundType = (typeof CLAIMABLE_ROUND_TYPES)[number]

export function isClaimableRound(roundType: GradingRoundType): roundType is ClaimableRoundType {
  return (CLAIMABLE_ROUND_TYPES as readonly string[]).includes(roundType)
}

/** Trạng thái bài mà mỗi vòng nhận được — bản sao đọc-được của `GradingRoundPolicy` ở BE. */
export const CLAIMABLE_RESULT_STATUS: Record<ClaimableRoundType, string> = {
  INITIAL: 'PENDING_REVIEW',
  REMEDIATION: 'INVALID',
  SPOT_CHECK: 'RELEASED',
}

export const CLAIM_ROUND_LABEL: Record<ClaimableRoundType, string> = {
  INITIAL: 'Chấm lần đầu',
  REMEDIATION: 'Soi lại bài vô hiệu',
  SPOT_CHECK: 'Hậu kiểm bài đã công bố',
}
