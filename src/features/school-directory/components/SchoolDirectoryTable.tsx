import type { ReactNode } from 'react'
import { Eye } from 'lucide-react'
import type { SchoolDirectory } from '../types'
import { formatNullableText } from '../types'
import { SchoolDirectoryVerifiedBadge } from './SchoolDirectoryVerifiedBadge'

type SchoolDirectoryTableProps = {
  directories: SchoolDirectory[]
  errorMessage?: string
  footer?: ReactNode
  isError: boolean
  isLoading: boolean
  onRetry: () => void
  onView: (directory: SchoolDirectory) => void
  selectedId: string | null
}

export function SchoolDirectoryTable({
  directories,
  errorMessage,
  footer,
  isError,
  isLoading,
  onRetry,
  onView,
  selectedId,
}: SchoolDirectoryTableProps) {
  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-lg font-black text-blue-950">Danh sách trường</h2>
      </div>

      {isLoading ? (
        <div className="flex min-h-80 flex-1 items-center justify-center px-6 py-12 text-sm font-bold text-slate-500">
          Đang tải danh mục trường...
        </div>
      ) : null}

      {isError ? (
        <div className="flex min-h-80 flex-1 flex-col items-center justify-center px-6 py-12 text-center">
          <p className="text-sm font-bold text-red-600">
            {errorMessage ?? 'Không thể tải danh mục trường.'}
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

      {!isLoading && !isError && directories.length === 0 ? (
        <div className="flex min-h-80 flex-1 items-center justify-center px-6 py-12 text-sm font-bold text-slate-500">
          Chưa có trường nào trong danh mục
        </div>
      ) : null}

      {!isLoading && !isError && directories.length > 0 ? (
        <div className="min-h-80 flex-1 overflow-x-auto">
          <table className="w-full min-w-220 border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-black text-blue-950">
                <th className="px-6 py-4">Mã</th>
                <th className="px-4 py-4">Tên trường</th>
                <th className="px-4 py-4">Tỉnh / Thành</th>
                <th className="px-4 py-4">Quận / Huyện</th>
                <th className="px-4 py-4">Domain</th>
                <th className="px-4 py-4">Xác minh</th>
                <th className="px-4 py-4 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {directories.map((directory) => {
                const isSelected = directory.id === selectedId

                return (
                  <tr
                    className={[
                      'border-b border-slate-100 align-top text-sm text-blue-950 last:border-b-0',
                      isSelected ? 'bg-indigo-50/50' : 'bg-white',
                    ].join(' ')}
                    key={directory.id}
                  >
                    <td className="px-6 py-5">
                      <span className="font-mono text-sm font-black uppercase">
                        {formatNullableText(directory.code)}
                      </span>
                    </td>
                    <td className="px-4 py-5 font-bold">
                      {formatNullableText(directory.name)}
                    </td>
                    <td className="px-4 py-5 text-sm font-semibold text-slate-600">
                      {formatNullableText(directory.provinceName)}
                    </td>
                    <td className="px-4 py-5 text-sm font-semibold text-slate-600">
                      {formatNullableText(directory.districtName)}
                    </td>
                    <td className="px-4 py-5 text-sm font-semibold text-slate-600">
                      {formatNullableText(directory.domain)}
                    </td>
                    <td className="px-4 py-5">
                      <SchoolDirectoryVerifiedBadge
                        verified={directory.verified}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-center">
                        <button
                          aria-label={`Xem chi tiết ${formatNullableText(
                            directory.name,
                          )}`}
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50"
                          onClick={() => onView(directory)}
                          type="button"
                        >
                          <Eye aria-hidden="true" className="size-4" />
                          Xem
                        </button>
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
