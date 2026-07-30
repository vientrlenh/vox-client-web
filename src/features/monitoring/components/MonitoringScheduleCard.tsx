import { CalendarClock, MonitorPlay, UserRound, VideoOff } from 'lucide-react'
import { Link } from 'react-router'

import { formatDateTime, getScheduleLabel, type ExamScheduleDto } from '@/features/examCore/types'
import { StatusBadge, type StatusTone } from '@/shared/ui/StatusBadge'

import { countLiveParticipants, type ActiveSchedule } from '../types'

type MonitoringScheduleCardProps = {
  activeSchedule?: ActiveSchedule | null
  isRunning: boolean
  schedule: ExamScheduleDto
}

function CountPill({
  icon,
  label,
  tone,
  value,
}: {
  icon: React.ReactNode
  label: string
  tone: 'live' | 'muted' | 'quiet'
  value: number
}) {
  const toneClassName = {
    live: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    muted: 'border-amber-200 bg-amber-50 text-amber-700',
    quiet: 'border-slate-200 bg-slate-50 text-slate-600',
  }[tone]

  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${toneClassName}`}>
      {icon}
      <span className="text-lg font-black leading-none">{value}</span>
      <span className="text-xs font-semibold">{label}</span>
    </div>
  )
}

export function MonitoringScheduleCard({
  activeSchedule,
  isRunning,
  schedule,
}: MonitoringScheduleCardProps) {
  const liveCount = countLiveParticipants(activeSchedule)
  // candidateCount là số thí sinh được xếp vào ca, tức mẫu số đúng cho "lẽ ra phải có mặt".
  // Kẹp về 0 vì hai con số đến từ hai nguồn khác nhau và có thể lệch nhau trong chốc lát: một học
  // viên vừa được chuyển ca có thể đang stream trước khi roster kịp cập nhật, và hiển thị số âm sẽ
  // làm giám thị mất tin vào cả trang.
  const offlineCount = Math.max(0, schedule.candidateCount - liveCount)

  const statusTone: StatusTone = isRunning ? 'success' : 'neutral'
  const statusLabel = isRunning ? 'Đang diễn ra' : 'Ngoài giờ thi'

  return (
    <Link
      className="group rounded-xl border border-slate-200 bg-white p-5 transition hover:border-cyan-300 hover:shadow-sm"
      to={`schedules/${schedule.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
          <MonitorPlay aria-hidden="true" className="size-5" />
        </span>
        <StatusBadge label={statusLabel} tone={statusTone} />
      </div>

      <p className="mt-4 truncate text-base font-black text-slate-950">
        {getScheduleLabel(schedule)}
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <CalendarClock aria-hidden="true" className="size-4 shrink-0" />
        {formatDateTime(schedule.startDate)} – {formatDateTime(schedule.endDate)}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <CountPill
          icon={<UserRound aria-hidden="true" className="size-4" />}
          label="đang lên sóng"
          tone={liveCount > 0 ? 'live' : 'quiet'}
          value={liveCount}
        />
        <CountPill
          icon={<VideoOff aria-hidden="true" className="size-4" />}
          label="chưa lên sóng"
          tone={isRunning && offlineCount > 0 ? 'muted' : 'quiet'}
          value={offlineCount}
        />
      </div>

      <p className="mt-3 text-xs font-medium text-slate-400">
        {schedule.candidateCount} thí sinh được xếp ca
      </p>
    </Link>
  )
}
