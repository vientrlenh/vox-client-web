import type { ExamScheduleDto, ExamScheduleStatus, ExamScheduleStatusDto } from '@/features/examCore/types'

/**
 * Gương của `ExamScheduleStatus.isRemoved()` ở backend: ca đã dời hết người sang ca khác coi như
 * không còn tồn tại. (`DELETED` không có trong union vì backend đã lọc sẵn ở repository.)
 */
export function isScheduleRemoved(status: ExamScheduleStatus): boolean {
  return status === 'MOVED'
}

/**
 * Ca còn tính vào "kỳ thi đã xếp lịch tới đâu" — bỏ ca đã hủy và ca đã dời. Cùng tập hợp với
 * `ExamScheduleStatus.isInEffect()` ở backend, thứ quyết định ca nào bị soi phòng/giám thị khi lên
 * lịch; hai bên lệch nhau là nút "Lên lịch" sáng rồi ăn lỗi 400.
 */
export function isScheduleCounted(status: ExamScheduleStatus): boolean {
  return !isScheduleRemoved(status) && status !== 'CANCELLED'
}

/**
 * Ca đã rời khỏi bản nháp, tức học sinh đã nhìn thấy nó. `COMPLETED` là ca đã công bố và đã chạy
 * xong — `ExamScheduleAutoCompleteJob` tự lật `PUBLISHED → COMPLETED` sau `endDate`, nên so đúng
 * bằng `PUBLISHED` là bước "Xếp lịch" tự bung ra sau khi ca thi kết thúc.
 */
export function isSchedulePublishedOrLater(status: ExamScheduleStatus): boolean {
  return status === 'PUBLISHED' || status === 'COMPLETED'
}

export type ScheduleProgress = {
  /** Ca đã thi xong. */
  completedCount: number
  /** Ca còn bản nháp — còn cái này là chưa xếp lịch xong. */
  draftCount: number
  /** Ca đã công bố nhưng chưa tới lúc hoàn thành. */
  publishedCount: number
  /** `publishedCount + completedCount`: ca đã công bố trở lên. */
  readyCount: number
  /** Tổng ca còn tính (đã trừ ca hủy/dời). */
  totalCount: number
}

/** Đếm một lượt, dùng được cho cả `ExamScheduleDto` đầy đủ lẫn `{ id, status }` của trang danh sách. */
export function summarizeSchedules(
  schedules: ReadonlyArray<ExamScheduleDto | ExamScheduleStatusDto>,
): ScheduleProgress {
  const counted = schedules.filter((schedule) => isScheduleCounted(schedule.status))
  const completedCount = counted.filter((schedule) => schedule.status === 'COMPLETED').length
  const publishedCount = counted.filter((schedule) => schedule.status === 'PUBLISHED').length
  return {
    completedCount,
    draftCount: counted.filter((schedule) => schedule.status === 'DRAFT').length,
    publishedCount,
    readyCount: publishedCount + completedCount,
    totalCount: counted.length,
  }
}

/** Xếp lịch đã xong khi có ít nhất một ca còn tính và không còn ca nào ở bản nháp. */
export function isScheduleStepDone(progress: ScheduleProgress): boolean {
  return progress.totalCount > 0 && progress.draftCount === 0
}

/**
 * Nhãn một dòng dùng chung cho bước "Xếp lịch" và chip ca thi ở trang danh sách. Phân biệt ca đã
 * công bố với ca đã hoàn thành để người dùng biết kỳ thi đang ở đâu, thay vì gộp một chữ "đã công bố".
 */
export function formatScheduleProgressLabel(progress: ScheduleProgress): string {
  const { completedCount, draftCount, totalCount } = progress
  if (totalCount === 0) {
    return 'Chưa có ca thi nào'
  }
  if (draftCount > 0) {
    return `Còn ${draftCount} ca thi chưa công bố`
  }
  if (completedCount === totalCount) {
    return `${totalCount} ca thi đã hoàn thành`
  }
  if (completedCount === 0) {
    return `${totalCount} ca thi đã công bố`
  }
  return `${totalCount} ca thi (${completedCount} đã hoàn thành)`
}
