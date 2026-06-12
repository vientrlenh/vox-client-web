import type { ReactNode } from 'react'
import { Eye, Pencil } from 'lucide-react'
import { ActionMenuButton } from '@/shared/ui/ActionMenuButton'
import type { QuestionDto } from '../types'
import {
  formatDuration,
  formatNullableText,
  formatQuestionDate,
  getActiveStatusDisplay,
  getQuestionTypeDisplay,
} from '../types'

type QuestionTableProps = {
  errorMessage?: string
  footer?: ReactNode
  isError: boolean
  isLoading: boolean
  onEdit: (question: QuestionDto) => void
  onRetry: () => void
  onSelect: (id: string) => void
  questions: QuestionDto[]
  selectedId: string | null
}

function ActiveStatusBadge({ isActive }: { isActive: boolean }) {
  const display = getActiveStatusDisplay(isActive)

  return (
    <span
      className={[
        'inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-bold',
        display.className,
      ].join(' ')}
    >
      {display.label}
    </span>
  )
}

export function QuestionTable({
  errorMessage,
  footer,
  isError,
  isLoading,
  onEdit,
  onRetry,
  onSelect,
  questions,
  selectedId,
}: QuestionTableProps) {
  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-lg font-black text-blue-950">
          Danh sách câu hỏi
        </h2>
      </div>

      {isLoading ? (
        <div className="flex min-h-80 flex-1 items-center justify-center px-6 py-12 text-sm font-bold text-slate-500">
          Đang tải danh sách câu hỏi...
        </div>
      ) : null}

      {isError ? (
        <div className="flex min-h-80 flex-1 flex-col items-center justify-center px-6 py-12 text-center">
          <p className="text-sm font-bold text-red-600">
            {errorMessage ?? 'Không thể tải danh sách câu hỏi.'}
          </p>
          <button
            className="mt-4 inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
            onClick={onRetry}
            type="button"
          >
            Thử lại
          </button>
        </div>
      ) : null}

      {!isLoading && !isError && questions.length === 0 ? (
        <div className="flex min-h-80 flex-1 items-center justify-center px-6 py-12 text-sm font-bold text-slate-500">
          Chưa có câu hỏi nào
        </div>
      ) : null}

      {!isLoading && !isError && questions.length > 0 ? (
        <div className="min-h-80 flex-1 overflow-x-auto">
          <table className="w-full min-w-220 border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-black text-blue-950">
                <th className="px-6 py-4">Nội dung câu hỏi</th>
                <th className="px-4 py-4">Loại</th>
                <th className="px-4 py-4">Khung đánh giá</th>
                <th className="px-4 py-4">Thời gian</th>
                <th className="px-4 py-4">Trạng thái</th>
                <th className="px-4 py-4">Ngày tạo</th>
                <th className="px-4 py-4 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((question) => {
                const isSelected = question.id === selectedId

                return (
                  <tr
                    className={[
                      'border-b border-slate-100 align-top text-sm text-blue-950 last:border-b-0',
                      isSelected ? 'bg-indigo-50/50' : 'bg-white',
                    ].join(' ')}
                    key={question.id}
                  >
                    <td className="max-w-60 wrap-break-word px-6 py-5 font-bold">
                      {formatNullableText(question.questionText)}
                    </td>
                    <td className="px-4 py-5">
                      {getQuestionTypeDisplay(question.questionType)}
                    </td>
                    <td className="px-4 py-5">
                      {formatNullableText(question.frameworkName)}
                    </td>
                    <td className="px-4 py-5">
                      {formatDuration(question.durationSeconds)}
                    </td>
                    <td className="px-4 py-5">
                      <ActiveStatusBadge isActive={question.isActive} />
                    </td>
                    <td className="px-4 py-5">
                      {formatQuestionDate(question.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-center">
                        <ActionMenuButton
                          ariaLabel={`Mở hành động cho câu hỏi`}
                          items={[
                            {
                              icon: Eye,
                              id: 'view',
                              label: 'Xem chi tiết',
                              onSelect: () => onSelect(question.id),
                              tone: 'primary',
                            },
                            {
                              icon: Pencil,
                              id: 'edit',
                              label: 'Chỉnh sửa',
                              onSelect: () => onEdit(question),
                              tone: 'default',
                            },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {footer}
    </section>
  )
}
