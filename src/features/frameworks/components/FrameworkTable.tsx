import type { ReactNode } from 'react'
import { CheckCircle2, Edit, Eye, Trash2, XCircle } from 'lucide-react'
import { ActionMenuButton } from '@/shared/ui/ActionMenuButton'
import type { Framework } from '../types'
import { formatFrameworkDate, formatNullableText } from '../types'
import { FrameworkStatusBadge } from './FrameworkStatusBadge'

type FrameworkTableProps = {
  errorMessage?: string
  footer?: ReactNode
  frameworks: Framework[]
  isActionPending?: boolean
  isError: boolean
  isLoading: boolean
  onDeactivate?: (framework: Framework) => void
  onDelete?: (framework: Framework) => void
  onEdit?: (framework: Framework) => void
  onRetry: () => void
  onActivate?: (framework: Framework) => void
  onView: (framework: Framework) => void
}

export function FrameworkTable({
  errorMessage,
  footer,
  frameworks,
  isActionPending = false,
  isError,
  isLoading,
  onActivate,
  onDeactivate,
  onDelete,
  onEdit,
  onRetry,
  onView,
}: FrameworkTableProps) {
  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-lg font-black text-blue-950">
          Danh sách khung đánh giá
        </h2>
      </div>

      {isLoading ? (
        <div className="flex min-h-80 flex-1 items-center justify-center px-6 py-12 text-sm font-bold text-slate-500">
          Đang tải danh sách khung đánh giá...
        </div>
      ) : null}

      {isError ? (
        <div className="flex min-h-80 flex-1 flex-col items-center justify-center px-6 py-12 text-center">
          <p className="text-sm font-bold text-red-600">
            {errorMessage ?? 'Không thể tải danh sách khung đánh giá năng lực.'}
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

      {!isLoading && !isError && frameworks.length === 0 ? (
        <div className="flex min-h-80 flex-1 items-center justify-center px-6 py-12 text-sm font-bold text-slate-500">
          Chưa có framework
        </div>
      ) : null}

      {!isLoading && !isError && frameworks.length > 0 ? (
        <div className="min-h-80 flex-1 overflow-x-auto">
          <table className="w-full min-w-200 border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-black text-blue-950">
                <th className="px-6 py-4">Tên khung đánh giá</th>
                <th className="px-4 py-4">Trạng thái</th>
                <th className="px-4 py-4">Ngày tạo</th>
                <th className="px-4 py-4">Cập nhật</th>
                <th className="px-4 py-4 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {frameworks.map((framework) => (
                <tr
                  className="border-b border-slate-100 bg-white align-top text-sm text-blue-950 last:border-b-0"
                  key={framework.id}
                >
                  <td className="px-6 py-5 font-bold">
                    {formatNullableText(framework.name)}
                  </td>
                  <td className="px-4 py-5">
                    <FrameworkStatusBadge isActive={framework.isActive} />
                  </td>
                  <td className="px-4 py-5 text-sm font-semibold text-slate-600">
                    {formatFrameworkDate(framework.createdAt)}
                  </td>
                  <td className="px-4 py-5 text-sm font-semibold text-slate-600">
                    {formatFrameworkDate(framework.updatedAt)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-center">
                      <ActionMenuButton
                        ariaLabel={`Mở hành động cho ${formatNullableText(framework.name)}`}
                        disabled={isActionPending}
                        items={[
                          {
                            icon: Eye,
                            id: 'view',
                            label: 'Xem chi tiết',
                            onSelect: () => onView(framework),
                            tone: 'primary',
                          },
                          ...(onEdit
                            ? [
                                {
                                  icon: Edit,
                                  id: 'edit',
                                  label: 'Sửa khung đánh giá',
                                  onSelect: () => onEdit(framework),
                                  tone: 'primary' as const,
                                },
                              ]
                            : []),
                          ...(framework.isActive
                            ? onDeactivate
                              ? [
                                  {
                                    icon: XCircle,
                                    id: 'deactivate',
                                    label: 'Vô hiệu hóa',
                                    onSelect: () => onDeactivate(framework),
                                    tone: 'danger' as const,
                                  },
                                ]
                              : []
                            : onActivate
                              ? [
                                  {
                                    icon: CheckCircle2,
                                    id: 'activate',
                                    label: 'Kích hoạt',
                                    onSelect: () => onActivate(framework),
                                    tone: 'primary' as const,
                                  },
                                ]
                              : []),
                          ...(onDelete
                            ? [
                                {
                                  icon: Trash2,
                                  id: 'delete',
                                  label: 'Xóa framework',
                                  onSelect: () => onDelete(framework),
                                  tone: 'danger' as const,
                                },
                              ]
                            : []),
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {footer}
    </section>
  )
}
