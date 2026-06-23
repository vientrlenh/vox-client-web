import type { ReactNode } from 'react'
import { Edit, Eye, Trash2 } from 'lucide-react'
import { ActionMenuButton } from '@/shared/ui/ActionMenuButton'
import type { SupportedLanguage } from '../types'
import { formatLanguageDate, formatNullableText } from '../types'
import { LanguageStatusBadge } from './LanguageStatusBadge'

type LanguageTableProps = {
  errorMessage?: string
  footer?: ReactNode
  isActionPending?: boolean
  isError: boolean
  isLoading: boolean
  languages: SupportedLanguage[]
  onDelete: (language: SupportedLanguage) => void
  onEdit: (language: SupportedLanguage) => void
  onRetry: () => void
  onView: (language: SupportedLanguage) => void
  selectedId: string | null
}

export function LanguageTable({
  errorMessage,
  footer,
  isActionPending = false,
  isError,
  isLoading,
  languages,
  onDelete,
  onEdit,
  onRetry,
  onView,
  selectedId,
}: LanguageTableProps) {
  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-lg font-black text-blue-950">
          Danh sách ngôn ngữ
        </h2>
      </div>

      {isLoading ? (
        <div className="flex min-h-80 flex-1 items-center justify-center px-6 py-12 text-sm font-bold text-slate-500">
          Đang tải danh sách ngôn ngữ...
        </div>
      ) : null}

      {isError ? (
        <div className="flex min-h-80 flex-1 flex-col items-center justify-center px-6 py-12 text-center">
          <p className="text-sm font-bold text-red-600">
            {errorMessage ?? 'Không thể tải danh sách ngôn ngữ.'}
          </p>
          <button
            className="mt-4 inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
            onClick={onRetry}
            type="button"
          >
            Thử lại
          </button>
        </div>
      ) : null}

      {!isLoading && !isError && languages.length === 0 ? (
        <div className="flex min-h-80 flex-1 items-center justify-center px-6 py-12 text-sm font-bold text-slate-500">
          Chưa có ngôn ngữ
        </div>
      ) : null}

      {!isLoading && !isError && languages.length > 0 ? (
        <div className="min-h-80 flex-1 overflow-x-auto">
          <table className="w-full min-w-220 border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-black text-blue-950">
                <th className="px-6 py-4">Mã</th>
                <th className="px-4 py-4">Tên ngôn ngữ</th>
                <th className="px-4 py-4">Trạng thái</th>
                <th className="px-4 py-4">Ngày tạo</th>
                <th className="px-4 py-4">Cập nhật</th>
                <th className="px-4 py-4 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {languages.map((language) => {
                const isSelected = language.id === selectedId

                return (
                  <tr
                    className={[
                      'border-b border-slate-100 align-top text-sm text-blue-950 last:border-b-0',
                      isSelected ? 'bg-indigo-50/50' : 'bg-white',
                    ].join(' ')}
                    key={language.id}
                  >
                    <td className="px-6 py-5">
                      <span className="font-mono text-sm font-black uppercase">
                        {formatNullableText(language.code)}
                      </span>
                    </td>
                    <td className="px-4 py-5 font-bold">
                      {formatNullableText(language.name)}
                    </td>
                    <td className="px-4 py-5">
                      <LanguageStatusBadge isActive={language.isActive} />
                    </td>
                    <td className="px-4 py-5 text-sm font-semibold text-slate-600">
                      {formatLanguageDate(language.createdAt)}
                    </td>
                    <td className="px-4 py-5 text-sm font-semibold text-slate-600">
                      {formatLanguageDate(language.updatedAt)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-center">
                        <ActionMenuButton
                          ariaLabel={`Mở hành động cho ${formatNullableText(
                            language.name,
                          )}`}
                          disabled={isActionPending}
                          items={[
                            {
                              icon: Eye,
                              id: 'view',
                              label: 'Xem chi tiết',
                              onSelect: () => onView(language),
                              tone: 'primary',
                            },
                            {
                              icon: Edit,
                              id: 'edit',
                              label: 'Sửa ngôn ngữ',
                              onSelect: () => onEdit(language),
                              tone: 'primary',
                            },
                            {
                              icon: Trash2,
                              id: 'delete',
                              label: 'Lưu trữ ngôn ngữ',
                              onSelect: () => onDelete(language),
                              tone: 'danger',
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
