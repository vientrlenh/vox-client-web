/**
 * Việt Nam không có giờ mùa hè nên offset cố định +07:00 là chính xác, và nó khiến chuỗi gửi lên tự
 * mô tả được múi giờ — khác với việc đóng dấu `Z` lên một ngày người dùng chọn theo lịch địa phương,
 * vốn đẩy cả khoảng đi 7 tiếng.
 */
const VN_UTC_OFFSET = '+07:00'

export function vnDayStartIso(date: string | null) {
  return date ? `${date}T00:00:00${VN_UTC_OFFSET}` : null
}

/**
 * Mốc cuối của BE là NỬA MỞ `[from, to)`, nên "đến hết ngày X" phải gửi 00:00 của ngày X+1. Gửi
 * 23:59:59 sẽ đánh rơi đúng giây cuối cùng của ngày.
 */
export function vnDayAfterIso(date: string | null) {
  if (!date) {
    return null
  }
  const startOfDay = new Date(`${date}T00:00:00${VN_UTC_OFFSET}`)
  startOfDay.setUTCDate(startOfDay.getUTCDate() + 1)
  return startOfDay.toISOString()
}

/**
 * yyyy-mm-dd của lịch VN -> ngày/tháng, KHÔNG đi qua `new Date()`: chuỗi đã là ngày lịch VN nên quy
 * đổi lại qua Date sẽ diễn giải nó theo múi giờ trình duyệt và lệch một ngày.
 */
export function shortVnDay(day: string) {
  const [, month, dayOfMonth] = day.split('-')
  return `${dayOfMonth}/${month}`
}

/**
 * Ngược lại: một ISO instant từ BE -> "23/08 09:14" theo giờ Việt Nam. Ở đây `new Date()` là ĐÚNG,
 * vì đầu vào là một mốc tuyệt đối có múi giờ chứ không phải một ngày lịch trần.
 */
export function vnDateTime(iso: string | null) {
  if (!iso) {
    return '—'
  }
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) {
    return '—'
  }
  return parsed.toLocaleString('vi-VN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
}
