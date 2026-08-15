import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Archive,
  ArrowUpRight,
  Ban,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Coins,
  FileCheck2,
  FileQuestion,
  Flag,
  Gavel,
  Headphones,
  Hourglass,
  Info,
  Loader,
  Lock,
  Megaphone,
  PenLine,
  Play,
  RefreshCw,
  Repeat,
  SquarePen,
  Wallet,
  X,
  XCircle,
} from 'lucide-react'
import { useNavigate } from 'react-router'
import { useAppSelector } from '@/app/store/hooks'
import { DateRangeFilter, type DateRangeValue } from '@/shared/ui/DateRangeFilter'
import { useExamStatusRangeQuery } from '../api/useExamStatusRangeQuery'
import { useNearestCentralizedExamQuery, type NearestCentralizedExam } from '../api/useNearestCentralizedExamQuery'
import { useQuestionBankStatsQuery, type QuestionBankStats } from '../api/useQuestionBankStatsQuery'
import { useSchoolAdminDashboardQuery, type SchoolAdminDashboard } from '../api/useSchoolAdminDashboardQuery'
import type { QuotaType, TokenQuotaUsage } from '../api/useTokenUsageBreakdownQuery'
import { useTokenUsageTimeseriesQuery, type TokenUsageTimeseries, type TokenUsageTimeseriesPoint } from '../api/useTokenUsageTimeseriesQuery'

const EXAM_STATUS = [
  { color: '#94A3B8', icon: <SquarePen aria-hidden="true" className="size-4.5" />, key: 'draft' as const, label: 'Bản nháp' },
  { color: '#4F46E5', icon: <CalendarClock aria-hidden="true" className="size-4.5" />, key: 'scheduled' as const, label: 'Đã lên lịch' },
  { color: '#F59E0B', icon: <Play aria-hidden="true" className="size-4.5" />, key: 'inProgress' as const, label: 'Đang diễn ra' },
  { color: '#06B6D4', icon: <Lock aria-hidden="true" className="size-4.5" />, key: 'closed' as const, label: 'Đã đóng' },
  { color: '#10B981', icon: <Flag aria-hidden="true" className="size-4.5" />, key: 'resultsPublished' as const, label: 'Đã công bố KQ' },
  { color: '#EF4444', icon: <Ban aria-hidden="true" className="size-4.5" />, key: 'cancelled' as const, label: 'Đã hủy' },
]

const APPEAL_STATUS = [
  { color: '#F59E0B', hot: true, icon: <Hourglass aria-hidden="true" className="size-4" />, key: 'pending' as const, label: 'Chờ xử lý' },
  { color: '#4F46E5', icon: <Loader aria-hidden="true" className="size-4" />, key: 'processing' as const, label: 'Đang xử lý' },
  { color: '#10B981', icon: <Megaphone aria-hidden="true" className="size-4" />, key: 'published' as const, label: 'Đã công bố' },
  { color: '#94A3B8', icon: <X aria-hidden="true" className="size-4" />, key: 'rejected' as const, label: 'Từ chối' },
]

const fmt = (n: number) => n.toLocaleString('vi-VN')

function formatUsd(value: number) {
  return `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value)}`
}

function Kpi({
  accent,
  cta,
  icon,
  label,
  onCta,
  sub,
  tint,
  unit,
  value,
}: {
  accent?: boolean
  cta?: string
  icon: React.ReactNode
  label: string
  onCta?: () => void
  sub: React.ReactNode
  tint?: { bg: string; fg: string }
  unit?: string
  value: React.ReactNode
}) {
  return (
    <div
      className={
        accent
          ? 'flex min-h-38 flex-col rounded-2xl bg-linear-to-br from-indigo-600 to-cyan-500 p-5 text-white shadow-lg shadow-indigo-950/20'
          : 'flex min-h-38 flex-col rounded-2xl border border-slate-200 bg-white p-5'
      }
    >
      <div className="flex items-center gap-2.5">
        <span
          className={
            accent
              ? 'flex size-10 items-center justify-center rounded-[11px] bg-white/20 text-white'
              : `flex size-10 items-center justify-center rounded-[11px] ${tint?.bg} ${tint?.fg}`
          }
        >
          {icon}
        </span>
        <span className={accent ? 'text-sm font-semibold text-white/85' : 'text-sm font-semibold text-slate-500'}>{label}</span>
      </div>
      <div className={accent ? 'mt-3.5 text-4xl font-extrabold tracking-tight' : 'mt-3.5 text-4xl font-extrabold tracking-tight text-slate-900'}>
        {value}
        {unit ? <small className="ml-1 text-base font-bold text-slate-400">{unit}</small> : null}
      </div>
      <div className={accent ? 'mt-3 text-sm text-white/85' : 'mt-3 text-sm text-slate-500'}>{sub}</div>
      {cta ? (
        <button
          className="mt-auto inline-flex w-fit items-center gap-1.5 self-start rounded-full bg-white/15 px-3.5 py-1.5 text-sm font-bold text-white transition hover:bg-white/25"
          onClick={onCta}
          type="button"
        >
          {cta}
          <ArrowUpRight aria-hidden="true" className="size-4" />
        </button>
      ) : null}
    </div>
  )
}

