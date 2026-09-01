import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowUpRight, Info, Users } from 'lucide-react'
import { formatVndWhole, toNumber } from '@/features/balance_school/model'
import { QUOTA_ICONS, QUOTA_LABELS, QUOTA_TYPES, type QuotaType } from '@/features/subscription_school/types'
import { DateRangeFilter, type DateRangeValue, type Preset } from '@/shared/ui/DateRangeFilter'
import { presetToRange } from '@/shared/ui/dateRangePresets'
import { vnDayAfterIso, vnDayStartIso } from '@/shared/lib/vnDateRange'
import {
  useSchoolAiCostTimeseriesQuery,
  useSchoolAiSpendByUserQuery,
  type AiCostWindow,
} from '../api/useSchoolAiCostQueries'
import { useSchoolQuotaUsageQuery, type SchoolQuotaUsage } from '../api/useSchoolQuotaUsageQuery'
import { buildAxis, buildSeries, granularityFor } from '../lib/aiCostAxis'

/**
 * Không có "Tất cả": biểu đồ cần hai mốc thật để dựng trục thời gian, còn "không giới hạn" thì
 * không có mốc đầu để bắt đầu. Bốn preset này phủ hết những khoảng người dùng thật sự hỏi, và nút
 * tự chọn ngày lo phần còn lại.
 */
const AI_COST_PRESETS: Preset[] = [
  { days: 7, key: '7d', label: '7 ngày qua' },
  { days: 30, key: '30d', label: '30 ngày qua' },
  { days: 90, key: '90d', label: '90 ngày qua' },
  { days: 'ytd', key: 'ytd', label: 'Năm nay' },
]

const DEFAULT_RANGE = AI_COST_PRESETS[1]

const QUOTA_COLORS: Record<QuotaType, string> = {
  EXAM: '#4F46E5',
  PRACTICE: '#06B6D4',
}

const CHART_HEIGHT = 160

const SPEND_TABS = [
  { key: 'all', label: 'Tất cả', value: null },
  { key: 'EXAM', label: 'Chấm thi', value: 'EXAM' as const },
  { key: 'PRACTICE', label: 'Luyện nói', value: 'PRACTICE' as const },
] as const

function shortVnLabel(day: string) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  })
}

function QuotaPanel({ quotaType, usage }: { quotaType: QuotaType; usage: SchoolQuotaUsage | undefined }) {
  const total = usage?.totalAllocatedAmountVnd ?? 0
  const used = usage?.usedAmountVnd ?? 0
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0
  const level = pct >= 90 ? 'crit' : pct >= 75 ? 'warn' : 'ok'
  const Icon = QUOTA_ICONS[quotaType]

  return (
    <div className={`rounded-2xl border bg-white p-5 ${level === 'ok' ? 'border-slate-200' : 'border-amber-200'}`}>
      <div className="mb-4 flex items-center gap-2.5">
        <span
          className={`flex size-9 items-center justify-center rounded-[11px] ${level === 'crit' ? 'bg-red-50 text-red-700' : level === 'warn' ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-600'}`}
        >
          <Icon aria-hidden="true" className="size-4.5" />
        </span>
        <span className="text-[13.5px] font-bold text-slate-900">{QUOTA_LABELS[quotaType]}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">
          {formatVndWhole(used)}
        </span>
        <span className="text-sm font-semibold text-slate-500">/ {formatVndWhole(total)}</span>
      </div>
      <div className="mt-3.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${level === 'crit' ? 'bg-red-500' : level === 'warn' ? 'bg-amber-500' : 'bg-linear-to-r from-indigo-600 to-cyan-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2.5 flex items-center justify-between">
        <span className="text-[12.5px] text-slate-500">Còn lại {formatVndWhole(Math.max(0, total - used))}</span>
        <span
          className={`text-[12.5px] font-extrabold ${level === 'crit' ? 'text-red-600' : level === 'warn' ? 'text-amber-600' : 'text-indigo-600'}`}
        >
          {pct}%
        </span>
      </div>
    </div>
  )
}

