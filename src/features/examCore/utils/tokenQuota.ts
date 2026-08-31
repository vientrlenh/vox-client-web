import { QUOTA_LABELS, formatVnd, type SubscriptionQuotaRecord } from '@/features/subscription_school/types'
import type { MyExamQuotaAllocation } from '@/features/subscription_school/api/useMyExamQuotaAllocationQuery'

function remainingOf(quota: SubscriptionQuotaRecord | undefined): number {
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

export type ExamQuotaWarningInput = {
  /** Do BE tính — xem useExamTokenEstimateQuery. FE KHÔNG tự nhân lại công thức nữa. */
  estimatedCostVnd: number | undefined
  /**
   * Ví hạn mức thi của trường. MỘT ví chứ không phải hai: GRADING và CLASS_TEST cũ đã gộp thành
   * EXAM, backend trừ cả kỳ thi tập trung lẫn bài kiểm tra trên lớp vào đây.
   */
  examQuota: SubscriptionQuotaRecord | undefined
  /** null cho kỳ thi tập trung -- BE chỉ tính trần cá nhân giáo viên khi exam.kind === CLASS_TEST. */
  personalAllocation: MyExamQuotaAllocation | null | undefined
}

// Soi ước lượng chi phí của BE trước cả hai hạn mức mà BE sẽ chặn khi thật sự publish/sửa/thêm học
// sinh. Đây chỉ là cảnh báo sớm phía client — BE vẫn là nơi chặn thật. Con số ước lượng lấy thẳng từ
// query examTokenEstimate thay vì nhân lại ở đây: thời lượng bài thi đã gồm thời lượng phát
// AUDIO/VIDEO còn chi phí thì không, nên tự nhân là ra số khác hẳn cái BE dùng để chặn.
//
// Dùng chung cho cả kỳ thi tập trung (Exam) lẫn bài kiểm tra trên lớp (Class Test) -- guard phía BE
// (ClassTestTokenQuotaGuardService.estimateTokenQuota) đã tổng quát cho mọi ExamKind, phần hạn mức cá
// nhân giáo viên chỉ khác nhau ở việc personalAllocation có được truyền vào hay không.
export function buildExamQuotaWarning({
  estimatedCostVnd,
  examQuota,
  personalAllocation,
}: ExamQuotaWarningInput): string | null {
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

  return reasons.join('\n')
}

export type ExamQuotaStatus =
  | { kind: 'ok' }
  | { kind: 'needsWallet'; message: string; walletAmountNeededVnd: number }
  | { kind: 'blocked'; message: string }

export type ExamQuotaCheckInput = {
  /** Do BE tính -- xem useExamTokenEstimateQuery. */
  estimatedCostVnd: number | undefined
  examQuota: SubscriptionQuotaRecord | undefined
  /**
   * `remainingExamVnd` từ useExamTokenEstimateQuery -- ĐÃ cộng số dư ví tự nạp của trường
   * (spendableSchoolFundsVnd ở BE). null/undefined khi trường chưa có subscription active, cùng
   * nghĩa với `examQuota` undefined.
   */
  remainingExamWithWalletVnd: number | null | undefined
  personalAllocation: MyExamQuotaAllocation | null | undefined
  /**
   * `schoolLocked` từ useExamTokenEstimateQuery -- trường đang bị khóa do nợ (số dư ví tự nạp
   * âm). Kiểm tra RIÊNG khỏi remainingExamWithWalletVnd vì BE cố ý clamp số dư âm về 0 lúc tính
   * số đó (tránh nhầm "khóa do nợ" thành "hết hạn mức") -- nếu không có tín hiệu riêng này thì một
   * trường bị khóa nhưng hạn mức gói vẫn còn dư sẽ hiện 'ok' sai.
   */
  schoolLocked: boolean | undefined
}

/**
 * Phân 3 mức thay vì 1 cảnh báo chung, vì BE cũng xử lý khác nhau ở 2 ranh giới
 * (ClassTestTokenQuotaGuardService):
 * - Trường đang bị khóa do nợ: chặn hẳn, bất kể hạn mức còn dư hay không (case 0, soi trước tiên).
 * - Trong hạn mức trường: cho lên lịch thẳng, không đụng gì tới ví.
 * - Vượt hạn mức trường nhưng ví tự nạp đủ bù: BE vẫn cho lên lịch (ConsumeQuotaService tự trừ
 *   phần vượt vào ví qua bút toán OVERAGE_CHARGE lúc chấm xong) -- nhưng đó là tiền thật của
 *   trường, nên FE phải hỏi trước thay vì để bị âm thầm trừ.
 * - Vượt cả ví: BE chặn hẳn (PlanLimitExceededException) -- FE cũng phải khoá nút tương ứng.
 *
 * Trần cá nhân giáo viên (`personalAllocation`, chỉ có ở CLASS_TEST) KHÔNG cộng ví -- vượt trần
 * này luôn ở mức 'blocked', không có đường "dùng ví" (xem requireWithinUserAllocation).
 */
export function classifyExamQuotaStatus({
  estimatedCostVnd,
  examQuota,
  remainingExamWithWalletVnd,
  personalAllocation,
  schoolLocked,
}: ExamQuotaCheckInput): ExamQuotaStatus {
  if (schoolLocked) {
    return {
      kind: 'blocked',
      message: 'Trường đang bị khóa do nợ hạn mức AI thực tế -- cần thanh toán hoặc nạp thêm/nâng cấp gói trước khi lên lịch.',
    }
  }

  if (estimatedCostVnd == null || estimatedCostVnd <= 0) {
    return { kind: 'ok' }
  }

  if (personalAllocation) {
    const personalRemaining = personalAllocation.allocatedAmountVnd - personalAllocation.usedAmountVnd
    if (estimatedCostVnd > personalRemaining) {
      return {
        kind: 'blocked',
        message: `Thiếu ${formatVnd(estimatedCostVnd - personalRemaining)} hạn mức cá nhân bạn được cấp`,
      }
    }
  }

  const quotaOnlyRemaining = remainingOf(examQuota)
  if (estimatedCostVnd <= quotaOnlyRemaining) {
    return { kind: 'ok' }
  }

  const remainingWithWallet = remainingExamWithWalletVnd ?? quotaOnlyRemaining
  if (estimatedCostVnd > remainingWithWallet) {
    return {
      kind: 'blocked',
      message: `Thiếu ${formatVnd(estimatedCostVnd - remainingWithWallet)} hạn mức "${QUOTA_LABELS.EXAM}" của trường (đã tính cả số dư ví)`,
    }
  }

  const walletAmountNeededVnd = estimatedCostVnd - quotaOnlyRemaining
  return {
    kind: 'needsWallet',
    message: `Vượt hạn mức "${QUOTA_LABELS.EXAM}" của trường ${formatVnd(walletAmountNeededVnd)} -- phần vượt sẽ được trừ vào số dư ví của trường nếu bạn tiếp tục lên lịch.`,
    walletAmountNeededVnd,
  }
}

// Dưới ngưỡng này thì không đáng làm phiền người bấm lên lịch -- hằng số đơn giản, không cần thêm
// config/.env vì đây chỉ là 1 gợi ý mềm, không phải luật nghiệp vụ được chặn/thực thi ở đâu khác.
const SHARED_POOL_WARNING_RATIO_THRESHOLD = 0.3

/**
 * Kỳ thi tập trung (CENTRALIZED) không có hạn mức cá nhân (xem classifyExamQuotaStatus) nên chi phí
 * của nó ăn thẳng vào ví EXAM CHUNG của trường -- đúng ví mà mọi giáo viên khác cũng đang dựa vào để
 * lên lịch CLASS_TEST. Người bấm "Lên lịch" kỳ thi tập trung (SCHOOL_ADMIN/CHAIR) không tự thấy hệ
 * quả domino này, nên cần 1 banner THÔNG TIN riêng (không chặn gì, khác hẳn classifyExamQuotaStatus)
 * để họ cân nhắc trước.
 *
 * <p>`sharedPoolUsageRatio`/`teachersWithUnusedPersonalAllocationCount` do BE tính sẵn
 * (useExamTokenEstimateQuery, chỉ có giá trị cho CENTRALIZED) -- null nghĩa là không áp dụng (CLASS_TEST,
 * chưa có subscription, hoặc ví gói đã cạn sẵn -- lúc đó banner blocked/needsWallet đã đủ nói rồi).
 */
export function buildSharedPoolUsageInsight(input: {
  sharedPoolUsageRatio: number | null | undefined
  teachersWithUnusedPersonalAllocationCount: number | null | undefined
}): string | null {
  const { sharedPoolUsageRatio, teachersWithUnusedPersonalAllocationCount } = input
  if (
    sharedPoolUsageRatio == null ||
    teachersWithUnusedPersonalAllocationCount == null ||
    sharedPoolUsageRatio < SHARED_POOL_WARNING_RATIO_THRESHOLD ||
    teachersWithUnusedPersonalAllocationCount === 0
  ) {
    return null
  }

  const ratioPercent = Math.round(sharedPoolUsageRatio * 100)
  return (
    `Bài thi này ước tính dùng khoảng ${ratioPercent}% hạn mức ví thi hiện còn của trường. ` +
    `${teachersWithUnusedPersonalAllocationCount} giáo viên khác đang còn hạn mức cá nhân (bài kiểm tra trên lớp) chưa dùng hết -- ` +
    `nếu ví thi cạn, họ có thể không lên lịch được nữa dù hạn mức cá nhân vẫn còn.`
  )
}
