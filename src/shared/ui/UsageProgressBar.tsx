export type UsageTone = 'critical' | 'ok' | 'warning'

// Ngưỡng đổi màu sống ở ĐÂY và chỉ ở đây. Cùng một con số phải ra cùng một màu ở mọi chỗ hiển thị
// hạn mức -- thanh dùng chung này, ô hạn mức lớn trên MyPlanCard, thẻ hạn mức cá nhân của giáo
// viên/học sinh. Chép ngưỡng sang nơi khác là mở đường cho 88% hiện hổ phách ở màn này và xanh ở
// màn kia.
export const USAGE_WARNING_PCT = 75
export const USAGE_CRITICAL_PCT = 90

export function getUsageTone(pct: number): UsageTone {
  if (pct >= USAGE_CRITICAL_PCT) {
    return 'critical'
  }
  if (pct >= USAGE_WARNING_PCT) {
    return 'warning'
  }
  return 'ok'
}

const TONE_COLORS: Record<UsageTone, string> = {
  critical: '#ef4444',
  ok: '#4f46e5',
  warning: '#f59e0b',
}

export function getUsageBarColor(pct: number) {
  return TONE_COLORS[getUsageTone(pct)]
}

export function usagePercent(used?: number | null, total?: number | null) {
  const totalAmount = Number(total) || 0
  if (totalAmount <= 0) {
    return 0
  }

  return Math.min(100, Math.round(((Number(used) || 0) / totalAmount) * 100))
}

// Hạn mức đo bằng VND (includedAmountVnd / usedAmountVnd ở backend), không phải USD như bản trước.
function formatVnd(value: number) {
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(Number(value) || 0))} ₫`
}

type UsageProgressBarProps = {
  isLoading?: boolean
  total: number
  used: number
}

// Thanh hiển thị mức dùng hạn mức: % là số chính (to, đậm), số tiền đã dùng/tổng chỉ là dòng phụ
// nhỏ bên dưới. Dùng chung cho mọi nơi hiển thị hạn mức subscription (school admin, giáo viên/học
// sinh, system admin) để không copy-paste lại cùng 1 khối markup progress bar ở nhiều feature.
export function UsageProgressBar({ isLoading, total, used }: UsageProgressBarProps) {
  if (isLoading) {
    return <p className="mt-3 text-sm font-semibold text-slate-400">Đang tải...</p>
  }

  const pct = usagePercent(used, total)
  const color = getUsageBarColor(pct)

  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-extrabold" style={{ color }}>
          {pct}%
        </span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full" style={{ backgroundColor: color, width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {formatVnd(used)} / {formatVnd(total)} đã dùng
      </p>
    </div>
  )
}
