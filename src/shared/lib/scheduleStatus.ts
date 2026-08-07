import type { StatusTone } from '@/shared/ui/StatusBadge'

export type ScheduleStatusView = { label: string; tone: StatusTone }

/**
 * Nhãn trạng thái của MỘT CA THI, suy từ giờ của chính ca đó.
 *
 * Vì sao không dùng thẳng `ExamScheduleStatus`: cột đó chỉ đổi khi có NGƯỜI gọi
 * `PATCH /api/v1/exams/{id}/schedules/{id}/status`. Không có job nào tự chuyển sang COMPLETED
 * khi hết giờ, nên trên thực tế ca nào cũng nằm ở PUBLISHED mãi — kể cả ca đã thi xong từ
 * tuần trước. Trước 2026-08-06 trang học sinh vì thế ghi "Sắp diễn ra" cho ca đã qua, còn
 * trang giám thị in thẳng chữ `PUBLISHED` ra màn hình.
 *
 * Thứ tự xét có chủ ý: trạng thái do người đặt được ưu tiên và chỉ được phép THU HẸP, đồng hồ
 * không ghi đè được. Ca đã huỷ thì đến giờ vẫn là đã huỷ.
 */
export function scheduleStatusView(
  status: string | null | undefined,
  startDate?: string | null,
  endDate?: string | null,
  now: Date = new Date(),
): ScheduleStatusView {
  switch (status) {
    case 'CANCELLED':
      return { label: 'Đã hủy', tone: 'danger' }
    case 'COMPLETED':
      return { label: 'Đã kết thúc', tone: 'neutral' }
    case 'MOVED':
      return { label: 'Đã dời ca', tone: 'warning' }
    case 'DRAFT':
      return { label: 'Chưa công bố', tone: 'neutral' }
    default:
      break
  }

  const start = parseDate(startDate)
  const end = parseDate(endDate)
  // Ca chưa xếp giờ: không có gì để so, không đoán.
  if (!start && !end) return { label: 'Sắp diễn ra', tone: 'info' }
  if (start && now.getTime() < start.getTime()) return { label: 'Sắp diễn ra', tone: 'info' }
  if (end && now.getTime() > end.getTime()) return { label: 'Đã kết thúc', tone: 'neutral' }
  return { label: 'Đang diễn ra', tone: 'success' }
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}
