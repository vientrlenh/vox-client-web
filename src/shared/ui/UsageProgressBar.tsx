function formatUsd(value: number) {
  return `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value)}`
}

function getUsageBarColor(pct: number) {
  if (pct >= 90) {
    return '#ef4444'
  }
  if (pct >= 75) {
    return '#f59e0b'
  }
  return '#4f46e5'
}

type UsageProgressBarProps = {
  isLoading?: boolean
  total: number
  used: number
}

// Thanh hiển thị mức dùng hạn mức kiểu Claude: % là số chính (to, đậm), số USD đã
// dùng/tổng chỉ là dòng phụ nhỏ bên dưới. Dùng chung cho mọi nơi hiển thị hạn mức
// subscription (school admin, giáo viên/học sinh, system admin) để không copy-paste
// lại cùng 1 khối markup progress bar ở nhiều feature.
export function UsageProgressBar({ isLoading, total, used }: UsageProgressBarProps) {
  if (isLoading) {
    return <p className="mt-3 text-sm font-semibold text-slate-400">Đang tải...</p>
  }

  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0
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
        {formatUsd(used)} / {formatUsd(total)} đã dùng
      </p>
    </div>
  )
}
