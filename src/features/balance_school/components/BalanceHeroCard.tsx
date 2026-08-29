import { Lock, Plus, ScrollText } from 'lucide-react'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import type { StatusTone } from '@/shared/ui/StatusBadge'
import { formatDate, formatVnd, formatVndWhole, splitVnd, toNumber, type SchoolBalance } from '../model'

type BalanceHeroCardProps = {
  balance: SchoolBalance | null
  hasEverMoved: boolean
  isLoading: boolean
  onOpenStatement: () => void
  onTopUp: () => void
  /** Tổng đã trừ vượt hạn mức trong 30 ngày qua, dạng chuỗi (âm hoặc 0). */
  spentLast30Days: string | null
}

type Tone = {
  accent: string
  fraction: string
  label: string
  lead: string
  tone: StatusTone
}

/**
 * Ngưỡng "sắp cạn" là ĐỀ XUẤT CỦA GIAO DIỆN, backend không có gì tương đương.
 *
 * Trần cảnh báo 20% bên backend chỉ bật SAU khi số dư đã âm, tức quá muộn để cảnh báo trường. "Còn
 * ít hơn mức đã tiêu trong 30 ngày qua" là mốc duy nhất suy được từ dữ liệu thật mà vẫn có nghĩa với
 * người đọc: nếu nhịp dùng giữ nguyên, ví sẽ âm trong vòng một tháng.
 */
function resolveTone(balanceVnd: number, spentLast30Days: number, hasEverMoved: boolean): Tone {
  if (balanceVnd < 0) {
    return {
      accent: 'text-red-700',
      fraction: 'text-red-600',
      label: 'Đang nợ',
      lead: 'Chi phí AI thực tế đã vượt cả hạn mức kèm gói lẫn số tiền trường đã nạp. Trường không mở được ca thi mới cho tới khi số dư về không âm.',
      tone: 'danger',
    }
  }

  if (!hasEverMoved) {
    return {
      accent: 'text-slate-700',
      fraction: 'text-slate-500',
      label: 'Chưa nạp lần nào',
      lead: 'Trường chưa từng nạp. Khi hạn mức kèm gói cạn, lượt chấm kế tiếp rơi thẳng vào nợ và khoá trường ngay.',
      tone: 'neutral',
    }
  }

  if (spentLast30Days > 0 && balanceVnd <= spentLast30Days) {
    return {
      accent: 'text-amber-700',
      fraction: 'text-amber-600',
      label: 'Sắp cạn',
      lead: 'Thấp hơn mức đã tiêu trong 30 ngày qua. Nếu nhịp dùng giữ nguyên, ví sẽ âm trong tháng này và trường bị khoá.',
      tone: 'warning',
    }
  }

  return {
    accent: 'text-emerald-700',
    fraction: 'text-emerald-600',
    label: 'Còn dự phòng',
    lead: 'Còn nhiều hơn mức đã tiêu trong 30 ngày qua. Hạn mức cạn thì ví gánh tiếp, ca thi không bị gián đoạn.',
    tone: 'success',
  }
}

export function BalanceHeroCard({
  balance,
  hasEverMoved,
  isLoading,
  onOpenStatement,
  onTopUp,
  spentLast30Days,
}: BalanceHeroCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
        Đang tải số dư...
      </div>
    )
  }

  const balanceVnd = toNumber(balance?.balanceVnd)
  // Backend trả tổng OVERAGE_CHARGE dưới dạng số ÂM (đó là dấu của bút toán). Đảo về dương để so
  // sánh và hiển thị -- "đã trừ 382.656,58 ₫" đọc tự nhiên hơn "-382.656,58 ₫".
  const spent = Math.abs(toNumber(spentLast30Days))
  const locked = balance?.locked ?? false
  const tone = resolveTone(balanceVnd, spent, hasEverMoved)
  const { fraction, whole } = splitVnd(balance?.balanceVnd)
  const amountToUnlock = locked ? Math.abs(balanceVnd) : 0

  return (
    <div className={`rounded-2xl border bg-white p-6 ${locked ? 'border-red-200' : 'border-slate-200'}`}>
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex min-w-0 flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <span className="text-[13px] font-semibold text-slate-500">Số dư khả dụng</span>
            <StatusBadge label={tone.label} tone={tone.tone} />
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-4xl font-extrabold leading-none tracking-tight tabular-nums ${tone.accent}`}>
              {whole}
            </span>
            <span className={`text-xl font-bold tabular-nums ${tone.fraction}`}>{fraction}</span>
            <span className={`ml-1 text-lg font-bold ${tone.fraction}`}>₫</span>
          </div>
          <p className="max-w-[46ch] text-[12.5px] leading-relaxed text-slate-500">{tone.lead}</p>
        </div>

        <dl className="flex gap-8 pt-1">
          <div className="flex flex-col gap-1">
            <dt className="text-[11.5px] font-semibold text-slate-400">Đã trừ trong 30 ngày qua</dt>
            <dd className="text-[15px] font-bold text-blue-950 tabular-nums">{formatVnd(String(spent))}</dd>
            <dd className="text-[11px] text-slate-400">Chỉ tính phần vượt hạn mức</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-[11.5px] font-semibold text-slate-400">Cập nhật lần cuối</dt>
            <dd className="text-[15px] font-bold text-blue-950 tabular-nums">{formatDate(balance?.updatedAt)}</dd>
            <dd className="text-[11px] text-slate-400">Theo từng bút toán</dd>
          </div>
        </dl>
      </div>

      {locked ? (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <Lock aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-red-700" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-red-800">Trường đang bị khoá vì số dư âm</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-red-700">
                Cần nạp tối thiểu{' '}
                <strong className="font-bold tabular-nums">{formatVndWhole(Math.ceil(amountToUnlock))}</strong> để mở
                khoá. Trạng thái khoá suy thẳng từ dấu của số dư — bút toán nạp vừa ghi xong là ca thi mở lại được
                ngay, không cần ai duyệt.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-slate-100 pt-4">
        <button
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-indigo-600 px-5 text-sm font-bold text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          onClick={onTopUp}
          type="button"
        >
          <Plus aria-hidden="true" className="size-4.5" />
          {locked ? `Nạp bù ${formatVndWhole(Math.ceil(amountToUnlock))}` : 'Nạp thêm'}
        </button>
        <button
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-indigo-200 bg-white px-5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          onClick={onOpenStatement}
          type="button"
        >
          <ScrollText aria-hidden="true" className="size-4.5" />
          Xem sao kê
        </button>
      </div>
    </div>
  )
}