function Donut({ center, segments, sub }: { center: number; segments: { color: string; label: string; value: number }[]; sub: string }) {
  const visible = segments.filter((s) => s.value > 0)
  const total = visible.reduce((s, x) => s + x.value, 0)
  const stops = total
    ? visible
        .reduce<{ acc: number; parts: string[] }>(
          (state, s) => {
            const from = (state.acc / total) * 360
            const acc = state.acc + s.value
            const to = (acc / total) * 360
            return { acc, parts: [...state.parts, `${s.color} ${from}deg ${to}deg`] }
          },
          { acc: 0, parts: [] },
        )
        .parts.join(',')
    : '#E2E8F0 0deg 360deg'

  return (
    <div className="flex items-center gap-6">
      <div className="size-40 shrink-0 rounded-full" style={{ background: `conic-gradient(${stops})` }}>
        <div className="m-6.5 flex size-27 flex-col items-center justify-center rounded-full bg-white">
          <div className="text-3xl font-extrabold text-slate-900 tabular-nums">{fmt(center)}</div>
          <div className="mt-0.5 text-xs font-semibold text-slate-500">{sub}</div>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3.5">
        {segments.map((s) => (
          <div className="flex items-center gap-2.5" key={s.label}>
            <span className="size-3 shrink-0 rounded-[4px]" style={{ background: s.color }} />
            <span className="text-sm font-semibold text-slate-600">{s.label}</span>
            <span className="ml-auto text-base font-extrabold text-slate-900 tabular-nums">{fmt(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatExamDateTime(value: string | null) {
  if (!value) {
    return '—'
  }
  return new Date(value).toLocaleString('vi-VN', { day: '2-digit', hour: '2-digit', minute: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Số ngày còn lại đến `dateStr` (YYYY-MM-DD), tính từ đầu ngày hôm nay — âm nếu đã qua. */
function daysUntil(dateStr: string) {
  const end = new Date(`${dateStr}T00:00:00`)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((end.getTime() - startOfToday.getTime()) / 86_400_000)
}

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatShortDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}

const NEAREST_EXAM_STATUS_DISPLAY: Record<NearestCentralizedExam['status'], { label: string; tone: string }> = {
  CANCELLED: { label: 'Đã hủy', tone: 'bg-red-50 text-red-700' },
  CLOSED: { label: 'Đã đóng', tone: 'bg-cyan-50 text-cyan-700' },
  DRAFT: { label: 'Bản nháp', tone: 'bg-slate-100 text-slate-600' },
  IN_PROGRESS: { label: 'Đang diễn ra', tone: 'bg-amber-50 text-amber-700' },
  RESULTS_PUBLISHED: { label: 'Đã công bố KQ', tone: 'bg-emerald-50 text-emerald-700' },
  SCHEDULED: { label: 'Đã lên lịch', tone: 'bg-indigo-50 text-indigo-700' },
}

function NearestCentralizedExamCard({ exam, isLoading }: { exam: NearestCentralizedExam | null | undefined; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5.5">
        <div className="mb-2 flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-[11px] bg-indigo-50 text-indigo-700">
            <CalendarClock aria-hidden="true" className="size-4.5" />
          </span>
          <h3 className="text-base font-extrabold tracking-tight text-slate-900">Kỳ thi tập trung gần nhất</h3>
        </div>
        <p className="mt-2 text-[13.5px] text-slate-400">Đang tải...</p>
      </div>
    )
  }

  if (!exam) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5.5">
        <div className="mb-2 flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-[11px] bg-indigo-50 text-indigo-700">
            <CalendarClock aria-hidden="true" className="size-4.5" />
          </span>
          <h3 className="text-base font-extrabold tracking-tight text-slate-900">Kỳ thi tập trung gần nhất</h3>
        </div>
        <p className="mt-2 text-[13.5px] text-slate-500">Trường chưa có kỳ thi tập trung nào.</p>
      </div>
    )
  }

  const ended = exam.status === 'CLOSED' || exam.status === 'RESULTS_PUBLISHED' || (exam.closeAt ? new Date(exam.closeAt) < new Date() : false)
  const display = NEAREST_EXAM_STATUS_DISPLAY[exam.status]
  const present = Math.max(exam.totalCandidates - exam.absentCandidates, 0)
  const absentPct = exam.totalCandidates > 0 ? Math.round((exam.absentCandidates / exam.totalCandidates) * 100) : 0

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5.5">
      <div className="mb-4.5 flex flex-wrap items-start gap-3.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-indigo-50 text-indigo-700">
          <CalendarClock aria-hidden="true" className="size-4.5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-extrabold tracking-tight text-slate-900">Kỳ thi tập trung gần nhất</h3>
          <p className="mt-0.5 truncate text-[13px] text-slate-500">
            {exam.name} · {exam.code}
          </p>
        </div>
        <span className={`ml-auto shrink-0 rounded-full px-3 py-1 text-[12.5px] font-extrabold ${ended ? 'bg-cyan-50 text-cyan-700' : display.tone}`}>
          {ended ? 'Đã kết thúc' : display.label}
        </span>
      </div>

      <div className="mb-4.5 flex items-center gap-2 text-[13.5px] text-slate-600">
        <CalendarDays aria-hidden="true" className="size-4.5 shrink-0 text-slate-400" />
        <span>
          {formatExamDateTime(exam.openAt)} – {formatExamDateTime(exam.closeAt)}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3.5">
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3.5">
          <div className="text-[22px] font-extrabold text-slate-900 tabular-nums">{exam.totalCandidates}</div>
          <div className="mt-1.5 text-[12.5px] font-semibold text-slate-500">Thí sinh</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3.5">
          <div className="text-[22px] font-extrabold text-emerald-700 tabular-nums">{present}</div>
          <div className="mt-1.5 text-[12.5px] font-semibold text-slate-500">Có mặt</div>
        </div>
        <div
          className={`rounded-xl border px-4 py-3.5 ${exam.absentCandidates > 0 ? 'border-red-200 bg-red-50/60' : 'border-slate-200 bg-slate-50/60'}`}
        >
          <div className={`text-[22px] font-extrabold tabular-nums ${exam.absentCandidates > 0 ? 'text-red-600' : 'text-slate-900'}`}>
            {exam.absentCandidates}
          </div>
          <div className="mt-1.5 text-[12.5px] font-semibold text-slate-500">Vắng mặt{exam.totalCandidates > 0 ? ` (${absentPct}%)` : ''}</div>
        </div>
      </div>

      <div className="mt-4.5 flex items-center justify-end border-t border-slate-100 pt-4">
        <a
          className="inline-flex items-center gap-1 text-[13.5px] font-bold text-indigo-600 hover:text-indigo-700"
          href={`/school-admin/exams/${exam.examId}`}
        >
          Xem chi tiết kỳ thi
          <ArrowUpRight aria-hidden="true" className="size-3.5" />
        </a>
      </div>
    </div>
  )
}

function ExamStatusCard({
  c,
  isError,
  isFetching,
  onRangeChange,
  onRetry,
  range,
}: {
  c: SchoolAdminDashboard['examStatusCounts']
  isError: boolean
  isFetching: boolean
  onRangeChange: (range: DateRangeValue) => void
  onRetry: () => void
  range: DateRangeValue
}) {
  const segments = EXAM_STATUS.map((s) => ({ color: s.color, label: s.label, value: c[s.key] }))
  const live = c.inProgress + c.scheduled

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5.5">
      <div className="mb-4.5 flex flex-wrap items-start gap-3.5">
        <div>
          <h3 className="text-base font-extrabold tracking-tight text-slate-900">Trạng thái kỳ thi</h3>
          <p className="mt-0.5 text-[13px] text-slate-500">Phân bố kỳ thi của trường theo trạng thái trong khoảng thời gian đã chọn</p>
        </div>
        <div className="ml-auto text-right text-[22px] font-extrabold text-slate-900 tabular-nums">
          {c.total}
          <small className="block text-[11.5px] font-semibold text-slate-500">tổng kỳ thi</small>
        </div>
      </div>
      <DateRangeFilter onChange={onRangeChange} value={range} />
      {isError ? (
        <div className="mt-4.5 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700">
          <AlertTriangle aria-hidden="true" className="size-4.5 shrink-0" />
          <span className="flex-1">Không lọc được theo khoảng thời gian này — số liệu bên dưới đang là tổng toàn thời gian.</span>
          <button className="shrink-0 font-bold underline underline-offset-2" onClick={onRetry} type="button">
            Thử lại
          </button>
        </div>
      ) : null}
      <div className={isFetching ? 'mt-4.5 opacity-50 transition-opacity' : 'mt-4.5 transition-opacity'}>
        <Donut center={c.total} segments={segments} sub="kỳ thi" />
      </div>
      <div className="mt-5.5 flex items-center justify-between border-t border-slate-100 pt-4">
        <div className="flex items-center gap-2.5 text-[13.5px] text-slate-600">
          <Play aria-hidden="true" className="size-4.5 text-amber-500" />
          <span>
            <b className="text-slate-900">{live}</b> kỳ thi sắp tới & đang diễn ra
          </span>
        </div>
        <a className="inline-flex items-center gap-1 text-[13.5px] font-bold text-indigo-600 hover:text-indigo-700" href="/school-admin/exams">
          Quản lý kỳ thi
          <ArrowUpRight aria-hidden="true" className="size-3.5" />
        </a>
      </div>
    </div>
  )
}

const QUOTA_TYPES: QuotaType[] = ['GRADING', 'CLASS_TEST', 'PRACTICE']

const QUOTA_LABELS: Record<QuotaType, string> = {
  CLASS_TEST: 'Bài kiểm tra trên lớp',
  GRADING: 'Bài thi cần chấm',
  PRACTICE: 'Lượt ôn luyện cá nhân',
}

const QUOTA_ICONS: Record<QuotaType, typeof Coins> = {
  CLASS_TEST: ClipboardList,
  GRADING: FileCheck2,
  PRACTICE: Headphones,
}

function usageLevel(pct: number) {
  return pct >= 90 ? 'crit' : pct >= 75 ? 'warn' : 'ok'
}

function TokenNoSubscriptionCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5.5">
      <div className="mb-5">
        <h3 className="text-base font-extrabold tracking-tight text-slate-900">Sử dụng token</h3>
        <p className="mt-0.5 text-[13px] text-slate-500">Hạn mức token AI của gói hiện tại</p>
      </div>
      <div className="flex items-center gap-2.5 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3.5 text-[13.5px] font-semibold text-orange-800">
        <Info aria-hidden="true" className="size-5 text-orange-600" />
        <span>Chưa có gói đăng ký đang hoạt động — hạn mức token bằng 0.</span>
      </div>
    </div>
  )
}

/** Panel chi tiết theo từng loại hạn mức — cùng dữ liệu & cách tính với "Mức sử dụng" ở trang gói dịch vụ. */
function TokenQuotaPanel({ quotaType, usage }: { quotaType: QuotaType; usage: TokenQuotaUsage | undefined }) {
  const total = usage?.totalAllocated ?? 0
  const used = usage?.usedQuantity ?? 0
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0
  const level = usageLevel(pct)
  const fillClass = level === 'crit' ? 'bg-linear-to-r from-red-500 to-red-400' : level === 'warn' ? 'bg-linear-to-r from-amber-500 to-amber-400' : 'bg-linear-to-r from-indigo-600 to-cyan-500'
  const pctClass = level === 'crit' ? 'bg-red-50 text-red-700' : level === 'warn' ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-600'
  const Icon = QUOTA_ICONS[quotaType]

  return (
    <div className={`rounded-2xl border bg-white p-5 ${level === 'warn' || level === 'crit' ? 'border-amber-200' : 'border-slate-200'}`}>
      <div className="mb-4 flex items-center gap-2.5">
        <span className={`flex size-9 items-center justify-center rounded-[11px] ${pctClass}`}>
          <Icon aria-hidden="true" className="size-4.5" />
        </span>
        <span className="text-[13.5px] font-bold text-slate-900">{QUOTA_LABELS[quotaType]}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">{formatUsd(used)}</span>
        <span className="text-sm font-semibold text-slate-500">/ {formatUsd(total)}</span>
      </div>
      <div className="mt-3.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${fillClass}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2.5 flex items-center justify-between">
        <span className="text-[12.5px] text-slate-500">Còn lại {formatUsd(Math.max(0, total - used))}</span>
        <span className={`text-[12.5px] font-extrabold ${level === 'crit' ? 'text-red-600' : level === 'warn' ? 'text-amber-600' : 'text-indigo-600'}`}>
          {pct}%
        </span>
      </div>
      {level !== 'ok' && total > 0 ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[12px] leading-4 text-amber-700">
          Sắp đạt giới hạn — cân nhắc mua thêm token hoặc nâng cấp gói.
        </p>
      ) : null}
    </div>
  )
}

const QUOTA_COLORS: Record<QuotaType, string> = {
  CLASS_TEST: '#8B5CF6',
  GRADING: '#4F46E5',
  PRACTICE: '#06B6D4',
}

const TOKEN_WINDOW_DAYS = { '7': 7, '30': 30, '90': 90 } as const
type TokenUsageWindow = keyof typeof TOKEN_WINDOW_DAYS

function isoDateDaysAgo(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

/** Danh sách ngày YYYY-MM-DD liên tục từ hôm nay lùi về `days - 1` ngày trước, tăng dần. */
function buildDailyBuckets(days: number) {
  return Array.from({ length: days }, (_, i) => isoDateDaysAgo(days - 1 - i))
}

/** Gộp `points` (đã group theo bucket+quotaType ở BE) vào đúng trục ngày hiển thị, ngày thiếu = 0. */
function buildDailySeries(points: TokenUsageTimeseriesPoint[], bucketDates: string[]) {
  const byDateAndType = new Map<string, number>()
  for (const p of points) {
    const dateKey = p.bucket.slice(0, 10)
    byDateAndType.set(`${dateKey}|${p.quotaType}`, (byDateAndType.get(`${dateKey}|${p.quotaType}`) ?? 0) + p.tokensConsumed)
  }
  const series = {} as Record<QuotaType, number[]>
  for (const quotaType of QUOTA_TYPES) {
    series[quotaType] = bucketDates.map((date) => byDateAndType.get(`${date}|${quotaType}`) ?? 0)
  }
  return series
}

const USAGE_CHART_HEIGHT = 140

function TokenUsageTimeseriesSection({
  data,
  isError,
  isFetching,
  onRetry,
  onWindowChange,
  window,
}: {
  data: TokenUsageTimeseries | undefined
  isError: boolean
  isFetching: boolean
  onRetry: () => void
  onWindowChange: (w: TokenUsageWindow) => void
  window: TokenUsageWindow
}) {
  const days = TOKEN_WINDOW_DAYS[window]
  const bucketDates = useMemo(() => buildDailyBuckets(days), [days])
  const series = useMemo(() => buildDailySeries(data?.points ?? [], bucketDates), [data, bucketDates])
  const max = Math.max(...QUOTA_TYPES.flatMap((t) => series[t]), 1)
  const hasUsage = max > 1 || QUOTA_TYPES.some((t) => series[t].some((v) => v > 0))
  const stepX = bucketDates.length > 1 ? 100 / (bucketDates.length - 1) : 0

  const usageByType = new Map((data?.currentPeriod ?? []).map((item) => [item.quotaType, item]))

  const labelStep = Math.max(1, Math.round((bucketDates.length - 1) / 4))
  const labelIndices = bucketDates.map((_, i) => i).filter((i) => i % labelStep === 0 || i === bucketDates.length - 1)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5.5">
      <div className="mb-4.5 flex flex-wrap items-start gap-3.5">
        <div>
          <h3 className="text-base font-extrabold tracking-tight text-slate-900">Sử dụng token theo thời gian</h3>
          <p className="mt-0.5 text-[13px] text-slate-500">Token AI tiêu thụ mỗi ngày, theo 3 nghiệp vụ dùng AI chấm/luyện</p>
        </div>
        <div className="ml-auto flex gap-0.5 rounded-[10px] bg-slate-100 p-0.5">
          {(Object.keys(TOKEN_WINDOW_DAYS) as TokenUsageWindow[]).map((w) => (
            <button
              className={`rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition ${w === window ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
              key={w}
              onClick={() => onWindowChange(w)}
              type="button"
            >
              {w} ngày
            </button>
          ))}
        </div>
      </div>

      {isError ? (
        <div className="mb-4.5 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-700">
          <AlertTriangle aria-hidden="true" className="size-4.5 shrink-0" />
          <span className="flex-1">Không tải được dữ liệu theo khoảng thời gian này.</span>
          <button className="shrink-0 font-bold underline underline-offset-2" onClick={onRetry} type="button">
            Thử lại
          </button>
        </div>
      ) : null}

      <div className={isFetching ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
        <div className="text-[13px] font-semibold text-slate-500">Tổng token đã dùng ({days} ngày)</div>
        <div className="mt-1 text-4xl font-extrabold tracking-tight text-slate-900 tabular-nums">
          {formatUsd(data?.totalUsed ?? 0)}
        </div>

        <div className="mt-3.5 flex flex-wrap gap-4">
          {QUOTA_TYPES.map((t) => (
            <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-600" key={t}>
              <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: QUOTA_COLORS[t] }} />
              {QUOTA_LABELS[t]}
            </span>
          ))}
        </div>

        <div className="relative mt-4 h-35">
          {!hasUsage ? (
            <div className="absolute inset-0 flex items-center justify-center text-[13px] text-slate-400">
              Chưa có dữ liệu sử dụng trong khoảng thời gian này.
            </div>
          ) : (
            <svg
              aria-hidden="true"
              className="size-full overflow-visible"
              preserveAspectRatio="none"
              viewBox={`0 0 100 ${USAGE_CHART_HEIGHT}`}
            >
              {QUOTA_TYPES.map((t) => (
                <polyline
                  fill="none"
                  key={t}
                  points={series[t].map((v, i) => `${i * stepX},${USAGE_CHART_HEIGHT - (v / max) * USAGE_CHART_HEIGHT}`).join(' ')}
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
            <span
              className="absolute -translate-x-1/2"
              key={bucketDates[i]}
              style={{ left: `${i * stepX}%` }}
            >
              {formatShortDate(bucketDates[i])}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5.5 sm:grid-cols-3">
        {QUOTA_TYPES.map((quotaType) => (
          <TokenQuotaPanel key={quotaType} quotaType={quotaType} usage={usageByType.get(quotaType)} />
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <a
          className="inline-flex items-center gap-1 text-[13.5px] font-bold text-indigo-600 hover:text-indigo-700"
          href="/school-admin/subscription"
        >
          Xem gói & mua thêm
          <ArrowUpRight aria-hidden="true" className="size-3.5" />
        </a>
      </div>
    </div>
  )
}

const UNPROCESSED_APPEAL_STATUS = APPEAL_STATUS.filter((s) => s.key === 'pending' || s.key === 'processing')
const PROCESSED_APPEAL_STATUS = APPEAL_STATUS.filter((s) => s.key === 'published' || s.key === 'rejected')

function AppealStatusGroup({
  a,
  statuses,
  tone,
  total,
}: {
  a: SchoolAdminDashboard['appealStats']
  statuses: typeof APPEAL_STATUS
  tone: 'open' | 'resolved'
  total: number
}) {
  const toneClass =
    tone === 'open'
      ? { badge: 'bg-orange-100 text-orange-800', border: 'border-orange-200 bg-orange-50/40', icon: 'bg-orange-100 text-orange-700' }
      : { badge: 'bg-emerald-100 text-emerald-800', border: 'border-slate-200 bg-slate-50/60', icon: 'bg-emerald-100 text-emerald-700' }

  return (
    <div className={`rounded-[16px] border p-4 ${toneClass.border}`}>
      <div className="mb-3.5 flex items-center gap-2.5">
        <span className={`flex size-8 items-center justify-center rounded-[10px] ${toneClass.icon}`}>
          {tone === 'open' ? <Hourglass aria-hidden="true" className="size-4" /> : <CheckCircle2 aria-hidden="true" className="size-4" />}
        </span>
        <span className="text-[13.5px] font-extrabold text-slate-800">{tone === 'open' ? 'Chưa xử lý' : 'Đã xử lý'}</span>
        <span className={`ml-auto inline-flex items-center rounded-full px-2.5 py-0.5 text-[13px] font-extrabold tabular-nums ${toneClass.badge}`}>
          {total}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {statuses.map((s) => (
          <div className="rounded-xl border border-white bg-white/70 p-3" key={s.key}>
            <div className="mb-2 flex items-center gap-1.5">
              <span className="size-2 shrink-0 rounded-full" style={{ background: s.color }} />
              <span className="text-[12px] font-bold text-slate-600">{s.label}</span>
            </div>
            <div className="text-[26px] font-extrabold leading-none tracking-tight text-slate-900 tabular-nums">{a[s.key]}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Appeals({ a }: { a: SchoolAdminDashboard['appealStats'] }) {
  const total = APPEAL_STATUS.reduce((s, x) => s + a[x.key], 0)
  const open = a.pending + a.processing
  const resolved = a.published + a.rejected
  const rate = resolved ? Math.round((a.published / resolved) * 100) : 0

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5.5" id="appeals">
      <div className="mb-4.5 flex items-start gap-3.5">
        <div>
          <h3 className="text-base font-extrabold tracking-tight text-slate-900">Yêu cầu khiếu nại</h3>
          <p className="mt-0.5 text-[13px] text-slate-500">Phúc khảo điểm thi trong toàn trường, theo trạng thái xử lý</p>
        </div>
        <div className="ml-auto text-right text-[22px] font-extrabold text-slate-900 tabular-nums">
          {total}
          <small className="block text-[11.5px] font-semibold text-slate-500">tổng đơn</small>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <AppealStatusGroup a={a} statuses={UNPROCESSED_APPEAL_STATUS} tone="open" total={open} />
        <AppealStatusGroup a={a} statuses={PROCESSED_APPEAL_STATUS} tone="resolved" total={resolved} />
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-[13.5px] text-slate-600">
        <a className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-700" href="/school-admin/reevaluation">
          Xử lý khiếu nại
          <ArrowUpRight aria-hidden="true" className="size-3.5" />
        </a>
        <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
          <Flag aria-hidden="true" className="size-4.5" />
          {rate}% được chấp thuận
        </span>
      </div>
    </div>
  )
}

/**
 * Chiều cao theo căn bậc hai thay vì tuyến tính: gói dịch vụ trả theo năm nên 1 tháng gia hạn
 * thường lớn hơn hẳn các tháng chỉ mua thêm token — nếu scale tuyến tính, những tháng mua thêm nhỏ
 * sẽ tụt xuống gần như bằng 0 cạnh tháng gia hạn, nhìn không phân biệt được. Căn bậc hai nén bớt
 * chênh lệch đó lại để cột nào cũng còn nhìn thấy được chiều cao thực.
 */
function spendingHeightPct(amount: number, maxAmount: number) {
  if (maxAmount <= 0) {
    return 1.5
  }
  return Math.max((Math.sqrt(amount) / Math.sqrt(maxAmount)) * 100, amount > 0 ? 4 : 1.5)
}

function SpendingChart({ monthlySpending, revenue }: { monthlySpending: SchoolAdminDashboard['monthlySpending']; revenue: number }) {
  const now = new Date()
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const currentYear = String(now.getFullYear())

  const thisMonth = monthlySpending.find((m) => m.month === currentMonthKey)?.amount ?? 0
  const thisYear = monthlySpending.filter((m) => m.month.startsWith(currentYear)).reduce((sum, m) => sum + m.amount, 0)
  const tokenTopUpTotal = monthlySpending.reduce((sum, m) => sum + m.tokenTopUpAmount, 0)
  const max = Math.max(...monthlySpending.map((m) => m.amount), 1)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5.5">
      <div className="mb-4.5 flex flex-wrap items-start justify-between gap-3.5">
        <div className="flex items-start gap-3.5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-emerald-50 text-emerald-700">
            <Wallet aria-hidden="true" className="size-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold tracking-tight text-slate-900">Chi tiêu của trường</h3>
            <p className="mt-0.5 text-[13px] text-slate-500">Hóa đơn đã thanh toán theo từng tháng — gói dịch vụ & mua thêm token</p>
          </div>
        </div>
        <div className="flex gap-5 text-right">
          <div>
            <div className="text-[11.5px] font-semibold text-slate-500">Tháng này</div>
            <div className="text-base font-extrabold text-slate-900 tabular-nums">{fmt(thisMonth)} ₫</div>
          </div>
          <div>
            <div className="text-[11.5px] font-semibold text-slate-500">Năm nay</div>
            <div className="text-base font-extrabold text-slate-900 tabular-nums">{fmt(thisYear)} ₫</div>
          </div>
          <div>
            <div className="text-[11.5px] font-semibold text-slate-500">Tổng cộng</div>
            <div className="text-base font-extrabold text-slate-900 tabular-nums">{fmt(revenue)} ₫</div>
          </div>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-4 text-[12.5px] font-semibold text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px]" style={{ background: '#4F46E5' }} />
          Gói dịch vụ
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px]" style={{ background: '#F59E0B' }} />
          Mua thêm token
          {tokenTopUpTotal > 0 ? <b className="text-slate-700">({fmt(tokenTopUpTotal)} ₫)</b> : null}
        </span>
      </div>

      <div className="flex h-40 items-end gap-2 border-b border-slate-100 pb-0.5">
        {monthlySpending.map((m) => {
          const [year, month] = m.month.split('-')
          const isCurrent = m.month === currentMonthKey
          const totalHeightPct = spendingHeightPct(m.amount, max)
          const tokenSharePct = m.amount > 0 ? (m.tokenTopUpAmount / m.amount) * 100 : 0

          return (
            <div className="flex flex-1 flex-col items-center justify-end gap-1.5" key={m.month}>
              <div
                className="flex w-full flex-col justify-end overflow-hidden rounded-t-[5px] transition-all"
                style={{ height: `${totalHeightPct}%` }}
                title={`Tháng ${Number(month)}/${year}: ${fmt(m.amount)} ₫ (gói ${fmt(m.subscriptionAmount)} ₫ · token ${fmt(m.tokenTopUpAmount)} ₫)`}
              >
                <div className="w-full shrink-0" style={{ background: '#F59E0B', height: `${tokenSharePct}%` }} />
                <div className={`w-full flex-1 ${isCurrent ? 'bg-linear-to-t from-indigo-600 to-cyan-500' : 'bg-indigo-200'}`} />
              </div>
              <span className={`text-[11px] font-bold ${isCurrent ? 'text-indigo-600' : 'text-slate-400'}`}>T{Number(month)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const QUESTION_STATUS = [
  { color: '#94A3B8', icon: <SquarePen aria-hidden="true" className="size-4.5" />, key: 'draft' as const, label: 'Bản nháp' },
  { color: '#F59E0B', icon: <Hourglass aria-hidden="true" className="size-4.5" />, key: 'submittedForReview' as const, label: 'Chờ duyệt' },
  { color: '#FB923C', icon: <PenLine aria-hidden="true" className="size-4.5" />, key: 'revisionRequested' as const, label: 'Yêu cầu chỉnh sửa' },
  { color: '#4F46E5', icon: <CheckCircle2 aria-hidden="true" className="size-4.5" />, key: 'approved' as const, label: 'Đã duyệt' },
  { color: '#EF4444', icon: <XCircle aria-hidden="true" className="size-4.5" />, key: 'rejected' as const, label: 'Bị từ chối' },
  { color: '#10B981', icon: <Megaphone aria-hidden="true" className="size-4.5" />, key: 'published' as const, label: 'Đã xuất bản' },
  { color: '#64748B', icon: <Archive aria-hidden="true" className="size-4.5" />, key: 'archived' as const, label: 'Lưu trữ' },
]

function QuestionBankStatsCard({ isLoading, stats }: { isLoading: boolean; stats: QuestionBankStats | undefined }) {
  const s = stats ?? {
    approved: 0,
    archived: 0,
    description: 0,
    draft: 0,
    longAnswer: 0,
    opinion: 0,
    published: 0,
    readAloud: 0,
    rejected: 0,
    revisionRequested: 0,
    shortAnswer: 0,
    submittedForReview: 0,
    totalQuestionBanks: 0,
    totalQuestions: 0,
  }
  const max = Math.max(...QUESTION_STATUS.map((item) => s[item.key]), 1)
  const pendingReview = s.submittedForReview + s.revisionRequested

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5.5">
      <div className="mb-4.5 flex items-start gap-3.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-indigo-50 text-indigo-700">
          <FileQuestion aria-hidden="true" className="size-4.5" />
        </span>
        <div>
          <h3 className="text-base font-extrabold tracking-tight text-slate-900">Câu hỏi của trường</h3>
          <p className="mt-0.5 text-[13px] text-slate-500">Ngân hàng câu hỏi & tiến trình duyệt</p>
        </div>
        <div className="ml-auto text-right text-[22px] font-extrabold text-slate-900 tabular-nums">
          {s.totalQuestions}
          <small className="block text-[11.5px] font-semibold text-slate-500">{s.totalQuestionBanks} ngân hàng</small>
        </div>
      </div>
      <div className={isLoading ? 'flex flex-col gap-3 opacity-50 transition-opacity' : 'flex flex-col gap-3 transition-opacity'}>
        {QUESTION_STATUS.map((item) => (
          <div className="flex items-center gap-3.5" key={item.key}>
            <span className="flex w-40 shrink-0 items-center gap-1.5 text-[13px] font-semibold text-slate-600">
              {item.label}
            </span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full" style={{ background: item.color, width: `${(s[item.key] / max) * 100}%` }} />
            </div>
            <span className="w-8 text-right text-[15px] font-extrabold text-slate-900 tabular-nums">{s[item.key]}</span>
          </div>
        ))}
      </div>
      <div className="mt-5.5 flex items-center justify-between border-t border-slate-100 pt-4">
        <div className="flex items-center gap-2.5 text-[13.5px] text-slate-600">
          <Hourglass aria-hidden="true" className="size-4.5 text-amber-500" />
          <span>
            <b className="text-slate-900">{pendingReview}</b> câu hỏi đang chờ duyệt
          </span>
        </div>
        <a className="inline-flex items-center gap-1 text-[13.5px] font-bold text-indigo-600 hover:text-indigo-700" href="/school-admin/questions/all">
          Quản lý câu hỏi
          <ArrowUpRight aria-hidden="true" className="size-3.5" />
        </a>
      </div>
    </div>
  )
}

function toIsoRangeBound(date: string | null, endOfDay: boolean) {
  return date ? `${date}T${endOfDay ? '23:59:59' : '00:00:00'}Z` : null
}

export function SchoolAdminDashboardPage() {
  const user = useAppSelector((state) => state.auth.user)
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useSchoolAdminDashboardQuery()
  const [examDateRange, setExamDateRange] = useState<DateRangeValue>({ from: null, to: null })
  const { dateFrom, dateTo } = useMemo(
    () => ({ dateFrom: toIsoRangeBound(examDateRange.from, false), dateTo: toIsoRangeBound(examDateRange.to, true) }),
    [examDateRange],
  )
  const {
    data: rangedExamStatus,
    isError: isRangedExamStatusError,
    isFetching: isRangedExamStatusFetching,
    refetch: refetchRangedExamStatus,
  } = useExamStatusRangeQuery(dateFrom, dateTo)
  const [tokenWindow, setTokenWindow] = useState<TokenUsageWindow>('30')
  const tokenDateFrom = useMemo(() => `${isoDateDaysAgo(TOKEN_WINDOW_DAYS[tokenWindow] - 1)}T00:00:00Z`, [tokenWindow])
  const tokenDateTo = `${isoDateDaysAgo(0)}T23:59:59Z`
  const {
    data: tokenUsageTimeseries,
    isError: isTokenUsageError,
    isFetching: isTokenUsageFetching,
    refetch: refetchTokenUsage,
  } = useTokenUsageTimeseriesQuery(tokenDateFrom, tokenDateTo, 'DAY')
  const { data: questionBankStats, isLoading: isQuestionBankStatsLoading } = useQuestionBankStatsQuery()
  const { data: nearestExam, isLoading: isNearestExamLoading } = useNearestCentralizedExamQuery()

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <RefreshCw className="size-8 animate-spin text-indigo-600" />
        <p className="text-sm text-slate-500">Đang tải tổng quan trường...</p>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle className="size-12 text-red-500" />
        <p className="text-slate-600">Không tải được dữ liệu tổng quan trường.</p>
        <button className="rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-700" onClick={() => refetch()} type="button">
          Thử lại
        </button>
      </div>
    )
  }

  const c = data.examStatusCounts
  const rangedCounts = rangedExamStatus ?? c
  const hasTokenSub = data.tokenAllocated > 0
  const tokenPct = hasTokenSub ? Math.round((data.tokenUsed / data.tokenAllocated) * 100) : 0

  const renewal = data.subscriptionRenewal
  const renewalDaysLeft = renewal ? daysUntil(renewal.endDate) : null
  const renewalExpired = renewalDaysLeft !== null && renewalDaysLeft < 0
  const renewalUrgent = renewalDaysLeft !== null && renewalDaysLeft >= 0 && renewalDaysLeft <= 30
  const renewalTint = !renewal
    ? { bg: 'bg-slate-100', fg: 'text-slate-500' }
    : renewalExpired || (renewalDaysLeft !== null && renewalDaysLeft <= 7)
      ? { bg: 'bg-red-50', fg: 'text-red-700' }
      : renewalUrgent
        ? { bg: 'bg-amber-50', fg: 'text-amber-700' }
        : { bg: 'bg-indigo-50', fg: 'text-indigo-700' }

  return (
    <section className="grid gap-5">
      <div className="flex flex-wrap items-start gap-5">
        <div>
          <h1 className="mt-2.5 text-3xl font-extrabold tracking-tight text-slate-900">Tổng quan trường</h1>
          <p className="mt-1.5 max-w-160 text-[15px] text-slate-500">
            Toàn cảnh hoạt động của trường — phòng thi, khiếu nại, mức dùng token và chi tiêu của trường
            {user?.email ? ` · ${user.email}` : ''}.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <Kpi
          cta={!renewal || renewalUrgent ? (renewal ? 'Gia hạn ngay' : 'Đăng ký gói') : undefined}
          icon={<Repeat aria-hidden="true" className="size-5.5" />}
          label="Còn lại đến khi gia hạn"
          onCta={() => navigate('/school-admin/subscription')}
          sub={
            renewal ? (
              <span className="font-semibold text-slate-600">
                {renewal.planName ?? 'Gói dịch vụ'} · hết hạn <b className="text-slate-900">{formatDate(renewal.endDate)}</b>
              </span>
            ) : (
              <span className="font-semibold text-slate-600">Chưa có gói đăng ký đang hoạt động</span>
            )
          }
          tint={renewalTint}
          unit={renewal && !renewalExpired ? 'ngày' : undefined}
          value={!renewal ? '—' : renewalExpired ? 'Hết hạn' : renewalDaysLeft}
        />
        <Kpi
          icon={<Coins aria-hidden="true" className="size-5.5" />}
          label="Token đã dùng"
          sub={<span className="font-semibold text-slate-600">{formatUsd(data.tokenUsed)} / {formatUsd(data.tokenAllocated)}</span>}
          tint={{ bg: 'bg-orange-50', fg: 'text-orange-700' }}
          unit="%"
          value={tokenPct}
        />
        <Kpi
          accent
          cta="Xử lý ngay"
          icon={<Gavel aria-hidden="true" className="size-5.5" />}
          label="Khiếu nại chờ xử lý"
          onCta={() => navigate('/school-admin/reevaluation')}
          sub="Đơn phúc khảo cần được xử lý"
          value={data.appealStats.pending}
        />
      </div>

      <NearestCentralizedExamCard exam={nearestExam} isLoading={isNearestExamLoading} />

      <ExamStatusCard
        c={rangedCounts}
        isError={isRangedExamStatusError}
        isFetching={isRangedExamStatusFetching}
        onRangeChange={setExamDateRange}
        onRetry={() => void refetchRangedExamStatus()}
        range={examDateRange}
      />

      {hasTokenSub ? (
        <TokenUsageTimeseriesSection
          data={tokenUsageTimeseries}
          isError={isTokenUsageError}
          isFetching={isTokenUsageFetching}
          onRetry={() => void refetchTokenUsage()}
          onWindowChange={setTokenWindow}
          window={tokenWindow}
        />
      ) : (
        <TokenNoSubscriptionCard />
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1.35fr]">
        <Appeals a={data.appealStats} />
        <QuestionBankStatsCard isLoading={isQuestionBankStatsLoading} stats={questionBankStats} />
      </div>

      <SpendingChart monthlySpending={data.monthlySpending} revenue={data.revenue} />

      <div className="text-[13px] text-slate-400">
        Chỉ tính hóa đơn ở trạng thái <b className="text-slate-600">đã trả</b>.
      </div>
    </section>
  )
}
