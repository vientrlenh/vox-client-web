import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  Clock,
  Files,
  GraduationCap,
  Presentation,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react'
import { useNavigate } from 'react-router'
import { useMemo, useState } from 'react'
import { useSystemAdminDashboardQuery, type SystemAdminDashboard } from '../api/useSystemAdminDashboardQuery'

const fmt = (n: number) => n.toLocaleString('vi-VN')

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
        <span className={accent ? 'text-sm font-semibold text-white/85' : 'text-sm font-semibold text-slate-500'}>
          {label}
        </span>
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

function RegTrend({ onJump, registrationsLast30Days, registrationsLast90Days, pendingRegistrations }: {
  onJump: () => void
  pendingRegistrations: number
  registrationsLast30Days: number
  registrationsLast90Days: number
}) {
  const [win, setWin] = useState<'30' | '90'>('30')
  const d30 = registrationsLast30Days
  const d90 = registrationsLast90Days
  const prior60 = d90 - d30
  const priorAvg30 = prior60 / 2
  const delta = priorAvg30 > 0 ? Math.round(((d30 - priorAvg30) / priorAvg30) * 100) : 0
  const shown = win === '30' ? d30 : d90
  const max = d90 || 1

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5.5">
      <div className="mb-4.5 flex items-start gap-3.5">
        <div>
          <h3 className="text-base font-extrabold tracking-tight text-slate-900">Xu hướng đăng ký trường</h3>
          <p className="mt-0.5 text-[13px] text-slate-500">Trường mới gia nhập nền tảng</p>
        </div>
        <div className="ml-auto flex gap-0.5 rounded-[10px] bg-slate-100 p-0.5">
          {(['30', '90'] as const).map((w) => (
            <button
              className={`rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition ${w === win ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
              key={w}
              onClick={() => setWin(w)}
              type="button"
            >
              {w} ngày
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5.5 flex items-end gap-4.5">
        <div className="text-4xl font-extrabold tracking-tight text-slate-900 tabular-nums">
          {shown}
          <small className="ml-1.5 text-sm font-semibold text-slate-500">trường</small>
        </div>
        <div className={`flex items-center gap-1.5 pb-1 text-[13.5px] font-bold ${delta >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
          {delta >= 0 ? <TrendingUp aria-hidden="true" className="size-4.5" /> : <TrendingDown aria-hidden="true" className="size-4.5" />}
          {delta >= 0 ? '+' : ''}
          {delta}% <span className="font-medium text-slate-500">so với trung bình 60 ngày trước</span>
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-3.5">
        <div className="flex items-center gap-3.5">
          <span className="w-32 shrink-0 text-[13px] font-semibold text-slate-600">30 ngày gần nhất</span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-linear-to-r from-indigo-600 to-cyan-500" style={{ width: `${(d30 / max) * 100}%` }} />
          </div>
          <span className="w-8 text-right text-[15px] font-extrabold text-slate-900 tabular-nums">{d30}</span>
        </div>
        <div className="flex items-center gap-3.5">
          <span className="w-32 shrink-0 text-[13px] font-semibold text-slate-600">31–90 ngày trước</span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-slate-300" style={{ width: `${(prior60 / max) * 100}%` }} />
          </div>
          <span className="w-8 text-right text-[15px] font-extrabold text-slate-900 tabular-nums">{prior60}</span>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 pt-4">
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

function RoleBreakdown({ studentCount, teacherCount, schoolAdminCount }: { schoolAdminCount: number; studentCount: number; teacherCount: number }) {
  const roles = [
    { color: '#4F46E5', ic: <GraduationCap aria-hidden="true" className="size-5" />, label: 'Học sinh', value: studentCount },
    { color: '#06B6D4', ic: <Presentation aria-hidden="true" className="size-5" />, label: 'Giáo viên', value: teacherCount },
    { color: '#8B5CF6', ic: <ShieldCheck aria-hidden="true" className="size-5" />, label: 'Quản trị trường', value: schoolAdminCount },
  ]
  const total = roles.reduce((s, r) => s + r.value, 0) || 1
  const max = Math.max(...roles.map((r) => r.value), 1)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5.5">
      <div className="mb-4.5 flex items-start gap-3.5">
        <div>
          <h3 className="text-base font-extrabold tracking-tight text-slate-900">Người dùng theo vai trò</h3>
          <p className="mt-0.5 text-[13px] text-slate-500">Toàn bộ tài khoản trên nền tảng</p>
        </div>
        <div className="ml-auto text-right text-[22px] font-extrabold text-slate-900 tabular-nums">
          {fmt(total)}
          <small className="block text-[11.5px] font-semibold text-slate-500">tài khoản</small>
        </div>
      </div>
      <div className="flex flex-col gap-4.5">
        {roles.map((r) => (
          <div className="flex items-center gap-3.5" key={r.label}>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[11px]" style={{ background: `${r.color}1a`, color: r.color }}>
              {r.ic}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900">{r.label}</span>
                <span className="text-[12.5px] font-semibold text-slate-500">{((r.value / total) * 100).toFixed(1)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full" style={{ background: r.color, width: `${(r.value / max) * 100}%` }} />
              </div>
            </div>
            <div className="w-16.5 shrink-0 text-right text-base font-extrabold text-slate-900 tabular-nums">{fmt(r.value)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

const CHART_HEIGHT = 160

function IncomeChart({ monthlyRevenue }: { monthlyRevenue: SystemAdminDashboard['monthlyRevenue'] }) {
  const [mode, setMode] = useState<'month' | 'year'>('month')

  const monthPoints = useMemo(
    () =>
      monthlyRevenue.slice(-12).map((m) => {
        const [, month] = m.month.split('-')
        return { label: `T${Number(month)}`, value: m.amount }
      }),
    [monthlyRevenue],
  )

  const yearPoints = useMemo(() => {
    const totals = new Map<string, number>()
    for (const m of monthlyRevenue) {
      const year = m.month.split('-')[0]
      totals.set(year, (totals.get(year) ?? 0) + m.amount)
    }
    return Array.from(totals, ([label, value]) => ({ label, value }))
  }, [monthlyRevenue])

  const points = mode === 'month' ? monthPoints : yearPoints
  const max = Math.max(...points.map((p) => p.value), 1)
  const total = points.reduce((s, p) => s + p.value, 0)
  const stepX = points.length > 1 ? 100 / (points.length - 1) : 0

  const cumulativeValues = points.reduce<number[]>((acc, p) => {
    acc.push((acc.at(-1) ?? 0) + p.value)
    return acc
  }, [])
  const linePoints = cumulativeValues
    .map((cumulative, i) => {
      const x = points.length > 1 ? i * stepX : 50
      const y = CHART_HEIGHT - (cumulative / (total || 1)) * CHART_HEIGHT
      return `${x},${y}`
    })
    .join(' ')

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5.5">
      <div className="mb-4.5 flex flex-wrap items-start justify-between gap-3.5">
        <div>
          <h3 className="text-base font-extrabold tracking-tight text-slate-900">Doanh thu hệ thống</h3>
          <p className="mt-0.5 text-[13px] text-slate-500">
            Cột: doanh thu từng {mode === 'month' ? 'tháng' : 'năm'} · Đường: doanh thu lũy kế
          </p>
        </div>
        <div className="flex gap-0.5 rounded-[10px] bg-slate-100 p-0.5">
          {(['month', 'year'] as const).map((m) => (
            <button
              className={`rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition ${
                m === mode ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
              }`}
              key={m}
              onClick={() => setMode(m)}
              type="button"
            >
              {m === 'month' ? 'Theo tháng' : 'Theo năm'}
            </button>
          ))}
        </div>
      </div>

      <div className="relative h-40">
        <div className="absolute inset-0 flex items-end gap-2">
          {points.map((p) => (
            <div className="flex flex-1 flex-col items-center justify-end" key={p.label}>
              <div
                className="w-full rounded-t-[5px] bg-linear-to-t from-indigo-600 to-cyan-500"
                style={{ height: `${Math.max((p.value / max) * 100, p.value > 0 ? 4 : 1.5)}%` }}
                title={`${p.label}: ${fmt(p.value)} ₫`}
              />
            </div>
          ))}
        </div>
        <svg
          aria-hidden="true"
          className="absolute inset-0 size-full overflow-visible"
          preserveAspectRatio="none"
          viewBox={`0 0 100 ${CHART_HEIGHT}`}
        >
          <polyline fill="none" points={linePoints} stroke="#F59E0B" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>

      <div className="mt-2 flex gap-2">
        {points.map((p) => (
          <span className="flex-1 text-center text-[11px] font-bold text-slate-400" key={p.label}>
            {p.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function ContentLibrary({ activeFrameworkCount, systemRubricCount }: { activeFrameworkCount: number; systemRubricCount: number }) {
  const items = [
    { ic: <SlidersHorizontal aria-hidden="true" className="size-5.5" />, lab: 'Khung đánh giá đang dùng', sub: 'Bộ tiêu chí chấm điểm hoạt động', tint: { bg: 'bg-indigo-50', fg: 'text-indigo-700' }, val: activeFrameworkCount },
    { ic: <Files aria-hidden="true" className="size-5.5" />, lab: 'Rubric hệ thống', sub: 'Bản mô tả chuẩn dùng chung', tint: { bg: 'bg-violet-50', fg: 'text-violet-700' }, val: systemRubricCount },
  ]

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5.5">
      <div className="mb-4 flex items-start gap-3.5">
        <div>
          <h3 className="text-base font-extrabold tracking-tight text-slate-900">Thư viện nội dung hệ thống</h3>
          <p className="mt-0.5 text-[13px] text-slate-500">Tài nguyên chấm điểm dùng chung</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {items.map((it) => (
          <div className="rounded-[14px] border border-slate-200 bg-slate-50/60 p-4.5" key={it.lab}>
            <div className={`mb-3.5 flex size-10.5 items-center justify-center rounded-[11px] ${it.tint.bg} ${it.tint.fg}`}>{it.ic}</div>
            <div className="text-[34px] font-extrabold leading-none tracking-tight text-slate-900">{it.val}</div>
            <div className="mt-2 text-sm font-bold text-slate-900">{it.lab}</div>
            <div className="mt-0.5 text-[12.5px] leading-snug text-slate-500">{it.sub}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SystemAdminDashboardPage() {
  const { data, isLoading, isError, refetch } = useSystemAdminDashboardQuery()
  const navigate = useNavigate()

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

  const revBig = (data.totalRevenue / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })
  const totalUsers = data.studentCount + data.teacherCount + data.schoolAdminCount

  return (
    <section className="grid gap-5">
      <div className="flex flex-wrap items-start gap-5">
        <div>
          <h1 className="mt-2.5 text-3xl font-extrabold tracking-tight text-slate-900">Tổng quan hệ thống</h1>
          <p className="mt-1.5 max-w-160 text-[15px] text-slate-500">
            Toàn cảnh nền tảng Vox — trường học, người dùng, doanh thu và hàng chờ đăng ký trên toàn hệ thống.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={<Building2 aria-hidden="true" className="size-5.5" />}
          label="Trường học"
          sub={
            <span className="font-semibold text-slate-600">
              <b className="text-slate-900">{data.activeSchools}</b> hoạt động · <b className="text-slate-900">{data.inactiveSchools}</b> tạm ngưng
            </span>
          }
          tint={{ bg: 'bg-indigo-50', fg: 'text-indigo-700' }}
          value={data.totalSchools}
        />
        <Kpi
          icon={<Users aria-hidden="true" className="size-5.5" />}
          label="Người dùng"
          sub={<b className="font-semibold text-slate-600">Tổng tài khoản trên hệ thống</b>}
          tint={{ bg: 'bg-cyan-50', fg: 'text-cyan-700' }}
          value={fmt(totalUsers)}
        />
        <Kpi
          icon={<Wallet aria-hidden="true" className="size-5.5" />}
          label="Doanh thu"
          sub={
            <span className="font-semibold text-slate-600">
              {fmt(data.totalRevenue)} <span className="font-bold">₫ · hóa đơn đã thanh toán</span>
            </span>
          }
          tint={{ bg: 'bg-emerald-50', fg: 'text-emerald-700' }}
          unit=" tỷ ₫"
          value={revBig}
        />
        <Kpi
          accent
          cta="Xử lý ngay"
          icon={<UserPlus aria-hidden="true" className="size-5.5" />}
          label="Đăng ký chờ duyệt"
          onCta={jumpToPending}
          sub="Cần phê duyệt để kích hoạt trường mới"
          value={data.pendingRegistrations}
        />
      </div>

      <IncomeChart monthlyRevenue={data.monthlyRevenue} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.55fr_1fr]">
        <RegTrend
          onJump={jumpToPending}
          pendingRegistrations={data.pendingRegistrations}
          registrationsLast30Days={data.registrationsLast30Days}
          registrationsLast90Days={data.registrationsLast90Days}
        />
        <RoleBreakdown schoolAdminCount={data.schoolAdminCount} studentCount={data.studentCount} teacherCount={data.teacherCount} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1.35fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5.5">
          <div className="mb-4.5">
            <h3 className="text-base font-extrabold tracking-tight text-slate-900">Trạng thái trường học</h3>
            <p className="mt-0.5 text-[13px] text-slate-500">Phân bố trường đang hoạt động</p>
          </div>
          <Donut
            center={data.totalSchools}
            segments={[
              { color: '#10B981', label: 'Đang hoạt động', value: data.activeSchools },
              { color: '#E2E8F0', label: 'Tạm ngưng', value: data.inactiveSchools },
            ]}
            sub="tổng trường"
          />
        </div>
        <ContentLibrary activeFrameworkCount={data.activeFrameworkCount} systemRubricCount={data.systemRubricCount} />
      </div>
    </section>
  )
}
