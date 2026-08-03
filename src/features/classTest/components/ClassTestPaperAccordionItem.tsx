import type { ReactNode } from 'react'
import { ChevronDown, ChevronRight, FileText } from 'lucide-react'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { formatDurationSeconds, getExamPaperStatusDisplay, type ExamPaperDto } from '@/features/examCore/types'
import { buildTimeQuotaWarning } from '@/features/examCore/utils/timeQuota'

type ClassTestPaperAccordionItemProps = {
  /** Nút thao tác của riêng mã đề này (khoá/mở lại/xoá). Nằm trong đầu thẻ, không trôi ra ngoài. */
  actions?: ReactNode
  /** Nội dung soạn thảo, chỉ dựng khi thẻ đang mở. */
  children?: ReactNode
  isOpen: boolean
  maxTimePerAttemptMin?: number | null
  onOpen: () => void
  paper: ExamPaperDto
}

/**
 * Một mã đề của bài kiểm tra trên lớp = một thẻ tự chứa: tiêu đề, trạng thái, nút thao tác và
 * trình soạn nội dung đều nằm trong cùng một khối.
 *
 * <p>Trước đây trình soạn nằm tách hẳn phía trên danh sách thẻ, nút khoá/xoá thì trôi bên dưới
 * từng thẻ — nhìn vào không biết mình đang sửa mã đề nào. Ở đây luôn có đúng một thẻ mở, và thẻ
 * đang mở chính là mã đề mọi thao tác soạn thảo tác động vào.
 */
export function ClassTestPaperAccordionItem({
  actions,
  children,
  isOpen,
  maxTimePerAttemptMin,
  onOpen,
  paper,
}: ClassTestPaperAccordionItemProps) {
  const statusDisplay = getExamPaperStatusDisplay(paper.status, 'CLASS_TEST')
  const quotaWarning = buildTimeQuotaWarning(`Mã đề ${paper.variant}`, paper.timeDurationSeconds, maxTimePerAttemptMin)
  const totalItems = paper.sections.reduce((sum, section) => sum + section.items.length, 0)
  const filledItems = paper.sections.reduce((sum, section) => sum + section.items.filter((item) => item.questionId).length, 0)
  const hasEmptySlot = totalItems > 0 && filledItems < totalItems

  return (
    <div
      className={[
        'rounded-2xl border bg-white transition',
        isOpen ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-200',
      ].join(' ')}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-4.5">
        {/*
          Cả vùng tiêu đề là một nút mở thẻ. Khi thẻ đã mở thì không bấm gập lại được: luôn phải có
          đúng một mã đề đang mở để không bao giờ mơ hồ "đang sửa đề nào".
        */}
        <button
          aria-expanded={isOpen}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          disabled={isOpen}
          onClick={onOpen}
          type="button"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-indigo-50 text-indigo-600">
            {isOpen ? (
              <ChevronDown aria-hidden="true" className="size-5" />
            ) : (
              <ChevronRight aria-hidden="true" className="size-5" />
            )}
          </span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-[15px] font-extrabold text-slate-900">Mã đề {paper.variant}</span>
              <StatusBadge label={statusDisplay.label} tone={statusDisplay.tone} />
              {hasEmptySlot ? (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200">
                  Còn {totalItems - filledItems} ô chưa có câu hỏi
                </span>
              ) : null}
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500">
              <FileText aria-hidden="true" className="size-3.5" />
              <span>
                {paper.sections.length} phần · {totalItems} câu hỏi
              </span>
              <span className="text-slate-300">·</span>
              <span>{formatDurationSeconds(paper.timeDurationSeconds)}</span>
              <span className="text-slate-300">·</span>
              {/* Mã đầy đủ chỉ để đối chiếu khi cần, không phải thứ giáo viên đọc hằng ngày. */}
              <span className="font-mono text-[11px] text-slate-400">{paper.code}</span>
            </span>
          </span>
        </button>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>

      {quotaWarning ? (
        <div className="mx-4 mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 sm:mx-4.5">
          {quotaWarning} Không thể khoá mã đề này cho tới khi giảm thời lượng.
        </div>
      ) : null}

      {isOpen && children ? <div className="border-t border-slate-200 p-4 sm:p-4.5">{children}</div> : null}
    </div>
  )
}
