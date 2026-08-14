import type { FormEvent } from 'react'
import type { QuestionQueryFilters } from '../api/useQuestionsQuery'
import type { QuestionSharing, QuestionType } from '../types'

const QUESTION_TYPE_OPTIONS: Array<{ label: string; value: '' | QuestionType }> = [
  { label: 'Tất cả loại', value: '' },
  { label: 'Đọc to', value: 'READ_ALOUD' },
  { label: 'Trả lời ngắn', value: 'SHORT_ANSWER' },
  { label: 'Trả lời dài', value: 'LONG_ANSWER' },
  { label: 'Ý kiến', value: 'OPINION' },
  { label: 'Mô tả', value: 'DESCRIPTION' },
]

const QUESTION_SHARING_OPTIONS: Array<{ label: string; value: '' | QuestionSharing }> = [
  { label: 'Tất cả chia sẻ', value: '' },
  { label: 'Riêng tư', value: 'PRIVATE' },
  { label: 'Chia sẻ trong trường', value: 'SCHOOL_SHARED' },
]

const fieldClassName =
  'h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-500'

type Option = { id: string; name: string }

type QuestionFiltersFormProps = {
  banks: Option[]
  draftFilters: QuestionQueryFilters
  isBanksLoading: boolean
  isTopicsLoading: boolean
  onDraftChange: (next: QuestionQueryFilters) => void
  onReset: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  topics: Option[]
}

export function QuestionFiltersForm({
  banks,
  draftFilters,
  isBanksLoading,
  isTopicsLoading,
  onDraftChange,
  onReset,
  onSubmit,
  topics,
}: QuestionFiltersFormProps) {
  return (
    <form
      className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5"
      onSubmit={onSubmit}
    >
      <div>
        <h2 className="text-base font-black text-blue-950">Tìm kiếm câu hỏi</h2>
        <p className="text-sm text-slate-600">
          Lọc danh sách theo ngân hàng, chủ đề, loại, chia sẻ và từ khóa.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Từ khóa
          <input
            className={fieldClassName}
            onChange={(event) =>
              onDraftChange({ ...draftFilters, keyword: event.target.value })
            }
            placeholder="Mã, nội dung, prompt..."
            value={draftFilters.keyword}
          />
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Ngân hàng câu hỏi
          <select
            className={fieldClassName}
            disabled={isBanksLoading}
            onChange={(event) =>
              // Đổi ngân hàng thì chủ đề cũ không còn thuộc ngân hàng mới nữa.
              onDraftChange({
                ...draftFilters,
                questionBankId: event.target.value,
                questionTopicId: '',
                topicName: '',
              })
            }
            value={draftFilters.questionBankId ?? ''}
          >
            <option value="">
              {isBanksLoading ? 'Đang tải...' : 'Tất cả ngân hàng'}
            </option>
            {banks.map((bank) => (
              <option key={bank.id} value={bank.id}>
                {bank.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Chủ đề
          <select
            className={fieldClassName}
            disabled={!draftFilters.questionBankId || isTopicsLoading}
            onChange={(event) =>
              // Lọc theo id là đủ chính xác; `topicName` (LIKE) chỉ còn dùng cho link cũ,
              // giữ lại cả hai sẽ thành hai điều kiện AND mâu thuẫn nhau.
              onDraftChange({
                ...draftFilters,
                questionTopicId: event.target.value,
                topicName: '',
              })
            }
            value={draftFilters.questionTopicId ?? ''}
          >
            <option value="">
              {!draftFilters.questionBankId
                ? 'Chọn ngân hàng trước'
                : isTopicsLoading
                  ? 'Đang tải...'
                  : 'Tất cả chủ đề'}
            </option>
            {topics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Loại câu hỏi
          <select
            className={fieldClassName}
            onChange={(event) =>
              onDraftChange({
                ...draftFilters,
                type: event.target.value as QuestionQueryFilters['type'],
              })
            }
            value={draftFilters.type}
          >
            {QUESTION_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Chia sẻ
          <select
            className={fieldClassName}
            onChange={(event) =>
              onDraftChange({
                ...draftFilters,
                sharing: event.target.value as QuestionQueryFilters['sharing'],
              })
            }
            value={draftFilters.sharing}
          >
            {QUESTION_SHARING_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <button
          className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          onClick={onReset}
          type="button"
        >
          Đặt lại
        </button>
        <button
          className="inline-flex h-11 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700"
          type="submit"
        >
          Tìm kiếm
        </button>
      </div>
    </form>
  )
}
