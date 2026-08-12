import {
  AlertTriangle,
  ArrowUpRight,
  Ban,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Flag,
  Hourglass,
  Lock,
  Play,
  RefreshCw,
  SquarePen,
  TrendingUp,
} from 'lucide-react'
import { useNavigate } from 'react-router'
import { useAppSelector } from '@/app/store/hooks'
import { useTeacherDashboardQuery, type TeacherDashboard } from '../api/useTeacherDashboardQuery'

const EXAM_STATUS = [
  { color: '#94A3B8', icon: <SquarePen aria-hidden="true" className="size-4.5" />, key: 'draft' as const, label: 'Bản nháp' },
  { color: '#4F46E5', icon: <CalendarClock aria-hidden="true" className="size-4.5" />, key: 'scheduled' as const, label: 'Đã lên lịch' },
  { color: '#F59E0B', icon: <Play aria-hidden="true" className="size-4.5" />, key: 'inProgress' as const, label: 'Đang diễn ra' },
  { color: '#06B6D4', icon: <Lock aria-hidden="true" className="size-4.5" />, key: 'closed' as const, label: 'Đã đóng' },
  { color: '#10B981', icon: <Flag aria-hidden="true" className="size-4.5" />, key: 'resultsPublished' as const, label: 'Đã công bố KQ' },
  { color: '#EF4444', icon: <Ban aria-hidden="true" className="size-4.5" />, key: 'cancelled' as const, label: 'Đã hủy' },
]

