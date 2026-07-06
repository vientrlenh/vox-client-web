import { useState } from 'react'
import { Check, Search, X } from 'lucide-react'
import { useAppSelector } from '@/app/store/hooks'
import type { QuestionModuleScope } from '@/features/question-bank/api/useQuestionBanksQuery'
import { useQuestionsQuery } from '@/features/question/api/useQuestionsQuery'
import {
  formatNullableText,
  getQuestionStatusDisplay,
  getQuestionTypeDisplay,
  type QuestionDto,
} from '@/features/question/types'
import { StatusBadge } from '@/shared/ui/StatusBadge'

type QuestionPickerProps = {
  excludeQuestionIds?: string[]
  onClose: () => void
  onSelect: (question: QuestionDto) => void
  publishedOnly?: boolean
  scope: QuestionModuleScope
  selectedQuestionIds: string[]
}

const PAGE_SIZE = 8

export function QuestionPicker({
  excludeQuestionIds = [],
  onClose,
  onSelect,
  publishedOnly = false,
  scope,
  selectedQuestionIds,
}: QuestionPickerProps) {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const currentUserId = useAppSelector((state) => state.auth.user?.userId)
  const questionsQuery = useQuestionsQuery(scope, 'all', page, PAGE_SIZE, {
    keyword,
    scope: '',
    sharing: '',
    status: publishedOnly ? 'PUBLISHED' : '',
    topicName: '',
    type: '',
  })
  const questions = (questionsQuery.data?.content ?? []).filter(
    (question) => !question.locked || question.createdBy === currentUserId,
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <section
        aria-labelledby="question-picker-title"
        aria-modal="true"
        className="flex max-h-[86vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl"
        role="dialog"
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <h2 className="text-lg font-black text-slate-900" id="question-picker-title">
            Chọn câu hỏi từ ngân hàng
          </h2>
          <button
            aria-label="Đóng"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="border-b border-slate-200 px-6 py-3.5">
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-indigo-400"
              onChange={(event) => {
                setKeyword(event.target.value)
                setPage(1)
              }}
              placeholder="Tìm theo mã hoặc nội dung câu hỏi…"
              value={keyword}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-3">
          {questionsQuery.isLoading ? (
            <p className="py-8 text-center text-sm text-slate-400">Đang tải câu hỏi…</p>
          ) : questions.length ? (
            <div className="grid gap-2.5 py-2">
              {questions.map((question) => {
                const isSelected = selectedQuestionIds.includes(question.id)
                const isUsedElsewhere = !isSelected && excludeQuestionIds.includes(question.id)
                const statusDisplay = getQuestionStatusDisplay(question.status)
                return (
                  <button
                    className={[
                      'grid gap-1 rounded-xl border p-3.5 text-left transition',
                      isUsedElsewhere
                        ? 'cursor-not-allowed border-slate-200 bg-slate-100 opacity-60'
                        : isSelected
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 hover:bg-slate-50',
                    ].join(' ')}
                    disabled={isUsedElsewhere}
                    key={question.id}
                    onClick={() => onSelect(question)}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-slate-900">{question.code}</span>
                      <div className="flex items-center gap-2">
                        {isUsedElsewhere ? (
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                            Đã dùng ở phần khác
                          </span>
                        ) : (
                          <StatusBadge label={statusDisplay.label} tone={statusDisplay.className.includes('emerald') ? 'success' : 'neutral'} />
                        )}
                        {isSelected ? <Check aria-hidden="true" className="size-4 text-indigo-600" /> : null}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">{formatNullableText(question.questionText)}</p>
                    <span className="w-fit rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                      {getQuestionTypeDisplay(question.type)}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">Không tìm thấy câu hỏi phù hợp.</p>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3.5 text-xs font-semibold text-slate-500">
          <span>{questionsQuery.data?.totalElements ?? 0} câu hỏi</span>
          <div className="flex gap-2">
            <button
              className="h-8 rounded-lg border border-slate-200 px-3 disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              type="button"
            >
              Trước
            </button>
            <button
              className="h-8 rounded-lg border border-slate-200 px-3 disabled:opacity-40"
              disabled={page >= (questionsQuery.data?.totalPages ?? 1)}
              onClick={() => setPage((current) => current + 1)}
              type="button"
            >
              Sau
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
