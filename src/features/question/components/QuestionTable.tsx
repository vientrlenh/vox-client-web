import type { ReactNode } from 'react'
import { Eye, Pencil } from 'lucide-react'
import { ActionMenuButton } from '@/shared/ui/ActionMenuButton'
import type { QuestionDto } from '../types'
import {
  formatDuration,
  formatNullableText,
  formatQuestionDate,
  getQuestionConfidentialityDisplay,
  getQuestionSharingDisplay,
  getQuestionStatusDisplay,
  getQuestionTypeDisplay,
} from '../types'

type QuestionTableProps = {
  canEdit?: (question: QuestionDto) => boolean
  errorMessage?: string
  footer?: ReactNode
  isBulkSelectable?: boolean
  isError: boolean
  isLoading: boolean
  onEdit?: (question: QuestionDto) => void
  onSelectAllQuestions?: (checked: boolean) => void
  onToggleQuestionSelection?: (questionId: string, checked: boolean) => void
  onRetry: () => void
  onSelect: (id: string) => void
  questions: QuestionDto[]
  selectedIds?: string[]
  selectedId: string | null
}

function StatusBadge({ status }: { status?: string | null }) {
  const display = getQuestionStatusDisplay(status as never)

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
  canEdit,
  errorMessage,
  footer,
  isBulkSelectable = false,
  isError,
  isLoading,
  onEdit,
  onSelectAllQuestions,
  onToggleQuestionSelection,
  onRetry,
  onSelect,
  questions,
  selectedIds = [],
  selectedId,
}: QuestionTableProps) {
  const allSelected =
    isBulkSelectable && questions.length > 0 && questions.every((question) => selectedIds.includes(question.id))

  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-lg font-black text-blue-950">Danh sách câu hỏi</h2>
      </div>

      {isLoading ? (
        <div className="flex min-h-80 flex-1 items-center justify-center px-6 py-12 text-sm font-bold text-slate-500">
          Đang tải danh sách câu hỏi...
        </div>
      ) : null}

      {isError ? (
        <div className="flex min-h-80 flex-1 flex-col items-center justify-center px-6 py-12 text-center">
          <p className="text-sm font-bold text-red-600">
            {errorMessage ?? 'Khong the tai danh sach cau hoi.'}
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
          <table className="w-full min-w-280 border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-black text-blue-950">
                {isBulkSelectable ? (
                  <th className="w-14 px-4 py-4 text-center">
                    <input
                      checked={allSelected}
                      className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      onChange={(event) => onSelectAllQuestions?.(event.target.checked)}
                      type="checkbox"
                    />
                  </th>
                ) : null}
                <th className="px-6 py-4">âu hỏi</th>
                <th className="px-4 py-4">Mã</th>
                <th className="px-4 py-4">Loại</th>
                <th className="px-4 py-4">Chia sẻ</th>
                <th className="px-4 py-4">ảo mật</th>
                <th className="px-4 py-4">Thời lượng</th>
                <th className="px-4 py-4">Trạng thái</th>
                <th className="px-4 py-4">Cập nhật</th>
                <th className="px-4 py-4 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((question) => {
                const isSelected = question.id === selectedId
                const isChecked = selectedIds.includes(question.id)

                return (
                  <tr
                    className={[
                      'border-b border-slate-100 align-top text-sm text-blue-950 last:border-b-0',
                      isSelected ? 'bg-indigo-50/50' : 'bg-white',
                    ].join(' ')}
                    key={question.id}
                  >
                    {isBulkSelectable ? (
                      <td className="px-4 py-5 text-center">
                        <input
                          checked={isChecked}
                          className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          onChange={(event) =>
                            onToggleQuestionSelection?.(question.id, event.target.checked)
                          }
                          type="checkbox"
                        />
                      </td>
                    ) : null}
                    <td className="max-w-90 px-6 py-5">
                      <div className="grid gap-1">
                        <span className="font-bold">
                          {formatNullableText(question.questionText)}
                        </span>
                        <span className="text-xs font-medium text-slate-500">
                          Chu de: {formatNullableText(question.topic?.name)}
                        </span>
                        <span className="text-xs font-medium text-slate-500">
                          Ngan hang: {formatNullableText(question.bank?.name)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-5 font-mono text-xs font-semibold text-slate-600">
                      {formatNullableText(question.code)}
                    </td>
                    <td className="px-4 py-5">
                      {getQuestionTypeDisplay(question.type)}
                    </td>
                    <td className="px-4 py-5">
                      {getQuestionSharingDisplay(question.sharing)}
                    </td>
                    <td className="max-w-44 px-4 py-5">
                      {getQuestionConfidentialityDisplay(
                        question.confidentiality,
                      )}
                    </td>
                    <td className="px-4 py-5">
                      {formatDuration(question.maxResponseSeconds)}
                    </td>
                    <td className="px-4 py-5">
                      <StatusBadge status={question.status} />
                    </td>
                    <td className="px-4 py-5">
                      {formatQuestionDate(question.updatedAt ?? question.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-center">
                        <ActionMenuButton
                          ariaLabel="Mở hành động cho câu hỏi"
                          items={[
                            {
                              icon: Eye,
                              id: 'view',
                              label: 'Xem chi tiết',
                              onSelect: () => onSelect(question.id),
                              tone: 'primary',
                            },
                            ...(onEdit
                              ? [
                                  {
                                    icon: Pencil,
                                    id: 'edit',
                                    label: 'Chỉnh sửa',
                                    onSelect: () => onEdit(question),
                                    tone:
                                      canEdit?.(question) ?? true
                                        ? ('default' as const)
                                        : ('primary' as const),
                                  },
                                ]
                              : []),
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