function Kpi({
  accent,
  cta,
  icon,
  label,
  onCta,
  sub,
  tint,
  value,
}: {
  accent?: boolean
  cta?: string
  icon: React.ReactNode
  label: string
  onCta?: () => void
  sub: React.ReactNode
  tint?: { bg: string; fg: string }
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

const fmtScore = (n: number | null) => (n === null ? '—' : n.toLocaleString('vi-VN', { maximumFractionDigits: 2 }))

function ClassScoreCard({ c, rows }: { c: TeacherDashboard['examStatusCounts']; rows: TeacherDashboard['classScoreStats'] }) {
  const live = c.inProgress + c.scheduled

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5.5">
      <div className="mb-4.5 flex items-start gap-3.5">
        <div>
          <h3 className="text-base font-extrabold tracking-tight text-slate-900">Điểm theo lớp</h3>
          <p className="mt-0.5 text-[13px] text-slate-500">Điểm trung bình, cao nhất & thấp nhất của từng bài kiểm tra theo lớp</p>
        </div>
        <div className="ml-auto text-right text-[22px] font-extrabold text-slate-900 tabular-nums">
          {rows.length}
          <small className="block text-[11.5px] font-semibold text-slate-500">bài kiểm tra</small>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">Chưa có bài kiểm tra nào để hiển thị điểm.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-140 border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[12px] font-bold uppercase tracking-wide text-slate-400">
                <th className="py-2 pr-3">Lớp</th>
                <th className="py-2 pr-3">Bài kiểm tra</th>
                <th className="py-2 pr-3 text-right">Điểm TB</th>
                <th className="py-2 pr-3 text-right">Cao nhất</th>
                <th className="py-2 text-right">Thấp nhất</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr className="border-b border-slate-50 last:border-0" key={`${r.className}-${r.examName}-${i}`}>
                  <td className="py-2.5 pr-3 font-semibold text-slate-700">{r.className}</td>
                  <td className="py-2.5 pr-3 text-slate-600">{r.examName}</td>
                  <td className="py-2.5 pr-3 text-right font-bold text-slate-900 tabular-nums">{fmtScore(r.averageScore)}</td>
                  <td className="py-2.5 pr-3 text-right text-emerald-600 tabular-nums">{fmtScore(r.highestScore)}</td>
                  <td className="py-2.5 text-right text-red-500 tabular-nums">{fmtScore(r.lowestScore)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-5.5 flex items-center justify-between border-t border-slate-100 pt-4">
        <div className="flex items-center gap-2.5 text-[13.5px] text-slate-600">
          <Play aria-hidden="true" className="size-4.5 text-amber-500" />
          <span>
            <b className="text-slate-900">{live}</b> bài kiểm tra sắp tới & đang diễn ra
          </span>
        </div>
        <a className="inline-flex items-center gap-1 text-[13.5px] font-bold text-indigo-600 hover:text-indigo-700" href="/teacher/class-tests">
          Quản lý bài kiểm tra
          <ArrowUpRight aria-hidden="true" className="size-3.5" />
        </a>
      </div>
    </div>
  )
}

function ExamPipeline({ c }: { c: TeacherDashboard['examStatusCounts'] }) {
  const max = Math.max(...EXAM_STATUS.map((s) => c[s.key]), 1)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5.5">
      <div className="mb-4.5">
        <h3 className="text-base font-extrabold tracking-tight text-slate-900">Vòng đời bài kiểm tra</h3>
        <p className="mt-0.5 text-[13px] text-slate-500">Số bài kiểm tra tại mỗi giai đoạn</p>
      </div>
      <div className="flex flex-col gap-3.5">
        {EXAM_STATUS.map((s) => (
          <div className="flex items-center gap-3.5" key={s.key}>
            <span className="w-28 shrink-0 text-[13px] font-semibold text-slate-600">{s.label}</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full" style={{ background: s.color, width: `${(c[s.key] / max) * 100}%` }} />
            </div>
            <span className="w-8 text-right text-[15px] font-extrabold text-slate-900 tabular-nums">{c[s.key]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Grading({ g }: { g: TeacherDashboard['gradingStats'] }) {
  const total = g.pending + g.completed
  const rate = total ? Math.round((g.completed / total) * 100) : 0

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5.5" id="grading">
      <div className="mb-4.5 flex items-start gap-3.5">
        <div>
          <h3 className="text-base font-extrabold tracking-tight text-slate-900">Nhiệm vụ chấm bài</h3>
          <p className="mt-0.5 text-[13px] text-slate-500">Bài chấm được giao cho bạn (bao gồm phúc khảo & hậu kiểm)</p>
        </div>
        <div className="ml-auto text-right text-[22px] font-extrabold text-slate-900 tabular-nums">
          {total}
          <small className="block text-[11.5px] font-semibold text-slate-500">tổng lượt chấm</small>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3.5">
        <div className={`relative rounded-[14px] border p-4 ${g.pending > 0 ? 'border-orange-200 bg-orange-50/50' : 'border-slate-200 bg-white'}`}>
          <div className="mb-3 flex items-center gap-2">
            <Hourglass aria-hidden="true" className="size-4 text-amber-500" />
            <span className="text-[13px] font-bold text-slate-600">Chờ chấm</span>
          </div>
          <div className="text-[32px] font-extrabold leading-none tracking-tight text-slate-900 tabular-nums">{g.pending}</div>
          {g.pending > 0 ? (
            <a className="absolute right-4 top-4 inline-flex items-center gap-0.5 text-[11.5px] font-bold text-orange-600" href="/teacher/grading">
              Chấm ngay
              <ArrowUpRight aria-hidden="true" className="size-3.5" />
            </a>
          ) : null}
        </div>
        <div className="rounded-[14px] border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 aria-hidden="true" className="size-4 text-emerald-500" />
            <span className="text-[13px] font-bold text-slate-600">Đã hoàn thành</span>
          </div>
          <div className="text-[32px] font-extrabold leading-none tracking-tight text-slate-900 tabular-nums">{g.completed}</div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-[13.5px] text-slate-600">
        <span>
          <b className="text-slate-900">{g.pending}</b> đang chờ · <b className="text-slate-900">{g.completed}</b> đã xong
        </span>
        <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
          <Flag aria-hidden="true" className="size-4.5" />
          {rate}% hoàn thành
        </span>
      </div>
    </div>
  )
}

export function TeacherDashboardPage() {
  const user = useAppSelector((state) => state.auth.user)
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useTeacherDashboardQuery()

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <RefreshCw className="size-8 animate-spin text-indigo-600" />
        <p className="text-sm text-slate-500">Đang tải tổng quan giảng viên...</p>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle className="size-12 text-red-500" />
        <p className="text-slate-600">Không tải được dữ liệu tổng quan giảng viên.</p>
        <button className="rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-700" onClick={() => refetch()} type="button">
          Thử lại
        </button>
      </div>
    )
  }

  const c = data.examStatusCounts

  return (
    <section className="grid gap-5">
      <div className="flex flex-wrap items-start gap-5">
        <div>
          <h1 className="mt-2.5 text-3xl font-extrabold tracking-tight text-slate-900">Tổng quan giảng viên</h1>
          <p className="mt-1.5 max-w-160 text-[15px] text-slate-500">
            Bài kiểm tra lớp bạn tham gia (coi thi/chấm thi/tác giả đề), điểm trung bình và nhiệm vụ chấm bài của bạn
            {user?.email ? ` · ${user.email}` : ''}.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={<CalendarDays aria-hidden="true" className="size-5.5" />}
          label="Tổng số bài kiểm tra"
          sub={
            <span className="font-semibold text-slate-600">
              <b className="text-slate-900">{c.inProgress}</b> đang diễn ra · <b className="text-slate-900">{c.scheduled}</b> đã lên lịch
            </span>
          }
          tint={{ bg: 'bg-indigo-50', fg: 'text-indigo-700' }}
          value={c.total}
        />
        <Kpi
          icon={<TrendingUp aria-hidden="true" className="size-5.5" />}
          label="Điểm trung bình"
          sub={
            <span className="font-semibold text-slate-600">
              <b className="text-slate-900">{data.scoreStats.gradedCount}</b>/{data.scoreStats.totalCandidates} thí sinh có điểm
            </span>
          }
          tint={{ bg: 'bg-violet-50', fg: 'text-violet-700' }}
          value={data.scoreStats.averageScore === null ? '—' : data.scoreStats.averageScore.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}
        />
        <Kpi
          icon={<ClipboardCheck aria-hidden="true" className="size-5.5" />}
          label="Đã chấm xong"
          sub={<span className="font-semibold text-slate-600">Lượt chấm bạn đã hoàn thành</span>}
          tint={{ bg: 'bg-cyan-50', fg: 'text-cyan-700' }}
          value={data.gradingStats.completed}
        />
        <Kpi
          accent
          cta="Chấm ngay"
          icon={<Hourglass aria-hidden="true" className="size-5.5" />}
          label="Bài chờ chấm"
          onCta={() => navigate('/teacher/grading')}
          sub="Lượt chấm được giao cho bạn, cần xử lý"
          value={data.gradingStats.pending}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.55fr_1fr]">
        <ClassScoreCard c={c} rows={data.classScoreStats} />
        <Grading g={data.gradingStats} />
      </div>

      <ExamPipeline c={c} />
    </section>
  )
}
