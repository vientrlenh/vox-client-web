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
  isError: boolean
  isLoading: boolean
  onEdit?: (question: QuestionDto) => void
  onRetry: () => void
  onSelect: (id: string) => void
  questions: QuestionDto[]
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
        <h2 className="text-lg font-black text-blue-950">Danh sach cau hoi</h2>
      </div>

      {isLoading ? (
        <div className="flex min-h-80 flex-1 items-center justify-center px-6 py-12 text-sm font-bold text-slate-500">
          Dang tai danh sach cau hoi...
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
            Thu lai
          </button>
        </div>
      ) : null}

      {!isLoading && !isError && questions.length === 0 ? (
        <div className="flex min-h-80 flex-1 items-center justify-center px-6 py-12 text-sm font-bold text-slate-500">
          Chua co cau hoi nao
        </div>
      ) : null}

      {!isLoading && !isError && questions.length > 0 ? (
        <div className="min-h-80 flex-1 overflow-x-auto">
          <table className="w-full min-w-280 border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-black text-blue-950">
                <th className="px-6 py-4">Cau hoi</th>
                <th className="px-4 py-4">Ma</th>
                <th className="px-4 py-4">Loai</th>
                <th className="px-4 py-4">Chia se</th>
                <th className="px-4 py-4">Bao mat</th>
                <th className="px-4 py-4">Thoi luong</th>
                <th className="px-4 py-4">Trang thai</th>
                <th className="px-4 py-4">Cap nhat</th>
                <th className="px-4 py-4 text-center">Hanh dong</th>
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
                          ariaLabel="Mo hanh dong cho cau hoi"
                          items={[
                            {
                              icon: Eye,
                              id: 'view',
                              label: 'Xem chi tiet',
                              onSelect: () => onSelect(question.id),
                              tone: 'primary',
                            },
                            ...(onEdit
                              ? [
                                  {
                                    icon: Pencil,
                                    id: 'edit',
                                    label: 'Chinh sua',
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
