// Ba feature đang có bản sao formatVnd riêng (subscription_school, subscription_system, và đây).
// Đáng gom về một module dùng chung, nhưng đó là việc của một lượt dọn riêng — thêm import chéo
// giữa các feature bây giờ chỉ buộc order_school vào đúng thư mục đang được tháo dỡ.

export function formatVnd(value?: number | null) {
  const amount = Number(value) || 0
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(amount))} ₫`
}

export function formatDateTime(value?: string | null) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
  }).format(date)
}

/**
 * Thời gian còn lại tới hạn thanh toán, dạng "21 giờ 40 phút".
 *
 * Mốc lấy từ expiresAt của ĐƠN — không cộng hằng số vào updatedAt: updatedAt đổi khi admin sửa ghi
 * chú, và expiresAt còn là hạn đã gửi sang cổng thanh toán.
 */
export function formatRemaining(expiresAt?: string | null, now: number = Date.now()) {
  if (!expiresAt) {
    return null
  }

  const end = new Date(expiresAt).getTime()
  if (Number.isNaN(end)) {
    return null
  }

  const remainingMs = end - now
  if (remainingMs <= 0) {
    return null
  }

  const totalMinutes = Math.floor(remainingMs / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours > 0) {
    return `${hours} giờ ${minutes} phút`
  }
  return `${minutes} phút`
}
