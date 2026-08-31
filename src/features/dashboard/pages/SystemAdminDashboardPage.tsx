import { useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Building2,
  ChevronRight,
  Clock,
  GraduationCap,
  Hourglass,
  Percent,
  Presentation,
  Radio,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Wallet,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { shortVnDay as shortDay, vnDayAfterIso, vnDayStartIso } from '@/shared/lib/vnDateRange'
import { DateRangeFilter } from '@/shared/ui/DateRangeFilter'
import { presetToRange, type DateRangeValue, type Preset } from '@/shared/ui/dateRangePresets'
import { usePlatformBusinessHealthQuery, type PlatformBusinessHealth } from '../api/usePlatformBusinessHealthQuery'
import { usePlatformOperationalHealthQuery, type PlatformOperationalHealth } from '../api/usePlatformOperationalHealthQuery'
import { useSystemAdminDashboardQuery, type SystemAdminDashboard } from '../api/useSystemAdminDashboardQuery'

const fmt = (n: number) => n.toLocaleString('vi-VN')

/**
 * Rút gọn theo ĐỘ LỚN thay vì chia cứng cho 1 tỷ: nền tảng còn nhỏ thì "0,05 tỷ ₫" vừa khó đọc vừa
 * mất hết chữ số có nghĩa.
 */
function formatVndCompact(value: number) {
  if (Math.abs(value) >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tỷ`
  }
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} triệu`
  }
  return fmt(value)
}

const SYSTEM_ADMIN_PRESETS: Preset[] = [
  { days: 'mtd', key: 'mtd', label: 'Tháng này' },
  { days: 'ytd', key: 'ytd', label: 'Năm nay' },
]

function TrendPill({ children, up }: { children: React.ReactNode; up: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-bold tabular-nums ${
        up ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
      }`}
    >
      {up ? <TrendingUp aria-hidden="true" className="size-3.5" /> : <TrendingDown aria-hidden="true" className="size-3.5" />}
      {children}
    </span>
  )
}

function NoComparison() {
  return <span className="text-[12px] font-semibold text-slate-400">chưa có kỳ trước để so</span>
}

function DeltaPill({ current, previous }: { current: number; previous: number }) {
  // Không có kỳ trước để so thì KHÔNG vẽ "+0%": đi từ 0 lên một số dương là tăng trưởng tốt nhất có
  // thể, hiển thị 0% khiến nó trông như đứng yên.
  if (previous <= 0) {
    return <NoComparison />
  }
  const delta = Math.round(((current - previous) / previous) * 100)
  return (
    <TrendPill up={delta >= 0}>
      {delta >= 0 ? '+' : ''}
      {delta}%
    </TrendPill>
  )
}

/**
 * Biên lợi nhuận đã LÀ một tỷ lệ, nên chênh lệch giữa hai kỳ phải đọc bằng ĐIỂM phần trăm: 68% so
 * với 72% là giảm 4 điểm. Đưa nó qua công thức phần trăm tương đối của `DeltaPill` sẽ in ra "−5,6%",
 * đúng về số học nhưng không ai điều hành đọc biên theo cách đó.
 *
 * `null` ở mỗi đầu nghĩa là kỳ đó chưa thu được đồng nào, tức biên không tồn tại chứ không phải bằng
 * 0 — và hai đầu thiếu nói hai chuyện khác nhau. Thiếu KỲ NÀY thì thẻ đã in "—" ở chỗ con số rồi,
 * dán thêm "chưa có kỳ trước để so" vào là đổ lỗi nhầm kỳ; chỉ khi thiếu KỲ TRƯỚC mới nói câu đó.
 */
function MarginDeltaPill({ current, previous }: { current: number | null; previous: number | null }) {
  if (current === null) {
    return null
  }
  if (previous === null) {
    return <NoComparison />
  }
  const delta = Math.round((current - previous) * 10) / 10
  return (
    <TrendPill up={delta >= 0}>
      {delta > 0 ? '+' : ''}
      {delta.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} điểm
    </TrendPill>
  )
}

/**
 * `null` = hàng đợi rỗng, `0` = có đơn nhưng vừa nộp hôm nay. Ở chỉ số này 0 lại là trạng thái tốt
 * nhất, nên gộp hai trường hợp sẽ khiến một hàng đợi sạch và một hàng đợi vừa được nạp đầy in ra
 * cùng một dòng chữ.
 */
function oldestPendingLabel(days: number | null) {
  if (days === null) {
    return 'Không còn đơn nào chờ duyệt'
  }
  if (days === 0) {
    return 'Đơn cũ nhất nộp hôm nay'
  }
  return `Đơn cũ nhất đã chờ ${fmt(days)} ngày`
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
        {unit ? <small className={accent ? 'ml-1 text-base font-bold text-white/75' : 'ml-1 text-base font-bold text-slate-400'}>{unit}</small> : null}
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

function CardMessage({ icon, onRetry, text }: { icon: React.ReactNode; onRetry?: () => void; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 py-10 text-center">
      {icon}
      <p className="text-[13.5px] text-slate-500">{text}</p>
      {onRetry ? (
        <button className="text-[13.5px] font-bold text-indigo-600 underline underline-offset-2" onClick={onRetry} type="button">
          Thử lại
        </button>
      ) : null}
    </div>
  )
}

const GRADING_BAR_HEIGHT = 96

function FailedSessionsTile({ count, href }: { count: number; href: string }) {
  const body = (
    <>
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-[10px] ${
          count > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'
        }`}
      >
        <AlertTriangle aria-hidden="true" className="size-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-bold text-slate-600">Phiên AI chấm lỗi</div>
        <div className="mt-0.5 text-[12.5px] text-slate-500">
          {count > 0 ? 'Xem chi tiết theo nguyên nhân' : 'Trong khoảng đã chọn'}
        </div>
      </div>
      <span
        className={`text-[26px] font-extrabold leading-none tracking-tight tabular-nums ${
          count > 0 ? 'text-red-600' : 'text-slate-900'
        }`}
      >
        {fmt(count)}
      </span>
      {count > 0 ? <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-red-400" /> : null}
    </>
  )

  if (count === 0) {
    return (
      <div className="flex items-center gap-3.5 rounded-[14px] border border-slate-200 bg-slate-50/60 px-4 py-3.5">
        {body}
      </div>
    )
  }

  return (
    <Link
      className="flex items-center gap-3.5 rounded-[14px] border border-red-200 bg-red-50/60 px-4 py-3.5 transition hover:bg-red-50"
      to={href}
    >
      {body}
    </Link>
  )
}

function OperationalHealthCard({
  data,
  failuresHref,
  isError,
  isFetching,
  isLoading,
  onRetry,
}: {
  data: PlatformOperationalHealth | undefined
  failuresHref: string
  isError: boolean
  isFetching: boolean
  isLoading: boolean
  onRetry: () => void
}) {
  const maxTotal = Math.max(...(data?.daily ?? []).map((bucket) => bucket.graded + bucket.failed), 1)
  const hasUsage = (data?.daily ?? []).some((bucket) => bucket.graded + bucket.failed > 0)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5.5">
      <div className="mb-4.5 flex flex-wrap items-start gap-3.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-emerald-50 text-emerald-700">
          <Activity aria-hidden="true" className="size-4.5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-extrabold tracking-tight text-slate-900">Sức khỏe vận hành</h3>
          <p className="mt-0.5 text-[13px] text-slate-500">Đường chấm AI trong khoảng đã chọn, và kỳ thi đang chạy ngay lúc này</p>
        </div>
      </div>

      {isLoading ? (
        <CardMessage icon={<RefreshCw aria-hidden="true" className="size-6 animate-spin text-indigo-600" />} text="Đang tải..." />
      ) : isError || !data ? (
        <CardMessage
          icon={<AlertTriangle aria-hidden="true" className="size-7 text-red-500" />}
          onRetry={onRetry}
          text="Không tải được tình trạng vận hành."
        />
      ) : (
        <div className={isFetching ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.45fr_1fr]">
            <div>
              <div className="flex flex-wrap items-baseline gap-2.5">
                <span className="text-4xl font-extrabold tracking-tight text-slate-900 tabular-nums">
                  {data.successRatePercent === null ? '—' : data.successRatePercent.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
                </span>
                {data.successRatePercent === null ? null : <span className="text-base font-bold text-slate-400">%</span>}
                <span className="text-[13.5px] font-semibold text-slate-500">
                  {data.successRatePercent === null ? 'chưa có lượt chấm nào trong khoảng này' : 'lượt chấm AI thành công'}
                </span>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-4 text-[12.5px] font-semibold text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-[3px] bg-indigo-200" />
                  Chấm thành công <b className="text-slate-900 tabular-nums">{fmt(data.graded)}</b>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-[3px] bg-red-500" />
                  Lỗi / treo <b className="text-slate-900 tabular-nums">{fmt(data.gradingFailed)}</b>
                </span>
              </div>

              <div className="relative mt-3.5" style={{ height: GRADING_BAR_HEIGHT }}>
                {!hasUsage ? (
                  <div className="absolute inset-0 flex items-center justify-center text-[13px] text-slate-400">
                    Chưa có lượt chấm nào trong khoảng thời gian này.
                  </div>
                ) : (
                  // Khoảng cách giữa cột phải co lại khi chuỗi dài: `gap` của flex KHÔNG co được,
                  // nên với cửa sổ "Năm nay" (365 cột) riêng phần gap đã là ~2200px và tràn ra
                  // ngoài thẻ, trong khi các cột thì bị ép về 0.
                  <div
                    className="flex h-full items-end overflow-hidden border-b border-slate-100 pb-0.5"
                    style={{ gap: data.daily.length > 60 ? '1px' : '6px' }}
                  >
                    {data.daily.map((bucket) => {
                      const total = bucket.graded + bucket.failed
                      const failedShare = total > 0 ? (bucket.failed / total) * 100 : 0
                      return (
                        <div
                          className="flex flex-1 flex-col justify-end overflow-hidden rounded-t-[4px]"
                          key={bucket.day}
                          style={{ height: `${Math.max((total / maxTotal) * 100, total > 0 ? 4 : 1.5)}%` }}
                          title={`${shortDay(bucket.day)}: ${fmt(bucket.graded)} thành công · ${fmt(bucket.failed)} lỗi`}
                        >
                          <div className="w-full shrink-0 bg-red-500" style={{ height: `${failedShare}%` }} />
                          <div className="w-full flex-1 bg-indigo-200" />
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              {data.daily.length > 0 ? (
                <div className="mt-2 flex justify-between text-[11px] font-bold text-slate-400">
                  <span>{shortDay(data.daily[0].day)}</span>
                  <span>{shortDay(data.daily[data.daily.length - 1].day)}</span>
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 self-start">
              <div className="flex items-center gap-3.5 rounded-[14px] border border-slate-200 bg-slate-50/60 px-4 py-3.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-cyan-50 text-cyan-700">
                  <Radio aria-hidden="true" className="size-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-bold text-slate-600">Đang diễn ra</div>
                  <div className="mt-0.5 text-[12.5px] text-slate-500">
                    <b className="text-slate-700 tabular-nums">{fmt(data.sessionsInProgress)}</b> phiên đang thi
                  </div>
                </div>
                <span className="text-[26px] font-extrabold leading-none tracking-tight text-slate-900 tabular-nums">
                  {fmt(data.examsInProgress)}
                </span>
              </div>

              <div className="flex items-center gap-3.5 rounded-[14px] border border-slate-200 bg-slate-50/60 px-4 py-3.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-indigo-50 text-indigo-700">
                  <Hourglass aria-hidden="true" className="size-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-bold text-slate-600">Hàng chờ chấm</div>
                  <div className="mt-0.5 text-[12.5px] text-slate-500">Đã nộp, chờ hoặc đang chấm</div>
                </div>
                <span className="text-[26px] font-extrabold leading-none tracking-tight text-slate-900 tabular-nums">
                  {fmt(data.gradingQueueDepth)}
                </span>
              </div>

              {/* Bấm được CHỈ KHI có phiên hỏng: 0 phiên thì trang bên kia không có gì để phân
                  loại, và một link dẫn tới màn hình rỗng đắt hơn là không có link. */}
              <FailedSessionsTile count={data.gradingFailed} href={failuresHref} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * `bucket` là cùng bộ khóa mà query `schoolsAtRisk` nhận, nên bấm vào một dòng mở ra đúng nhóm đã
 * sinh ra con số ở dòng đó — cùng vị từ, cùng mốc, không phải một phép lọc gần giống.
 */
const AT_RISK_ROWS = [
  { bucket: 'EXPIRING_SOON', color: '#F59E0B', key: 'expiringSoonSchools' as const, label: 'Sắp hết hạn (≤ 30 ngày)', tone: 'border-amber-200 bg-amber-50/40 hover:bg-amber-50' },
  { bucket: 'LAPSED', color: '#EF4444', key: 'lapsedSchools' as const, label: 'Đã hết hạn', tone: 'border-red-200 bg-red-50/40 hover:bg-red-50' },
  { bucket: 'SUSPENDED', color: '#64748B', key: 'suspendedSchools' as const, label: 'Bị tạm ngưng', tone: 'border-slate-200 bg-slate-50/60 hover:bg-slate-100' },
  { bucket: 'IN_DEBT', color: '#EA580C', key: 'schoolsInDebt' as const, label: 'Đang nợ hạn mức', tone: 'border-orange-200 bg-orange-50/40 hover:bg-orange-50' },
]

function SchoolsAtRiskCard({
  data,
  isError,
  isFetching,
  isLoading,
  onRetry,
}: {
  data: PlatformBusinessHealth | undefined
  isError: boolean
  isFetching: boolean
  isLoading: boolean
  onRetry: () => void
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5.5">
      <div className="mb-4.5 flex items-start gap-3.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-orange-50 text-orange-700">
          <AlertTriangle aria-hidden="true" className="size-4.5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-extrabold tracking-tight text-slate-900">Trường cần chú ý</h3>
          <p className="mt-0.5 text-[13px] text-slate-500">Gói dịch vụ &amp; công nợ</p>
        </div>
      </div>

      {isLoading ? (
        <CardMessage icon={<RefreshCw aria-hidden="true" className="size-6 animate-spin text-indigo-600" />} text="Đang tải..." />
      ) : isError || !data ? (
        <CardMessage
          icon={<AlertTriangle aria-hidden="true" className="size-7 text-red-500" />}
          onRetry={onRetry}
          text="Không tải được danh sách trường cần chú ý."
        />
      ) : (
        <>
          <div className={isFetching ? 'grid gap-2.5 opacity-50 transition-opacity' : 'grid gap-2.5 transition-opacity'}>
            {AT_RISK_ROWS.map((row) => (
              <Link
                className={`flex items-center gap-3 rounded-[14px] border px-3.5 py-3 transition ${row.tone}`}
                key={row.key}
                to={`/system-admin/schools/attention?bucket=${row.bucket}`}
              >
                <span className="size-2 shrink-0 rounded-full" style={{ background: row.color }} />
                <span className="flex-1 text-[13.5px] font-bold text-slate-700">{row.label}</span>
                <span className="text-[20px] font-extrabold text-slate-900 tabular-nums">{fmt(data[row.key])}</span>
                <ChevronRight aria-hidden="true" className="size-4 text-slate-400" />
              </Link>
            ))}
          </div>
          {/* Cố ý KHÔNG cộng tổng. BA DÒNG ĐẦU loại trừ nhau (sắp hết hạn là tập con của nhóm còn
              gói, mà nhóm đó thì không thể vừa hết hạn vừa bị đình chỉ). Chỉ "đang nợ hạn mức" là
              cắt ngang: nó đếm từ số dư ví chứ không từ trạng thái thuê bao, nên một trường còn gói
              mà ví âm nằm ở cả dòng đó lẫn nhóm còn gói. */}
          <p className="mt-3 text-[12px] leading-4 text-slate-400">
            Ba nhóm đầu loại trừ nhau; đang nợ hạn mức chồng lấn cả ba, nên đừng cộng bốn số lại.
          </p>
        </>
      )}
    </div>
  )
}

const REVENUE_CHART_MONTHS = 12

/**
 * Chỉ còn CỘT doanh thu từng tháng. Đường lũy kế cũ đã bị bỏ: nó tăng đơn điệu theo định nghĩa nên
 * không bao giờ báo được một tháng xấu, lại còn dùng thang đo khác (tỷ lệ trên tổng) chồng lên cùng
 * một khung với các cột.
 */
function RevenueChart({ monthlyRevenue }: { monthlyRevenue: SystemAdminDashboard['monthlyRevenue'] }) {
  const points = useMemo(
    () =>
      monthlyRevenue.slice(-REVENUE_CHART_MONTHS).map((entry) => {
        const [year, month] = entry.month.split('-')
        return { amount: entry.amount, label: `T${Number(month)}`, year }
      }),
    [monthlyRevenue],
  )
  const max = Math.max(...points.map((point) => point.amount), 1)
  const total = points.reduce((sum, point) => sum + point.amount, 0)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5.5">
      <div className="mb-4.5 flex flex-wrap items-start gap-3.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-emerald-50 text-emerald-700">
          <Wallet aria-hidden="true" className="size-4.5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-extrabold tracking-tight text-slate-900">Tiền thu theo tháng</h3>
          <p className="mt-0.5 text-[13px] text-slate-500">Đơn hàng đã thu tiền, {REVENUE_CHART_MONTHS} tháng gần nhất</p>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[22px] font-extrabold text-slate-900 tabular-nums">{formatVndCompact(total)} ₫</div>
          <small className="block text-[11.5px] font-semibold text-slate-500">tổng {REVENUE_CHART_MONTHS} tháng</small>
        </div>
      </div>

      {points.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-slate-400">Chưa có đơn hàng nào đã thu tiền.</p>
      ) : (
        <>
          <div className="flex h-40 items-end gap-2 border-b border-slate-100 pb-0.5">
            {points.map((point) => (
              <div
                className="w-full flex-1 rounded-t-[5px] bg-linear-to-t from-indigo-600 to-cyan-500"
                key={`${point.year}-${point.label}`}
                style={{ height: `${Math.max((point.amount / max) * 100, point.amount > 0 ? 4 : 1.5)}%` }}
                title={`${point.label}/${point.year}: ${fmt(point.amount)} ₫`}
              />
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            {points.map((point) => (
              <span className="flex-1 text-center text-[11px] font-bold text-slate-400" key={`${point.year}-${point.label}-label`}>
                {point.label}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Đếm ĐƠN đăng ký nộp vào, không phải trường đã gia nhập: BE dùng
 * `registerFormRepository.countByCreatedAtAfter` và KHÔNG lọc trạng thái, nên đơn đang chờ lẫn đơn
 * bị từ chối đều nằm trong con số này. Nhãn cũ ("Trường mới gia nhập nền tảng") hứa tỷ lệ chuyển
 * đổi trong khi số liệu chỉ đo lượng nộp vào.
 */
function RegistrationIntake({
  onJump,
  pendingRegistrations,
  registrationsLast30Days,
  registrationsLast90Days,
}: {
  onJump: () => void
  pendingRegistrations: number
  registrationsLast30Days: number
  registrationsLast90Days: number
}) {
  const priorSixtyDays = registrationsLast90Days - registrationsLast30Days
  const max = Math.max(registrationsLast90Days, 1)

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5.5">
      <div className="mb-4.5 flex items-start gap-3.5">
        <div className="min-w-0">
          <h3 className="text-base font-extrabold tracking-tight text-slate-900">Đơn đăng ký nộp vào</h3>
          <p className="mt-0.5 text-[13px] text-slate-500">Đơn đã nộp, gồm cả đơn đang chờ và đơn bị từ chối</p>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[22px] font-extrabold text-slate-900 tabular-nums">{fmt(registrationsLast30Days)}</div>
          <small className="block text-[11.5px] font-semibold text-slate-500">30 ngày qua</small>
        </div>
      </div>

      <div className="flex flex-col gap-3.5">
        <div className="flex items-center gap-3.5">
          <span className="w-32 shrink-0 text-[13px] font-semibold text-slate-600">30 ngày gần nhất</span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-linear-to-r from-indigo-600 to-cyan-500"
              style={{ width: `${(registrationsLast30Days / max) * 100}%` }}
            />
          </div>
          <span className="w-8 text-right text-[15px] font-extrabold text-slate-900 tabular-nums">{registrationsLast30Days}</span>
        </div>
        <div className="flex items-center gap-3.5">
          <span className="w-32 shrink-0 text-[13px] font-semibold text-slate-600">31–90 ngày trước</span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-slate-300" style={{ width: `${(priorSixtyDays / max) * 100}%` }} />
          </div>
          <span className="w-8 text-right text-[15px] font-extrabold text-slate-900 tabular-nums">{priorSixtyDays}</span>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
        <div className="flex items-center gap-2.5 text-[13.5px] text-slate-600">
          <Clock aria-hidden="true" className="size-4.5 text-amber-500" />
          <span>
            <b className="text-slate-900">{pendingRegistrations}</b> đơn đang chờ duyệt
          </span>
        </div>
        <button className="inline-flex items-center gap-1 text-[13.5px] font-bold text-indigo-600 hover:text-indigo-700" onClick={onJump} type="button">
          Xem hàng chờ
          <ArrowUpRight aria-hidden="true" className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

function RoleBreakdown({ schoolAdminCount, studentCount, teacherCount }: { schoolAdminCount: number; studentCount: number; teacherCount: number }) {
  const roles = [
    { color: '#4F46E5', icon: <GraduationCap aria-hidden="true" className="size-5" />, label: 'Học sinh', value: studentCount },
    { color: '#06B6D4', icon: <Presentation aria-hidden="true" className="size-5" />, label: 'Giáo viên', value: teacherCount },
    { color: '#8B5CF6', icon: <ShieldCheck aria-hidden="true" className="size-5" />, label: 'Quản trị trường', value: schoolAdminCount },
  ]
  const total = roles.reduce((sum, role) => sum + role.value, 0) || 1
  const max = Math.max(...roles.map((role) => role.value), 1)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5.5">
      <div className="mb-4.5 flex items-start gap-3.5">
        <div className="min-w-0">
          <h3 className="text-base font-extrabold tracking-tight text-slate-900">Lượt gán vai trò</h3>
          <p className="mt-0.5 text-[13px] text-slate-500">Đếm theo vai trò được gán, không phải theo người</p>
        </div>
      </div>
      <div className="flex flex-col gap-4.5">
        {roles.map((role) => (
          <div className="flex items-center gap-3.5" key={role.label}>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[11px]" style={{ background: `${role.color}1a`, color: role.color }}>
              {role.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900">{role.label}</span>
                <span className="text-[12.5px] font-semibold text-slate-500">{((role.value / total) * 100).toFixed(1)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full" style={{ background: role.color, width: `${(role.value / max) * 100}%` }} />
              </div>
            </div>
            <div className="w-16.5 shrink-0 text-right text-base font-extrabold text-slate-900 tabular-nums">{fmt(role.value)}</div>
          </div>
        ))}
      </div>
      {/* Một người giữ hai vai trò được đếm ở CẢ HAI dòng -- BE đếm bản ghi user_role, nên cộng ba
          dòng lại KHÔNG ra số người dùng. */}
      <p className="mt-4 border-t border-slate-100 pt-3.5 text-[12px] leading-4 text-slate-400">
        Người giữ nhiều vai trò được đếm ở mỗi vai trò, nên tổng ba dòng không phải số người dùng.
      </p>
    </div>
  )
}

export function SystemAdminDashboardPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useSystemAdminDashboardQuery()

  const [range, setRange] = useState<DateRangeValue>(() => presetToRange(SYSTEM_ADMIN_PRESETS[0]))
  const { dateFrom, dateTo } = useMemo(
    () => ({ dateFrom: vnDayStartIso(range.from), dateTo: vnDayAfterIso(range.to) }),
    [range],
  )

  const operationalHealth = usePlatformOperationalHealthQuery(dateFrom, dateTo)
  const businessHealth = usePlatformBusinessHealthQuery(dateFrom, dateTo)

  /**
   * Trang phân loại nhận khoảng qua query string thay vì tự chọn lại: nó phải phân loại ĐÚNG những
   * phiên tạo ra con số vừa được bấm. Bỏ qua mốc null (preset "tất cả") để bên kia rơi về mặc định
   * của BE thay vì nhận chuỗi "null".
   */
  const failuresHref = useMemo(() => {
    const params = new URLSearchParams()
    if (range.from) {
      params.set('from', range.from)
    }
    if (range.to) {
      params.set('to', range.to)
    }
    const query = params.toString()
    return query ? `/system-admin/grading-failures?${query}` : '/system-admin/grading-failures'
  }, [range])

  function jumpToPending() {
    navigate('/system-admin/registrations')
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <RefreshCw className="size-8 animate-spin text-indigo-600" />
        <p className="text-sm text-slate-500">Đang tải tổng quan hệ thống...</p>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle className="size-12 text-red-500" />
        <p className="text-slate-600">Không tải được dữ liệu tổng quan hệ thống.</p>
        <button className="rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-700" onClick={() => refetch()} type="button">
          Thử lại
        </button>
      </div>
    )
  }

  const business = businessHealth.data

  return (
    <section className="grid gap-5">
      <div className="grid gap-4">
        <div>
          <h1 className="mt-2.5 text-3xl font-extrabold tracking-tight text-slate-900">Tổng quan hệ thống</h1>
          <p className="mt-1.5 max-w-160 text-[15px] text-slate-500">
            Sức khỏe nền tảng Vox — đường chấm AI, trường đang hoạt động, tiền thu so với chi phí AI, và những việc đang chờ xử lý.
          </p>
        </div>
        <DateRangeFilter onChange={setRange} presets={SYSTEM_ADMIN_PRESETS} value={range} />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {/* Mẫu số là TỔNG SỐ TRƯỜNG, không phải `activeSchools`: cờ School.isActive do người vận hành
            bật tay và không nói gì về việc trường còn gói hay không, nên ghép nó với tử số "có gói
            còn hiệu lực" sẽ ra một phân số hai đơn vị đo khác nhau. */}
        <Kpi
          icon={<Building2 aria-hidden="true" className="size-5.5" />}
          label="Trường đang hoạt động"
          sub={
            business ? (
              <span className="font-semibold text-slate-600">
                Có gói còn hiệu lực. <b className="text-slate-900">{fmt(data.totalSchools - business.subscribedSchools)}</b> trường
                không.
              </span>
            ) : (
              <span className="font-semibold text-slate-400">Đang tải...</span>
            )
          }
          tint={{ bg: 'bg-indigo-50', fg: 'text-indigo-700' }}
          unit={business ? `/ ${fmt(data.totalSchools)}` : undefined}
          value={business ? fmt(business.subscribedSchools) : '—'}
        />
        <Kpi
          icon={<Wallet aria-hidden="true" className="size-5.5" />}
          label="Tiền thu trong kỳ"
          sub={
            business ? (
              <span className="flex flex-wrap items-center gap-2">
                <DeltaPill current={business.revenueVnd} previous={business.previousRevenueVnd} />
                <span className="font-semibold text-slate-600">so với kỳ trước</span>
              </span>
            ) : (
              <span className="font-semibold text-slate-400">Đang tải...</span>
            )
          }
          tint={{ bg: 'bg-emerald-50', fg: 'text-emerald-700' }}
          unit="₫"
          value={business ? formatVndCompact(business.revenueVnd) : '—'}
        />
        <Kpi
          icon={<Percent aria-hidden="true" className="size-5.5" />}
          label="Biên lợi nhuận gộp"
          sub={
            business ? (
              <span className="flex flex-wrap items-center gap-2">
                <MarginDeltaPill current={business.grossMarginPercent} previous={business.previousGrossMarginPercent} />
                <span className="font-semibold text-slate-600">
                  Chi phí AI <b className="text-slate-900">{formatVndCompact(business.aiCostVnd)} ₫</b>
                </span>
              </span>
            ) : (
              <span className="font-semibold text-slate-400">Đang tải...</span>
            )
          }
          tint={{ bg: 'bg-violet-50', fg: 'text-violet-700' }}
          unit={business?.grossMarginPercent === null || business === undefined ? undefined : '%'}
          value={
            business === undefined
              ? '—'
              : business.grossMarginPercent === null
                ? '—'
                : business.grossMarginPercent.toLocaleString('vi-VN', { maximumFractionDigits: 1 })
          }
        />
        <Kpi
          accent
          cta="Xử lý ngay"
          icon={<UserPlus aria-hidden="true" className="size-5.5" />}
          label="Đăng ký chờ duyệt"
          onCta={jumpToPending}
          sub={oldestPendingLabel(data.oldestPendingRegistrationDays)}
          value={fmt(data.pendingRegistrations)}
        />
      </div>

      <OperationalHealthCard
        data={operationalHealth.data}
        failuresHref={failuresHref}
        isError={operationalHealth.isError}
        isFetching={operationalHealth.isFetching}
        isLoading={operationalHealth.isLoading}
        onRetry={() => void operationalHealth.refetch()}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.55fr_1fr]">
        <RevenueChart monthlyRevenue={data.monthlyRevenue} />
        <SchoolsAtRiskCard
          data={businessHealth.data}
          isError={businessHealth.isError}
          isFetching={businessHealth.isFetching}
          isLoading={businessHealth.isLoading}
          onRetry={() => void businessHealth.refetch()}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.55fr_1fr]">
        <RegistrationIntake
          onJump={jumpToPending}
          pendingRegistrations={data.pendingRegistrations}
          registrationsLast30Days={data.registrationsLast30Days}
          registrationsLast90Days={data.registrationsLast90Days}
        />
        <RoleBreakdown schoolAdminCount={data.schoolAdminCount} studentCount={data.studentCount} teacherCount={data.teacherCount} />
      </div>
    </section>
  )
}
