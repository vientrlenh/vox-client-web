import type { ComponentType, ReactNode } from 'react'
import { FileText } from 'lucide-react'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { getExamPaperStatusDisplay, type ExamPaperDto } from '../types'

type PaperCardAction = {
  icon?: ComponentType<{ 'aria-hidden'?: boolean; className?: string }>
  label: string
  onClick: () => void
  tone?: 'default' | 'primary'
}

type PaperCardProps = {
  actions?: PaperCardAction[]
  onOpen: () => void
  openLabel?: string
  paper: ExamPaperDto
  subtitle?: string
}

export function PaperCard({ actions = [], onOpen, openLabel = 'Xem đề', paper, subtitle }: PaperCardProps): ReactNode {
  const statusDisplay = getExamPaperStatusDisplay(paper.status)
  const totalItems = paper.sections.reduce((sum, section) => sum + section.items.length, 0)
  const filledItems = paper.sections.reduce(
    (sum, section) => sum + section.items.filter((item) => item.questionId).length,
    0,
  )
  const progressPct = totalItems ? Math.round((filledItems / totalItems) * 100) : 0
  const showProgress = paper.status === 'DRAFT' || paper.status === 'IN_REVIEW'

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-5.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-indigo-50 text-indigo-600">
            <FileText aria-hidden="true" className="size-5.5" />
          </span>
          <div>
            <div className="text-[15px] font-bold text-slate-900">
              {paper.code} · Mã đề {paper.variant}
            </div>
            <div className="text-xs text-slate-500">
              {subtitle ?? `${paper.sections.length} phần · ${totalItems} câu hỏi`}
            </div>
          </div>
          <StatusBadge label={statusDisplay.label} tone={statusDisplay.tone} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
            onClick={onOpen}
            type="button"
          >
            {openLabel}
          </button>
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <button
                className={[
                  'inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition',
                  action.tone === 'primary'
                    ? 'border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                ].join(' ')}
                key={action.label}
                onClick={action.onClick}
                type="button"
              >
                {Icon ? <Icon aria-hidden={true} className="size-4" /> : null}
                {action.label}
              </button>
            )
          })}
        </div>
      </div>
      {showProgress ? (
        <div className="mt-3.5 flex items-center gap-2.5">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-linear-to-r from-indigo-600 to-cyan-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-slate-400">{progressPct}%</span>
        </div>
      ) : null}
    </div>
  )
}
