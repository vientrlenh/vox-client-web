import type { LucideIcon } from 'lucide-react'
import { UsageProgressBar } from '@/shared/ui/UsageProgressBar'

export type MyQuotaAllocation = {
  allocatedAmountVnd: number
  usedAmountVnd: number
}

type MyQuotaAllocationCardProps = {
  icon: LucideIcon
  isLoading: boolean
  label: string
  // null = đã tải xong nhưng không có hạn mức cá nhân riêng (chỉ pool của trường áp dụng).
  // undefined = chưa tải xong.
  allocation: MyQuotaAllocation | null | undefined
}

// Thẻ hiển thị hạn mức CÁ NHÂN của chính người dùng — khác UsageBarsGrid (luôn hiện cả 3 loại
// hạn mức của TRƯỜNG). Cùng phong cách trực quan (thanh tiến trình, màu theo % dùng) để nhất quán.
export function MyQuotaAllocationCard({ icon: Icon, isLoading, label, allocation }: MyQuotaAllocationCardProps) {
  const total = allocation?.allocatedAmountVnd ?? 0
  const used = allocation?.usedAmountVnd ?? 0
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0
  const warn = pct >= 80

  return (
    <div className={`rounded-2xl border bg-white p-5 ${warn ? 'border-amber-200' : 'border-slate-200'}`}>
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-[10px] bg-indigo-50 text-indigo-600">
          <Icon aria-hidden="true" className="size-4.5" />
        </span>
        <span className="text-sm font-bold text-slate-900">{label}</span>
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm font-semibold text-slate-400">Đang tải...</p>
      ) : allocation == null ? (
        <p className="mt-4 text-sm text-slate-500">
          Bạn chưa được cấp hạn mức cá nhân riêng — dùng chung hạn mức của trường.
        </p>
      ) : (
        <>
          <UsageProgressBar total={total} used={used} />
          {warn ? (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs leading-4 text-amber-700">
              Sắp đạt giới hạn hạn mức cá nhân.
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}