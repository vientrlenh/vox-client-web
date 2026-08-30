export type DateRangeValue = {
  /** yyyy-mm-dd, null nghĩa là không giới hạn mốc này */
  from: string | null
  to: string | null
}

export type Preset = {
  key: string
  label: string
  /** Số ngày tính lùi từ hôm nay; 'mtd' = từ đầu tháng; 'ytd' = từ đầu năm; 'all' = toàn bộ thời gian */
  days: number | 'mtd' | 'ytd' | 'all'
}

export const DEFAULT_PRESETS: Preset[] = [
  { days: 7, key: '7d', label: '7 ngày qua' },
  { days: 30, key: '30d', label: '30 ngày qua' },
  { days: 90, key: '90d', label: '90 ngày qua' },
  { days: 'ytd', key: 'ytd', label: 'Năm nay' },
  { days: 'all', key: 'all', label: 'Tất cả' },
]

function toDateInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Tách khỏi `DateRangeFilter.tsx` vì nơi gọi cần dựng state ban đầu BẰNG ĐÚNG khoảng mà một preset
 * sinh ra — nếu lệch thì chip tương ứng không sáng lên dù màn hình đang hiển thị đúng khoảng đó, do
 * `activePresetKey` so khớp theo GIÁ TRỊ chứ không theo khóa. Để hàm này ở file component sẽ phá
 * fast-refresh (một file chỉ nên export component).
 */
export function presetToRange(preset: Preset): DateRangeValue {
  if (preset.days === 'all') {
    return { from: null, to: null }
  }
  const now = new Date()
  if (preset.days === 'mtd') {
    return { from: toDateInput(new Date(now.getFullYear(), now.getMonth(), 1)), to: toDateInput(now) }
  }
  if (preset.days === 'ytd') {
    return { from: toDateInput(new Date(now.getFullYear(), 0, 1)), to: toDateInput(now) }
  }
  const from = new Date(now)
  from.setDate(from.getDate() - preset.days + 1)
  return { from: toDateInput(from), to: toDateInput(now) }
}
