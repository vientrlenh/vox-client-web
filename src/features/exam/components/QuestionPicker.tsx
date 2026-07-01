import { useState } from 'react'
import { useQuestionsQuery } from '@/features/question/api/useQuestionsQuery'
import type { QuestionDto, QuestionStatus } from '@/features/question/types'
import {
  formatNullableText,
  getQuestionSharingDisplay,
  getQuestionStatusDisplay,
  getQuestionTypeDisplay,
} from '@/features/question/types'

type QuestionPickerProps = {
  allowStatusChange?: boolean
  emptyMessage?: string
  fixedStatus?: '' | QuestionStatus
  mode?: 'multiple' | 'single'
  onSelect: (question: QuestionDto) => void
  selectedQuestionIds?: string[]
  title?: string
}

function Field({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string
  onChange: (value: string) => void
  placeholder?: string
  value: string
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  )
}

function QuestionStatusBadge({ status }: { status?: QuestionStatus | null }) {
  const display = getQuestionStatusDisplay(status)
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${display.className}`}>{display.label}</span>
}

export function QuestionPicker({
  allowStatusChange = true,
  emptyMessage = 'Không tìm thấy câu hỏi phù hợp.',
  fixedStatus,
  mode = 'multiple',
  onSelect,
  selectedQuestionIds = [],
  title,
}: QuestionPickerProps) {
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<'' | QuestionStatus>(fixedStatus ?? '')
  const [page, setPage] = useState(1)
  const effectiveStatus = fixedStatus ?? status
  const questionsQuery = useQuestionsQuery('teacher', 'all', page, 12, {
    keyword,
    scope: 'ALL',
    status: effectiveStatus,
  })

  return (
    <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4">
      {title ? <h3 className="text-base font-black text-slate-950">{title}</h3> : null}
      <div className={`grid gap-4 ${allowStatusChange && !fixedStatus ? 'md:grid-cols-2' : ''}`}>
        <Field
          label="Tìm câu hỏi"
          onChange={(value) => {
            setKeyword(value)
            setPage(1)
          }}
          placeholder="Nhập mã, nội dung..."
          value={keyword}
        />
        {allowStatusChange && !fixedStatus ? (
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Trạng thái
            <select
              className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950"
              onChange={(event) => {
                setStatus(event.target.value as '' | QuestionStatus)
                setPage(1)
              }}
              value={status}
            >
              <option value="">Tất cả</option>
              <option value="PUBLISHED">Đã xuất bản</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="DRAFT">Bản nháp</option>
              <option value="SUBMITTED_FOR_REVIEW">Đã gửi duyệt</option>
              <option value="REVISION_REQUESTED">Yêu cầu chỉnh sửa</option>
              <option value="ARCHIVED">Lưu trữ</option>
            </select>
          </label>
        ) : null}
      </div>
      <div className="grid gap-3">
        {questionsQuery.data?.content.length ? (
          questionsQuery.data.content.map((question) => {
            const isSelected = selectedQuestionIds.includes(question.id)
            return (
              <div className="grid gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center" key={question.id}>
                <div className="grid gap-1">
                  <p className="text-sm font-black text-slate-950">{question.code}</p>
                  <p className="text-sm font-medium text-slate-600">{formatNullableText(question.questionText)}</p>
                  <div className="flex flex-wrap gap-2">
                    <QuestionStatusBadge status={question.status} />
                    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                      {getQuestionTypeDisplay(question.type)}
                    </span>
                    <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600">
                      {getQuestionSharingDisplay(question.sharing)}
                    </span>
                  </div>
                </div>
                <button
                  className={`inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-bold ${isSelected ? 'border border-slate-200 text-slate-400' : 'bg-indigo-600 text-white'}`}
                  disabled={isSelected}
                  onClick={() => onSelect(question)}
                  type="button"
                >
                  {mode === 'single' ? (isSelected ? 'Đang chọn' : 'Chọn') : isSelected ? 'Đã chọn' : 'Thêm'}
                </button>
              </div>
            )
          })
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-sm font-semibold text-slate-500">
            {emptyMessage}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between text-sm font-semibold text-slate-600">
        <span>
          {questionsQuery.data?.totalElements ?? 0} câu hỏi, trang {questionsQuery.data?.page ?? 1}/{questionsQuery.data?.totalPages || 1}
        </span>
        <div className="flex gap-2">
          <button
            className="h-9 rounded-lg border border-slate-200 px-3 disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
            type="button"
          >
            Trước
          </button>
          <button
            className="h-9 rounded-lg border border-slate-200 px-3 disabled:opacity-50"
            disabled={page >= (questionsQuery.data?.totalPages ?? 1)}
            onClick={() => setPage((current) => current + 1)}
            type="button"
          >
            Sau
          </button>
        </div>
      </div>
    </div>
  )
}
