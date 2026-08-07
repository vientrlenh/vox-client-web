import { useState } from 'react'
import { Check, Eye, Search, X } from 'lucide-react'
import type { QuestionModuleScope } from '@/features/question-bank/api/useQuestionBanksQuery'
import { useQuestionsQuery } from '@/features/question/api/useQuestionsQuery'
import { useQuestionTopicQuery } from '@/features/question-topic/api/useQuestionTopicQuery'
import {
  formatDuration,
  formatNullableText,
  getQuestionStatusDisplay,
  getQuestionTypeDisplay,
  type QuestionDto,
  type QuestionType,
} from '@/features/question/types'
import { StatusBadge } from '@/shared/ui/StatusBadge'

type QuestionPickerProps = {
  /** Tiền tố route theo vai trò hiện tại (VD: "/teacher", "/school-admin") — dùng để mở đúng trang chi tiết câu hỏi. */
  questionDetailBasePath: string
  excludeQuestionIds?: string[]
  /** Tiêu chí của ô SELECTION trong blueprint — lọc sẵn danh sách cho người ra đề. */
  initialQuestionTopicId?: string | null
  initialType?: QuestionType | null
  onClose: () => void
  onSelect: (question: QuestionDto) => void
  /**
   * Chế độ GIỎ: bấm câu là cho vào/bỏ khỏi giỏ, picker ở lại, bấm nút xác nhận mới ghi thật.
   *
   * Blueprint và mã đề kỳ thi tập trung chọn đúng một câu rồi đóng nên để mặc định tắt.
   */
  multiSelect?: boolean
  /** Id đang nằm trong giỏ (chưa ghi). Chỉ dùng khi `multiSelect`. */
  pendingQuestionIds?: string[]
  onConfirm?: () => void
  confirmLabel?: string
  confirmPending?: boolean
  publishedOnly?: boolean
  scope: QuestionModuleScope
  selectedQuestionIds: string[]
}

const PAGE_SIZE = 8

