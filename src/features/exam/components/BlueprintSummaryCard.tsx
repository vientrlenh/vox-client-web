import { ExternalLink, LayoutList } from 'lucide-react'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { getBlueprintVersionStatusDisplay, type ExamBlueprintDto, type ExamBlueprintVersionDto } from '../types'

type BlueprintSummaryCardProps = {
  blueprint: ExamBlueprintDto
  onOpen: () => void
  version: ExamBlueprintVersionDto
}

export function BlueprintSummaryCard({ blueprint, onOpen, version }: BlueprintSummaryCardProps) {
  const statusDisplay = getBlueprintVersionStatusDisplay(version.status)
  const totalSlots = version.sections.reduce((sum, section) => sum + section.slots.length, 0)
  const minutes = version.totalTimeLimitSeconds ? Math.round(version.totalTimeLimitSeconds / 60) : null

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5.5 sm:p-6">
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex size-13 shrink-0 items-center justify-center rounded-[14px] bg-indigo-50 text-indigo-600">
          <LayoutList aria-hidden="true" className="size-7" />
        </span>
        <div className="min-w-50 flex-1">
          <div className="text-[16px] font-extrabold text-slate-900">
            {blueprint.code} · {blueprint.name}
          </div>
          <div className="mt-0.5 text-[13px] text-slate-500">
            Phiên bản đang dùng: <b className="text-slate-900">{version.code}</b> · {version.sections.length} phần ·{' '}
            {totalSlots} ô câu hỏi{minutes ? ` · ${minutes} phút` : ''}
          </div>
        </div>
        <StatusBadge label={statusDisplay.label} tone={statusDisplay.tone} />
        <button
          className="inline-flex h-10.5 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4.5 text-sm font-bold text-indigo-600 transition hover:bg-slate-50"
          onClick={onOpen}
          type="button"
        >
          Mở blueprint
          <ExternalLink aria-hidden="true" className="size-4" />
        </button>
      </div>
      {version.sections.length ? (
        <div className="mt-4.5 grid gap-3 sm:grid-cols-3">
          {version.sections.map((section) => (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5" key={section.id}>
              <div className="text-xs font-semibold text-slate-500">{section.title}</div>
              <div className="mt-1 text-[13px] font-bold text-slate-900">
                {section.slots.length} ô · trọng số {section.sectionWeight?.toFixed(2) ?? '-'}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
