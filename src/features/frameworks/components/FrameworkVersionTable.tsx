import type { ReactNode } from 'react'
import { Archive, BadgeCheck, Eye, Trash2 } from 'lucide-react'
import { ActionMenuButton } from '@/shared/ui/ActionMenuButton'
import type { FrameworkVersion } from '../types'
import { formatFrameworkDate, formatNullableText } from '../types'
import { FrameworkVersionStatusBadge } from './FrameworkVersionStatusBadge'

type FrameworkVersionTableProps = {
  errorMessage?: string
  footer?: ReactNode
  isActionPending?: boolean
  isError: boolean
  isLoading: boolean
  onArchive?: (version: FrameworkVersion) => void
  onDelete?: (version: FrameworkVersion) => void
  onPublish?: (version: FrameworkVersion) => void
  onRetry: () => void
  onView: (version: FrameworkVersion) => void
  versions: FrameworkVersion[]
}

export function FrameworkVersionTable({
  errorMessage,
  footer,
  isActionPending = false,
  isError,
  isLoading,
  onArchive,
  onDelete,
  onPublish,
  onRetry,
  onView,
  versions,
}: FrameworkVersionTableProps) {
  return (
    <div className="flex min-w-0 flex-col overflow-hidden">
      {isLoading ? (
        <div className="flex min-h-60 flex-1 items-center justify-center px-6 py-12 text-sm font-bold text-slate-500">
          Đang tải danh sách phiên bản...
        </div>
      ) : null}

      {isError ? (
        <div className="flex min-h-60 flex-1 flex-col items-center justify-center px-6 py-12 text-center">
          <p className="text-sm font-bold text-red-600">
            {errorMessage ?? 'Không thể tải danh sách phiên bản.'}
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

      {!isLoading && !isError && versions.length === 0 ? (
        <div className="flex min-h-60 flex-1 items-center justify-center px-6 py-12 text-sm font-bold text-slate-500">
          Chưa có phiên bản
        </div>
      ) : null}

      {!isLoading && !isError && versions.length > 0 ? (
        <div className="min-h-60 flex-1 overflow-x-auto">
          <table className="w-full min-w-160 border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-black text-blue-950">
                <th className="px-6 py-4">Tên phiên bản</th>
                <th className="px-4 py-4">Trạng thái</th>
                <th className="px-4 py-4">Ngày tạo</th>
                <th className="px-4 py-4">Cập nhật</th>
                <th className="px-4 py-4 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((version) => (
                <tr
                  className="border-b border-slate-100 bg-white align-top text-sm text-blue-950 last:border-b-0"
                  key={version.id}
                >
                  <td className="px-6 py-5 font-bold">
                    {formatNullableText(version.name)}
                  </td>
                  <td className="px-4 py-5">
                    <FrameworkVersionStatusBadge status={version.status} />
                  </td>
                  <td className="px-4 py-5 text-sm font-semibold text-slate-600">
                    {formatFrameworkDate(version.createdAt)}
                  </td>
                  <td className="px-4 py-5 text-sm font-semibold text-slate-600">
                    {formatFrameworkDate(version.updatedAt)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-center">
                      <ActionMenuButton
                        ariaLabel={`Mở hành động cho ${formatNullableText(version.name)}`}
                        disabled={isActionPending}
                        items={[
                          {
                            icon: Eye,
                            id: 'view',
                            label: 'Xem chi tiết',
                            onSelect: () => onView(version),
                            tone: 'primary',
                          },
                          ...(version.status === 'DRAFT' && onPublish
                            ? [
                                {
                                  icon: BadgeCheck,
                                  id: 'publish',
                                  label: 'Xuất bản',
                                  onSelect: () => onPublish(version),
                                  tone: 'primary' as const,
                                },
                              ]
                            : []),
                          ...(version.status === 'PUBLISHED'
                            ? onArchive
                              ? [
                                  {
                                    icon: Archive,
                                    id: 'archive',
                                    label: 'Lưu trữ',
                                    onSelect: () => onArchive(version),
                                    tone: 'danger' as const,
                                  },
                                ]
                              : []
                            : onDelete
                              ? [
                                  {
                                    disabled: version.status !== 'DRAFT',
                                    icon: Trash2,
                                    id: 'delete',
                                    label: 'Xóa phiên bản',
                                    onSelect: () => onDelete(version),
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
    </div>
  )
}
