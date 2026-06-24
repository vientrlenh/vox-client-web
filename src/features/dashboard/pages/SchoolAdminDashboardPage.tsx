import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  GraduationCap,
  TrendingUp,
  Users,
} from 'lucide-react'
import { Link } from 'react-router'
import { useAppSelector } from '@/app/store/hooks'

const stats = [
  {
    icon: BookOpen,
    label: 'Total classes',
    tone: 'cyan',
    value: '24',
  },
  {
    icon: Users,
    label: 'Active students',
    tone: 'emerald',
    value: '1,248',
  },
  {
    icon: AlertTriangle,
    label: 'Classes need review',
    tone: 'amber',
    value: '3',
  },
]

const activities = [
  {
    detail: 'English 6A added 12 students',
    time: 'Today, 09:20',
  },
  {
    detail: 'IELTS Foundation changed to Active',
    time: 'Yesterday, 16:45',
  },
  {
    detail: 'Speaking Club B archived after semester close',
    time: 'Jun 08, 2026',
  },
]

function getToneClassName(tone: string) {
  if (tone === 'emerald') {
    return 'bg-emerald-50 text-emerald-700'
  }

  if (tone === 'amber') {
    return 'bg-amber-50 text-amber-700'
  }

  return 'bg-cyan-50 text-cyan-700'
}

export function SchoolAdminDashboardPage() {
  const user = useAppSelector((state) => state.auth.user)

  return (
    <section
      aria-labelledby="school-admin-dashboard-title"
      className="grid gap-6"
    >
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex size-11 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
              <GraduationCap aria-hidden="true" className="size-6" />
            </div>
            <h1
              className="mt-4 text-2xl font-black text-slate-950 sm:text-3xl"
              id="school-admin-dashboard-title"
            >
              School Admin Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Signed in as {user?.email ?? 'school admin'}. This temporary
              dashboard gives a quick mock overview while backend metrics are
              being connected.
            </p>
          </div>

          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 text-sm font-bold text-white transition hover:bg-cyan-700"
            to="/school-admin/classes"
          >
            Manage classes
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map(({ icon: Icon, label, tone, value }) => (
          <article
            className="rounded-lg border border-slate-200 bg-white p-5"
            key={label}
          >
            <div
              className={`inline-flex size-10 items-center justify-center rounded-lg ${getToneClassName(tone)}`}
            >
              <Icon aria-hidden="true" className="size-5" />
            </div>
            <h2 className="mt-4 text-sm font-bold text-slate-500">{label}</h2>
            <p className="mt-1 text-3xl font-black text-slate-950">{value}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section
          aria-labelledby="school-admin-activity-title"
          className="rounded-lg border border-slate-200 bg-white p-5"
        >
          <div className="flex items-center gap-3">
            <div className="inline-flex size-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
              <CalendarDays aria-hidden="true" className="size-5" />
            </div>
            <div>
              <h2
                className="text-base font-black text-slate-950"
                id="school-admin-activity-title"
              >
                Recent activity
              </h2>
              <p className="text-sm font-medium text-slate-500">
                Mock events for dashboard layout validation.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {activities.map((activity) => (
              <article
                className="rounded-lg border border-slate-200 p-4"
                key={`${activity.detail}-${activity.time}`}
              >
                <p className="text-sm font-black text-slate-950">
                  {activity.detail}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {activity.time}
                </p>
              </article>
            ))}
          </div>
        </section>

        <aside className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="inline-flex size-10 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
            <TrendingUp aria-hidden="true" className="size-5" />
          </div>
          <h2 className="mt-4 text-base font-black text-slate-950">
            Weekly snapshot
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Attendance and class health charts will be connected once backend
            metrics are available. For now, this area reserves space for school
            operations insights.
          </p>
          <div className="mt-5 grid gap-3 text-sm font-semibold text-slate-600">
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span>Completion trend</span>
              <span className="font-black text-emerald-700">+8%</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span>New enrollments</span>
              <span className="font-black text-slate-950">42</span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}