function SpendByUserTable({ window: costWindow }: { window: AiCostWindow }) {
  const [tab, setTab] = useState<(typeof SPEND_TABS)[number]['key']>('all')
  const [page, setPage] = useState(1)
  const quotaType = SPEND_TABS.find((t) => t.key === tab)?.value ?? null
  const { data, isLoading } = useSchoolAiSpendByUserQuery(costWindow, quotaType, page)

  const rows = data?.content ?? []
  const schoolWide = toNumber(data?.schoolWideCostVnd)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5.5">
      <div className="mb-4.5 flex flex-wrap items-start gap-3.5">
        <div>
          <h3 className="text-base font-extrabold tracking-tight text-slate-900">Ai đang tiêu hạn mức</h3>
          <p className="mt-0.5 text-[13px] text-slate-500">
            Giáo viên ra đề kiểm tra trên lớp và học sinh luyện nói, trong cùng khoảng thời gian đã chọn
          </p>
        </div>
        <div className="ml-auto flex gap-0.5 rounded-[10px] bg-slate-100 p-0.5">
          {SPEND_TABS.map((t) => (
            <button
              className={`rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition ${t.key === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
              key={t.key}
              onClick={() => {
                setTab(t.key)
                setPage(1)
              }}
              type="button"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-[13.5px] text-slate-400">Đang tải...</p>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2.5 py-10 text-center">
          <Users className="size-9 text-slate-300" />
          <p className="text-[13.5px] text-slate-600">
            Chưa ai tiêu vào trần chi cá nhân trong khoảng này.
          </p>
        </div>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 text-left text-[12.5px] font-bold uppercase tracking-wide text-slate-500">
              <th className="rounded-l-lg px-4 py-3">Người dùng</th>
              <th className="px-4 py-3">Loại</th>
              <th className="px-4 py-3 text-right">Đã dùng</th>
              <th className="rounded-r-lg px-4 py-3 w-52">So với trần chi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const spent = toNumber(row.spentVnd)
              const cap = row.allocatedAmountVnd === null ? null : toNumber(row.allocatedAmountVnd)
              const pct = cap !== null && cap > 0 ? Math.min(100, Math.round((spent / cap) * 100)) : null
              return (
                <tr className="border-t border-slate-100" key={`${row.userId}-${row.quotaType}`}>
                  <td className="px-4 py-3.5 text-sm font-bold text-slate-900">{row.fullName ?? '—'}</td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${row.quotaType === 'EXAM' ? 'bg-indigo-50 text-indigo-700' : 'bg-cyan-50 text-cyan-700'}`}
                    >
                      {QUOTA_LABELS[row.quotaType]}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm font-extrabold text-slate-900 tabular-nums">
                    {formatVndWhole(row.spentVnd)}
                  </td>
                  <td className="px-4 py-3.5">
                    {pct === null ? (
                      <span className="text-[12.5px] text-slate-400">Chưa chia trần chi</span>
                    ) : (
                      <>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full ${pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-indigo-600'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div
                          className={`mt-1.5 text-xs font-bold tabular-nums ${pct >= 90 ? 'text-red-600' : 'text-slate-500'}`}
                        >
                          {pct}% của {formatVndWhole(row.allocatedAmountVnd)}
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {/* Khoản của kỳ thi tập trung không thuộc trần chi của ai, nên nó KHÔNG nằm trong bảng trên.
          Nói ra ở đây để người đọc cộng bảng rồi so với biểu đồ không đi tìm một khoản thất thoát. */}
      {schoolWide > 0 ? (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
          <Info aria-hidden="true" className="size-4.5 shrink-0 text-slate-400" />
          <span className="text-[13px] leading-5 text-slate-600">
            Ngoài bảng này còn <b className="text-slate-900 tabular-nums">{formatVndWhole(data?.schoolWideCostVnd)}</b>{' '}
            chi cho kỳ thi tập trung — kỳ do nhà trường tổ chức nên không tính vào trần chi của ai.
          </span>
        </div>
      ) : null}

      {data && data.totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-[13px] text-slate-600">
          <span className="tabular-nums">
            Trang {data.page} / {data.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              className="rounded-full border border-slate-200 px-3.5 py-1.5 font-bold transition hover:bg-slate-50 disabled:opacity-40"
              disabled={data.page <= 1}
              onClick={() => setPage(data.page - 1)}
              type="button"
            >
              Trước
            </button>
            <button
              className="rounded-full border border-slate-200 px-3.5 py-1.5 font-bold transition hover:bg-slate-50 disabled:opacity-40"
              disabled={data.page >= data.totalPages}
              onClick={() => setPage(data.page + 1)}
              type="button"
            >
              Sau
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

/**
 * Chi phí AI của trường theo thời gian, cộng bảng "ai đang tiêu".
 *
 * Đọc {@code schoolAiCostTimeseries} — số TRƯỜNG BỊ TRỪ. Bản trước gọi
 * {@code schoolTokenUsageTimeseries}, một trường không tồn tại trong schema, nên cả thẻ này lẫn hai
 * ô hạn mức bên dưới nó đứng ở 0 ₫ với mọi trường.
 */
export function AiCostSection() {
  const [range, setRange] = useState<DateRangeValue>(() => presetToRange(DEFAULT_RANGE))

  const costWindow: AiCostWindow = useMemo(() => {
    // Nửa mở [from, to): mốc cuối là đầu ngày HÔM SAU ngày người dùng chọn, nếu không thì ngày cuối
    // của khoảng bị cắt mất và người dùng chọn "hôm nay" sẽ thấy hôm nay trống trơn.
    const granularity =
      range.from && range.to ? granularityFor(range.from, range.to) : ('DAY' as const)
    return {
      dateFrom: vnDayStartIso(range.from),
      dateTo: vnDayAfterIso(range.to),
      granularity,
    }
  }, [range])

  const { data, isError, isFetching, refetch } = useSchoolAiCostTimeseriesQuery(costWindow)
  const { data: quotaUsage } = useSchoolQuotaUsageQuery()

  const axis = useMemo(
    () => (range.from && range.to ? buildAxis(range.from, range.to, costWindow.granularity) : []),
    [range, costWindow.granularity],
  )
  const series = useMemo(
    () => buildSeries(data?.points ?? [], axis, toNumber),
    [data, axis],
  )

  const max = Math.max(...QUOTA_TYPES.flatMap((t) => series[t] ?? []), 1)
  const hasSpending = QUOTA_TYPES.some((t) => (series[t] ?? []).some((v) => v > 0))
  const stepX = axis.length > 1 ? 100 / (axis.length - 1) : 0
  const labelStep = Math.max(1, Math.round((axis.length - 1) / 4))
  const labelIndices = axis.map((_, i) => i).filter((i) => i % labelStep === 0 || i === axis.length - 1)

  // Sổ chi phí bắt đầu từ ngày triển khai V10 (cố ý không backfill), nên khoảng nằm trước đó vẽ ra
  // một đường phẳng ở 0 dù trường có tiêu tiền thật. Không nói ra thì hai chuyện đó nhìn giống hệt.
  const startsBeforeLedger =
    data?.recordedFrom != null && range.from != null && range.from < data.recordedFrom.slice(0, 10)

  const usageByType = new Map((quotaUsage ?? []).map((item) => [item.quotaType, item]))

  return (
    <div className="grid gap-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5.5">
        <div className="mb-4.5 flex flex-wrap items-start gap-3.5">
          <div>
            <h3 className="text-base font-extrabold tracking-tight text-slate-900">Chi phí AI theo ngày</h3>
            <p className="mt-0.5 text-[13px] text-slate-500">
              Số tiền AI đã trừ của trường, tính bằng VND — chấm thi và luyện nói tách riêng
            </p>
          </div>
        </div>

        <DateRangeFilter onChange={setRange} presets={AI_COST_PRESETS} value={range} />

        {isError ? (
          <div className="mt-4.5 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700">
            <AlertTriangle aria-hidden="true" className="size-4.5 shrink-0" />
            <span className="flex-1">Không tải được chi phí AI của khoảng thời gian này.</span>
            <button className="shrink-0 font-bold underline underline-offset-2" onClick={() => void refetch()} type="button">
              Thử lại
            </button>
          </div>
        ) : (
          <div className={isFetching ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
            <div className="mt-4.5 text-[13px] font-semibold text-slate-500">Tổng chi phí AI trong khoảng đã chọn</div>
            <div className="mt-1 text-4xl font-extrabold tracking-tight text-slate-900 tabular-nums">
              {formatVndWhole(data?.totalCostVnd)}
            </div>

            <div className="mt-3.5 flex flex-wrap gap-4">
              {QUOTA_TYPES.map((t) => (
                <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-600" key={t}>
                  <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: QUOTA_COLORS[t] }} />
                  {QUOTA_LABELS[t]}
                </span>
              ))}
            </div>

            <div className="relative mt-4 h-40">
              {!hasSpending ? (
                <div className="absolute inset-0 flex items-center justify-center text-[13px] text-slate-400">
                  Trường không tiêu đồng nào cho AI trong khoảng này.
                </div>
              ) : (
                <svg
                  aria-hidden="true"
                  className="size-full overflow-visible"
                  preserveAspectRatio="none"
                  viewBox={`0 0 100 ${CHART_HEIGHT}`}
                >
                  {QUOTA_TYPES.map((t) => (
                    <polyline
                      fill="none"
                      key={t}
                      points={(series[t] ?? [])
                        .map((v, i) => `${i * stepX},${CHART_HEIGHT - (v / max) * CHART_HEIGHT}`)
                        .join(' ')}
                      stroke={QUOTA_COLORS[t]}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </svg>
              )}
            </div>
            <div className="relative mt-2 h-4 text-[11px] font-bold text-slate-400">
              {labelIndices.map((i) => (
                <span className="absolute -translate-x-1/2" key={axis[i]} style={{ left: `${i * stepX}%` }}>
                  {shortVnLabel(axis[i])}
                </span>
              ))}
            </div>

            {startsBeforeLedger ? (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <AlertTriangle aria-hidden="true" className="size-4.5 shrink-0 text-amber-600" />
                <span className="text-[13px] leading-5 text-amber-800">
                  Hệ thống bắt đầu ghi sổ chi phí AI từ{' '}
                  <b className="tabular-nums">
                    {new Date(data.recordedFrom as string).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                  </b>
                  . Phần khoảng nằm trước mốc đó hiện 0 ₫ vì chưa có dữ liệu, không phải vì trường không tiêu gì.
                </span>
              </div>
            ) : null}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5.5 sm:grid-cols-2">
          {QUOTA_TYPES.map((quotaType) => (
            <QuotaPanel key={quotaType} quotaType={quotaType} usage={usageByType.get(quotaType)} />
          ))}
        </div>

        <div className="mt-4 flex justify-end">
          <a
            className="inline-flex items-center gap-1 text-[13.5px] font-bold text-indigo-600 hover:text-indigo-700"
            href="/school-admin/subscription"
          >
            Xem gói &amp; mua thêm
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </a>
        </div>
      </div>

      <SpendByUserTable window={costWindow} />
    </div>
  )
}