export function QuestionPicker({
  questionDetailBasePath,
  excludeQuestionIds = [],
  initialQuestionTopicId = null,
  initialType = null,
  onClose,
  onSelect,
  multiSelect = false,
  pendingQuestionIds = [],
  onConfirm,
  confirmLabel = 'Thêm',
  confirmPending = false,
  publishedOnly = false,
  scope,
  selectedQuestionIds,
}: QuestionPickerProps) {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  // Tiêu chí có thể hẹp tới mức không còn câu nào khớp, nên phải cho bỏ lọc để thoát.
  const [applySlotFilter, setApplySlotFilter] = useState(true)
  const hasSlotFilter = Boolean(initialQuestionTopicId) || Boolean(initialType)
  const filterActive = hasSlotFilter && applySlotFilter
  const topicQuery = useQuestionTopicQuery(filterActive ? initialQuestionTopicId : null)
  const questionsQuery = useQuestionsQuery(scope, 'all', page, PAGE_SIZE, {
    keyword,
    questionTopicId: filterActive ? (initialQuestionTopicId ?? undefined) : undefined,
    scope: '',
    sharing: '',
    status: publishedOnly ? 'PUBLISHED' : '',
    topicName: '',
    type: filterActive ? (initialType ?? '') : '',
  })
  const questions = questionsQuery.data?.content ?? []

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

        {hasSlotFilter ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-indigo-50/60 px-6 py-2.5 text-[11px] font-semibold text-indigo-900">
            <span>
              {filterActive
                ? `Đang lọc theo tiêu chí của ô${initialType ? `: Loại = ${getQuestionTypeDisplay(initialType)}` : ''}${
                    initialQuestionTopicId ? `${initialType ? ',' : ':'} Chủ đề = ${topicQuery.data?.topicName ?? '…'}` : ''
                  }`
                : 'Đã bỏ lọc theo tiêu chí của ô — câu hỏi không khớp tiêu chí sẽ bị từ chối khi gán.'}
            </span>
            <button
              className="rounded-full border border-indigo-300 bg-white px-2.5 py-0.5 font-bold text-indigo-700 hover:bg-indigo-50"
              onClick={() => {
                setApplySlotFilter((current) => !current)
                setPage(1)
              }}
              type="button"
            >
              {filterActive ? 'Bỏ lọc' : 'Lọc lại'}
            </button>
          </div>
        ) : null}

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
                const cannotUseInExam = question.usableInExam === false
                // Chọn nhiều: câu đã thêm khoá luôn. Bấm nó vốn đã là no-op ở nơi gọi, khoá lại
                // chỉ là cho con trỏ và độ mờ nói đúng sự thật đó.
                // Câu ĐÃ nằm trong đề rồi thì khoá -- gỡ là việc làm ở danh sách phần bên
                // ngoài, nơi nhìn thấy hậu quả ngay; picker đang che mất danh sách đó.
                const alreadyInPaper = multiSelect && isSelected
                // Câu đang trong GIỎ thì bấm lại để bỏ ra, nên KHÔNG khoá.
                const isPending = multiSelect && pendingQuestionIds.includes(question.id)
                const isDisabled = isUsedElsewhere || cannotUseInExam || alreadyInPaper
                const statusDisplay = getQuestionStatusDisplay(question.status)

                return (
                  <div
                    className={[
                      'flex items-stretch gap-2 rounded-xl border p-3.5 transition',
                      // isSelected xét TRƯỚC isDisabled: câu đã thêm cũng nằm trong isDisabled,
                      // để nhánh xám đứng trước thì nó trông y hệt câu bị cấm dùng -- mất luôn
                      // dấu hiệu "đã chọn" mà cả khối này dựng ra để thể hiện.
                      // Trong giỏ = viền xanh nổi bật; đã nằm trong đề = xám như các câu khoá
                      // khác. Hai trạng thái trông khác nhau vì chúng KHÁC nhau: một cái bấm
                      // lại bỏ được, một cái không.
                      isPending
                        ? 'border-indigo-500 bg-indigo-50'
                        : isDisabled
                          ? 'border-slate-200 bg-slate-100'
                          : isSelected
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-slate-200',
                    ].join(' ')}
                    key={question.id}
                  >
                    <button
                      className={[
                        'grid flex-1 gap-1 text-left',
                        isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                      ].join(' ')}
                      disabled={isDisabled}
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
                          ) : cannotUseInExam ? (
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                              Chỉ có quyền xem, không thể dùng trong bài kiểm tra
                            </span>
                          ) : (
                            <StatusBadge
                              label={statusDisplay.label}
                              tone={statusDisplay.className.includes('emerald') ? 'success' : 'neutral'}
                            />
                          )}
                          {alreadyInPaper ? (
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                              Đã có trong đề
                            </span>
                          ) : null}
                          {isPending ? (
                            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                              Đang chọn · bấm để bỏ
                            </span>
                          ) : null}
                          {isSelected || isPending ? (
                            <Check aria-hidden="true" className="size-4 text-indigo-600" />
                          ) : null}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">{formatNullableText(question.questionText)}</p>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="w-fit rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                          {getQuestionTypeDisplay(question.type)}
                        </span>
                        <span className="w-fit rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                          Chuẩn bị: {formatDuration(question.preparationTimeSeconds)}
                        </span>
                        <span className="w-fit rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                          Tối thiểu: {formatDuration(question.minResponseSeconds)}
                        </span>
                        <span className="w-fit rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                          Tối đa: {formatDuration(question.maxResponseSeconds)}
                        </span>
                      </div>
                    </button>
                    <a
                      aria-label={`Xem chi tiết ${question.code}`}
                      className="inline-flex size-8 shrink-0 items-center justify-center self-start rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      href={`${questionDetailBasePath}/questions/${question.id}`}
                      onClick={(event) => event.stopPropagation()}
                      rel="noopener noreferrer"
                      target="_blank"
                      title="Xem chi tiết câu hỏi"
                    >
                      <Eye aria-hidden="true" className="size-3.5" />
                    </a>
                  </div>
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

        {/* Thanh xác nhận của chế độ giỏ. Để RIÊNG dưới thanh phân trang: giỏ sống xuyên trang,
            nên gộp vào đó sẽ khiến nó trông như chỉ áp cho trang đang xem. */}
        {multiSelect && onConfirm ? (
          <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-3.5">
            <span className="text-xs font-semibold text-slate-500">
              {pendingQuestionIds.length > 0
                ? `Đang chọn ${pendingQuestionIds.length} câu`
                : 'Bấm vào câu hỏi để chọn — chọn xong bấm nút bên phải.'}
            </span>
            <button
              className="inline-flex h-9 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-black text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={pendingQuestionIds.length === 0 || confirmPending}
              onClick={onConfirm}
              type="button"
            >
              {confirmPending ? 'Đang thêm…' : confirmLabel}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  )
}
