import type { ReactNode } from 'react'
import { Eye, FolderOpen, Pencil } from 'lucide-react'
import {
  ActionMenuButton,
  type ActionMenuItem,
} from '@/shared/ui/ActionMenuButton'
import type { QuestionBankDto } from '../types'
import {
  formatNullableText,
  formatQuestionBankDate,
  getActiveStatusDisplay,
} from '../types'

type QuestionBankTableProps = {
  errorMessage?: string
  footer?: ReactNode
  getAdditionalActions?: (bank: QuestionBankDto) => ActionMenuItem[]
  isError: boolean
  isLoading: boolean
  onEdit?: (bank: QuestionBankDto) => void
  onRetry: () => void
  onSelect: (id: string) => void
  onViewTopics: (bank: QuestionBankDto) => void
  questionBanks: QuestionBankDto[]
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

export function QuestionBankTable({
  errorMessage,
  footer,
  getAdditionalActions,
  isError,
  isLoading,
  onEdit,
  onRetry,
  onSelect,
  onViewTopics,
  questionBanks,
  selectedId,
}: QuestionBankTableProps) {
  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-lg font-black text-blue-950">
          Danh sach ngan hang cau hoi
        </h2>
      </div>

      {isLoading ? (
        <div className="flex min-h-80 flex-1 items-center justify-center px-6 py-12 text-sm font-bold text-slate-500">
          Dang tai danh sach ngan hang cau hoi...
        </div>
      ) : null}

      {isError ? (
        <div className="flex min-h-80 flex-1 flex-col items-center justify-center px-6 py-12 text-center">
          <p className="text-sm font-bold text-red-600">
            {errorMessage ?? 'Khong the tai danh sach ngan hang cau hoi.'}
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

      {!isLoading && !isError && questionBanks.length === 0 ? (
        <div className="flex min-h-80 flex-1 items-center justify-center px-6 py-12 text-sm font-bold text-slate-500">
          Chua co ngan hang cau hoi
        </div>
      ) : null}

      {!isLoading && !isError && questionBanks.length > 0 ? (
        <div className="min-h-80 flex-1 overflow-x-auto">
          <table className="w-full min-w-200 border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-black text-blue-950">
                <th className="px-6 py-4">Ten ngan hang</th>
                <th className="px-4 py-4">Mo ta</th>
                <th className="px-4 py-4">Trang thai</th>
                <th className="px-4 py-4">Ngay tao</th>
                <th className="px-4 py-4 text-center">Hanh dong</th>
              </tr>
            </thead>
            <tbody>
              {questionBanks.map((bank) => {
                const isSelected = bank.id === selectedId

                return (
                  <tr
                    className={[
                      'border-b border-slate-100 align-top text-sm text-blue-950 last:border-b-0',
                      isSelected ? 'bg-indigo-50/50' : 'bg-white',
                    ].join(' ')}
                    key={bank.id}
                  >
                    <td className="px-6 py-5 font-bold">
                      {formatNullableText(bank.bankName)}
                    </td>
                    <td className="max-w-44 wrap-break-word px-4 py-5">
                      {formatNullableText(bank.description)}
                    </td>
                    <td className="px-4 py-5">
                      <ActiveStatusBadge isActive={bank.isActive} />
                    </td>
                    <td className="px-4 py-5">
                      {formatQuestionBankDate(bank.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-center">
                        <ActionMenuButton
                          ariaLabel={`Mo hanh dong cho ${formatNullableText(bank.bankName)}`}
                          items={[
                            {
                              icon: Eye,
                              id: 'view',
                              label: 'Xem chi tiet',
                              onSelect: () => onSelect(bank.id),
                              tone: 'primary',
                            },
                            {
                              icon: FolderOpen,
                              id: 'topics',
                              label: 'Xem chu de',
                              onSelect: () => onViewTopics(bank),
                              tone: 'default',
                            },
                            ...(onEdit
                              ? [
                                  {
                                    icon: Pencil,
                                    id: 'edit',
                                    label: 'Chinh sua',
                                    onSelect: () => onEdit(bank),
                                    tone: 'default' as const,
                                  },
                                ]
                              : []),
                            ...(getAdditionalActions?.(bank) ?? []),
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
