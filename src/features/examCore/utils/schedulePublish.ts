import type { ExamCandidateDto, ExamCandidateStatus, ExamScheduleDto } from '@/features/examCore/types'

/**
 * Gương của `ExamCandidateStatusSupport.isNonScorable` ở backend: thí sinh đã miễn thi hoặc đã hủy
 * không vào phòng nên không cần mã đề, và cũng không làm ca thi "có người".
 */
export function isNonScorableCandidate(status: ExamCandidateStatus | string): boolean {
  return status === 'EXEMPTED' || status === 'CANCELLED'
}

/**
 * Soi lại đúng điều kiện backend chặn action PUBLISH của một ca thi
 * (`UpdateExamScheduleStatusUseCase.publish`) để hiện lý do ngay trên nút, thay vì để người dùng bấm
 * rồi ăn lỗi 400 — cùng cách làm với `getCentralizedScheduleReadiness` của nút "Lên lịch".
 *
 * <p>Thứ tự kiểm tra bám đúng backend nên lý do hiện ra khớp với message sẽ nhận nếu vẫn gọi API.
 * Không thêm luật FE-only nào.
 *
 * @returns lý do chặn, hoặc `null` khi ca công bố được
 */
export function getSchedulePublishBlockingReason(
  schedule: ExamScheduleDto,
  candidates: ExamCandidateDto[],
): string | null {
  if (schedule.proctors.length === 0) {
    return 'Ca thi chưa có giám thị.'
  }
  const scorable = candidates.filter(
    (candidate) => candidate.scheduleId === schedule.id && !isNonScorableCandidate(candidate.status),
  )
  if (scorable.length === 0) {
    return 'Ca thi chưa có thí sinh nào.'
  }
  const withoutPaper = scorable.filter((candidate) => !candidate.assignedPaperId).length
  if (withoutPaper > 0) {
    return `Còn ${withoutPaper} học sinh chưa được gán đề — khóa tất cả mã đề ở tab Đề bài để hệ thống tự phân.`
  }
  return null
}
