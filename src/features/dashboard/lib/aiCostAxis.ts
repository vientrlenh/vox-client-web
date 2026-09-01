import type { AiCostGranularity, AiCostPoint } from '../api/useSchoolAiCostQueries'
import { QUOTA_TYPES, type QuotaType } from '@/features/subscription_school/types'

/**
 * Trục thời gian dựng ở CLIENT, không lấy từ các mốc server trả về.
 *
 * Server chỉ trả mốc CÓ phát sinh, nên nối thẳng chúng lại sẽ vẽ một đường liền từ ngày tiêu cuối
 * cùng tới ngày tiêu tiếp theo — che mất đúng những ngày trường không tiêu đồng nào. Dựng trục đủ
 * mốc rồi điền 0 vào chỗ trống thì khoảng lặng hiện ra đúng như nó vốn có.
 */

const VN_OFFSET_MS = 7 * 60 * 60 * 1000

/** Số ngày tối đa còn vẽ theo NGÀY. Trên mức này thì trục dày quá, không đọc được nữa. */
const MAX_DAILY_SPAN = 92
const MAX_WEEKLY_SPAN = 730

/** Ngày lịch giờ VN của một mốc, dạng yyyy-mm-dd. */
function vnDay(at: Date) {
  return new Date(at.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10)
}

function parseVnDay(day: string) {
  return new Date(`${day}T00:00:00Z`)
}

export function spanInDays(from: string, to: string) {
  return Math.round((parseVnDay(to).getTime() - parseVnDay(from).getTime()) / 86_400_000) + 1
}

/**
 * Chọn đơn vị gom nhóm theo độ dài khoảng — người dùng chỉ chọn NGÀY, không chọn đơn vị.
 *
 * Bắt họ chọn cả hai là bắt họ tự đoán khoảng nào thì hợp với đơn vị nào, và chọn sai thì nhận về
 * một biểu đồ 365 cột dính nhau hoặc một biểu đồ 2 cột.
 */
export function granularityFor(from: string, to: string): AiCostGranularity {
  const days = spanInDays(from, to)
  if (days <= MAX_DAILY_SPAN) {
    return 'DAY'
  }
  return days <= MAX_WEEKLY_SPAN ? 'WEEK' : 'MONTH'
}

/** Đầu tuần theo quy ước của Postgres `date_trunc('week', ...)`: THỨ HAI. */
function startOfWeek(day: Date) {
  const shifted = new Date(day)
  // getUTCDay: 0 = chủ nhật. Lùi về thứ hai gần nhất trước đó.
  const backToMonday = (shifted.getUTCDay() + 6) % 7
  shifted.setUTCDate(shifted.getUTCDate() - backToMonday)
  return shifted
}

/** Mọi mốc của trục, cũ -> mới, dạng yyyy-mm-dd theo lịch giờ VN. */
export function buildAxis(from: string, to: string, granularity: AiCostGranularity): string[] {
  const end = parseVnDay(to)
  const axis: string[] = []
  let cursor = parseVnDay(from)

  if (granularity === 'WEEK') {
    cursor = startOfWeek(cursor)
  } else if (granularity === 'MONTH') {
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 1))
  }

  while (cursor <= end) {
    axis.push(cursor.toISOString().slice(0, 10))
    if (granularity === 'DAY') {
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    } else if (granularity === 'WEEK') {
      cursor.setUTCDate(cursor.getUTCDate() + 7)
    } else {
      cursor.setUTCMonth(cursor.getUTCMonth() + 1)
    }
  }
  return axis
}

/**
 * Gộp các mốc server trả về vào đúng trục hiển thị; mốc không có phát sinh = 0.
 *
 * Mốc từ server là ISO instant ở ĐẦU mốc giờ VN (00:00 giờ VN = 17:00Z hôm trước), nên phải quy về
 * ngày lịch giờ VN trước khi so — cắt thẳng 10 ký tự đầu của chuỗi ISO sẽ ra ngày hôm trước.
 */
export function buildSeries(points: AiCostPoint[], axis: string[], toNumber: (v: string) => number) {
  const byDayAndType = new Map<string, number>()
  for (const point of points) {
    const key = `${vnDay(new Date(point.bucket))}|${point.quotaType}`
    byDayAndType.set(key, (byDayAndType.get(key) ?? 0) + toNumber(point.costVnd))
  }

  const series = {} as Record<QuotaType, number[]>
  for (const quotaType of QUOTA_TYPES) {
    series[quotaType] = axis.map((day) => byDayAndType.get(`${day}|${quotaType}`) ?? 0)
  }
  return series
}
