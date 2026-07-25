import type { ComponentType } from 'react'
import {
  BellRing,
  CircleCheck,
  CircleX,
  FileCheck2,
  Mail,
  Send,
  Users,
} from 'lucide-react'
import type { TimelineEvent, TimelineIconKey, TimelineTone } from '../types'

const ICONS: Record<TimelineIconKey, ComponentType<{ className?: string }>> = {
  send: Send,
  'circle-check': CircleCheck,
  users: Users,
  'file-check': FileCheck2,
  'circle-x': CircleX,
  'bell-ringing': BellRing,
  mail: Mail,
}

const TONE_DOT: Record<TimelineTone, string> = {
  info: 'border-blue-200 bg-blue-50 text-blue-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  violet: 'border-violet-200 bg-violet-50 text-violet-700',
  danger: 'border-red-200 bg-red-50 text-red-700',
}

type ProcessTimelineProps = {
  events: TimelineEvent[]
}

/** Lịch sử xử lý dạng dòng thời gian (chấm tròn + đường nối). */
export function ProcessTimeline({ events }: ProcessTimelineProps) {
  return (
    <div className="mt-4">
      {events.map((event, index) => {
        const Icon = ICONS[event.icon] ?? Send
        const isLast = index === events.length - 1
        return (
          <div className="flex gap-3.5" key={index}>
            <div className="flex flex-col items-center">
              <span
                className={`inline-flex size-8.5 shrink-0 items-center justify-center rounded-full border ${TONE_DOT[event.tone]}`}
              >
                <Icon className="size-4" />
              </span>
              {isLast ? null : <span className="mt-1.5 min-h-3.5 w-0.5 flex-1 bg-slate-200" />}
            </div>
            <div className="pb-3.5 pt-1">
              <div className="text-[13px] font-bold leading-snug text-slate-900">{event.text}</div>
              <div className="mt-0.5 text-[11.5px] font-medium text-slate-400">
                {event.who} · {event.role} · {event.t}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
