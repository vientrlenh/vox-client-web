import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { WorkflowStepper, type WorkflowStep } from '@/shared/ui/WorkflowStepper'

type NextAction = {
  ctaLabel: string
  description: string
  onClick: () => void
  title: string
}

type WorkflowTrackerCardProps = {
  completedCount: number
  heading?: string
  nextAction?: NextAction | null
  steps: WorkflowStep[]
  totalCount: number
}

export function WorkflowTrackerCard({
  completedCount,
  heading = 'Quy trình kỳ thi',
  nextAction,
  steps,
  totalCount,
}: WorkflowTrackerCardProps): ReactNode {
  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-extrabold text-slate-900">{heading}</h2>
        <span className="text-sm font-semibold text-slate-500">
          Hoàn thành {completedCount} / {totalCount} bước
        </span>
      </div>

      <div className="mt-6">
        <WorkflowStepper steps={steps} />
      </div>

      {nextAction ? (
        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-violet-200 bg-linear-to-r from-indigo-50 to-violet-50 p-5 sm:flex-row sm:items-center">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <ArrowRight aria-hidden="true" className="size-6" />
          </span>
          <div className="flex-1">
            <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-violet-700">Bước tiếp theo</div>
            <div className="mt-0.5 text-[15px] font-bold text-slate-900">{nextAction.title}</div>
            <div className="mt-0.5 text-[13px] text-slate-500">{nextAction.description}</div>
          </div>
          <button
            className="inline-flex h-10.5 shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-indigo-600 px-5 text-sm font-bold text-white transition hover:bg-indigo-700"
            onClick={nextAction.onClick}
            type="button"
          >
            {nextAction.ctaLabel}
          </button>
        </div>
      ) : null}
    </div>
  )
}
