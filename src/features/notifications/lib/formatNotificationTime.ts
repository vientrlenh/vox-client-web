const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS
const WEEK_MS = 7 * DAY_MS

/**
 * Thời điểm tương đối cho tới một tuần, sau đó chuyển sang ngày tuyệt đối — quá một tuần
 * thì "9 ngày trước" khó định vị hơn hẳn "30/07/2026".
 */
export function formatNotificationTime(
  value: string | null,
  now: number = Date.now(),
) {
  if (!value) {
    return ''
  }

  const createdAt = new Date(value)

  if (Number.isNaN(createdAt.getTime())) {
    return ''
  }

  const elapsed = now - createdAt.getTime()

  // Lệch giờ giữa máy người dùng và server có thể đẩy elapsed xuống âm; hiển thị "trong
  // 3 phút nữa" cho một việc đã xảy ra thì vô nghĩa, nên gộp vào nhánh vừa xong.
  if (elapsed < MINUTE_MS) {
    return 'Vừa xong'
  }

  if (elapsed < HOUR_MS) {
    return `${Math.floor(elapsed / MINUTE_MS)} phút trước`
  }

  if (elapsed < DAY_MS) {
    return `${Math.floor(elapsed / HOUR_MS)} giờ trước`
  }

  if (elapsed < WEEK_MS) {
    return `${Math.floor(elapsed / DAY_MS)} ngày trước`
  }

  return createdAt.toLocaleDateString('vi-VN')
}
