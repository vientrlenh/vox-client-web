import type { ReactNode } from 'react'
import { Eye, Pencil } from 'lucide-react'
import {
  ActionMenuButton,
  type ActionMenuItem,
} from '@/shared/ui/ActionMenuButton'
import type { QuestionTopicDto } from '../types'
import {
  formatNullableText,
  getQuestionTopicStatusDisplay,
} from '../types'

type QuestionTopicTableProps = {
  canEdit?: (topic: QuestionTopicDto) => boolean
  errorMessage?: string
  footer?: ReactNode
  getAdditionalActions?: (topic: QuestionTopicDto) => ActionMenuItem[]
  isError: boolean
  isLoading: boolean
  onEdit?: (topic: QuestionTopicDto) => void
  onRetry: () => void
  onSelect: (id: string) => void
  /** Bật cột chọn hàng loạt. Không truyền thì bảng giữ nguyên hình dạng cũ, không có checkbox. */
  onToggleSelectId?: (id: string) => void
  onToggleSelectPage?: () => void
  questionTopics: QuestionTopicDto[]
  selectedId: string | null
  selectedIds?: string[]
}

export function QuestionTopicTable({
  canEdit,
  errorMessage,
  footer,
  getAdditionalActions,
  isError,
  isLoading,
  onEdit,
  onRetry,
  onSelect,
  onToggleSelectId,
  onToggleSelectPage,
  questionTopics,
  selectedId,
  selectedIds,
}: QuestionTopicTableProps) {
  const checkedIds = new Set(selectedIds ?? [])
  const isBulkEnabled = Boolean(onToggleSelectId)
  // Chỉ nói về trang hiện tại: lựa chọn được giữ xuyên trang nên có thể còn mục đã chọn ở trang khác.
  const isPageFullyChecked =
    questionTopics.length > 0 && questionTopics.every((topic) => checkedIds.has(topic.id))

  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-lg font-black text-blue-950">Danh sách chủ đề</h2>
      </div>

      {isLoading ? (
        <div className="flex min-h-80 flex-1 items-center justify-center px-6 py-12 text-sm font-bold text-slate-500">
          Đang tải danh sách chủ đề...
        </div>
      ) : null}

      {isError ? (
        <div className="flex min-h-80 flex-1 flex-col items-center justify-center px-6 py-12 text-center">
          <p className="text-sm font-bold text-red-600">
            {errorMessage ?? 'Không thể tải danh sách chủ đề.'}
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

      {!isLoading && !isError && questionTopics.length === 0 ? (
        <div className="flex min-h-80 flex-1 items-center justify-center px-6 py-12 text-sm font-bold text-slate-500">
          Chưa có chủ đề nào
        </div>
      ) : null}

      {!isLoading && !isError && questionTopics.length > 0 ? (
        <div className="min-h-80 flex-1 overflow-x-auto">
          <table className="w-full min-w-220 border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-black text-blue-950">
                {isBulkEnabled ? (
                  <th className="w-12 px-4 py-4">
                    <input
                      aria-label="Chọn tất cả chủ đề trên trang này"
                      checked={isPageFullyChecked}
                      className="size-4 cursor-pointer accent-indigo-600"
                      onChange={() => onToggleSelectPage?.()}
                      type="checkbox"
                    />
                  </th>
                ) : null}
                <th className="px-6 py-4">Chủ đề</th>
                <th className="px-4 py-4">Mã</th>
                <th className="px-4 py-4">Mô tả</th>
                <th className="px-4 py-4">Trạng thái</th>
                <th className="px-4 py-4 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {questionTopics.map((topic) => {
                const isSelected = topic.id === selectedId
                const status = getQuestionTopicStatusDisplay(topic.status)

                return (
                  <tr
                    className={[
                      'border-b border-slate-100 align-top text-sm text-blue-950 last:border-b-0',
                      isSelected ? 'bg-indigo-50/50' : 'bg-white',
                    ].join(' ')}
                    key={topic.id}
                  >
                    {isBulkEnabled ? (
                      <td className="px-4 py-5">
                        <input
                          aria-label={`Chọn ${formatNullableText(topic.name)}`}
                          checked={checkedIds.has(topic.id)}
                          className="size-4 cursor-pointer accent-indigo-600"
                          onChange={() => onToggleSelectId?.(topic.id)}
                          type="checkbox"
                        />
                      </td>
                    ) : null}
                    <td className="px-6 py-5 font-bold">
                      {formatNullableText(topic.name)}
                    </td>
                    <td className="px-4 py-5 font-mono text-xs font-semibold text-slate-600">
                      {formatNullableText(topic.code)}
                    </td>
                    <td className="max-w-56 wrap-break-word px-4 py-5">
                      {formatNullableText(topic.description)}
                    </td>
                    <td className="px-4 py-5">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-center">
                        <ActionMenuButton
                          ariaLabel={`Mở hành động cho ${formatNullableText(topic.name)}`}
                          items={[
                            {
                              icon: Eye,
                              id: 'view',
                              label: 'Xem chi tiết',
                              onSelect: () => onSelect(topic.id),
                              tone: 'primary',
                            },
                            ...(onEdit
                              ? [
                                  {
                                    disabled: !(canEdit?.(topic) ?? true),
                                    disabledReason:
                                      'Chỉ chỉnh sửa được khi ở trạng thái Bản nháp',
                                    icon: Pencil,
                                    id: 'edit',
                                    label: 'Chỉnh sửa',
                                    onSelect: () => onEdit(topic),
                                    tone: 'default' as const,
                                  },
                                ]
                              : []),
                            ...(getAdditionalActions?.(topic) ?? []),
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
