import type { ReactNode } from 'react'
import { Eye, Lock, Unlock } from 'lucide-react'
import type { School } from '../types'

type SchoolTableProps = {
  errorMessage?: string
  footer?: ReactNode
  isError: boolean
  isLoading: boolean
  onChangeStatus?: (school: School) => void
  onRetry: () => void
  onView?: (school: School) => void
  schools: School[]
  updatingId: string | null
}

export function SchoolTable({
  errorMessage,
  footer,
  isError,
  isLoading,
  onChangeStatus,
  onRetry,
  onView,
  schools,
  updatingId,
}: SchoolTableProps) {
  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-lg font-black text-blue-950">Danh sách trường</h2>
      </div>

      {isLoading ? (
        <div className="flex min-h-80 flex-1 items-center justify-center px-6 py-12 text-sm font-bold text-slate-500">
          Đang tải danh sách trường học...
        </div>
      ) : null}

      {isError ? (
        <div className="flex min-h-80 flex-1 flex-col items-center justify-center px-6 py-12 text-center">
          <p className="text-sm font-bold text-red-600">
            {errorMessage ?? 'Không thể tải danh sách trường.'}
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

      {!isLoading && !isError && schools.length === 0 ? (
        <div className="flex min-h-80 flex-1 items-center justify-center px-6 py-12 text-sm font-bold text-slate-500">
          Không tìm thấy trường học nào.
        </div>
      ) : null}

      {!isLoading && !isError && schools.length > 0 ? (
        <div className="min-h-80 flex-1 overflow-x-auto">
          <table className="w-full min-w-220 border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-black text-blue-950">
                <th className="px-6 py-4">Mã trường</th>
                <th className="px-4 py-4">Tên trường</th>
                <th className="px-4 py-4">Liên hệ</th>
                <th className="px-4 py-4">Học sinh</th>
                <th className="px-4 py-4">Trạng thái</th>
                <th className="px-4 py-4 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {schools.map((school) => {
                const schoolLabel = school.name || school.code
                const isUpdating = updatingId === school.id

                return (
                  <tr
                    className="border-b border-slate-100 bg-white align-top text-sm text-blue-950 last:border-b-0"
                    key={school.id}
                  >
                    <td className="px-6 py-5">
                      <span className="font-mono text-sm font-black uppercase">
                        {school.code}
                      </span>
                    </td>
                    <td className="px-4 py-5">
                      <p className="font-bold">{school.name || 'Chưa có tên'}</p>
                      <p className="mt-0.5 max-w-xs truncate text-xs font-semibold text-slate-600">
                        {school.address || 'Chưa cập nhật địa chỉ'}
                      </p>
                    </td>
                    <td className="px-4 py-5 text-sm font-semibold text-slate-600">
                      <p>{school.contactEmail || 'Chưa cập nhật'}</p>
                      <p className="mt-0.5 text-xs">
                        {school.contactPhone || 'Chưa cập nhật'}
                      </p>
                    </td>
                    <td className="px-4 py-5 font-bold">
                      {school.studentCount || 0}
                    </td>
                    <td className="px-4 py-5">
                      <span
                        className={[
                          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset',
                          school.isActive
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                            : 'bg-red-50 text-red-700 ring-red-600/20',
                        ].join(' ')}
                      >
                        {school.isActive ? (
                          <Unlock aria-hidden="true" className="size-3.5" />
                        ) : (
                          <Lock aria-hidden="true" className="size-3.5" />
                        )}
                        {school.isActive ? 'Hoạt động' : 'Đã khóa'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          aria-label={`Xem chi tiết ${schoolLabel}`}
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50"
                          onClick={() => onView?.(school)}
                          type="button"
                        >
                          <Eye aria-hidden="true" className="size-4" />
                          Xem
                        </button>
                        <button
                          aria-label={`${school.isActive ? 'Khóa' : 'Kích hoạt'} trường ${schoolLabel}`}
                          className={[
                            'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border bg-white px-3 text-xs font-bold transition disabled:cursor-wait disabled:opacity-70',
                            school.isActive
                              ? 'border-red-200 text-red-700 hover:bg-red-50'
                              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
                          ].join(' ')}
                          disabled={isUpdating}
                          onClick={() => onChangeStatus?.(school)}
                          type="button"
                        >
                          {school.isActive ? (
                            <Lock aria-hidden="true" className="size-4" />
                          ) : (
                            <Unlock aria-hidden="true" className="size-4" />
                          )}
                          {school.isActive ? 'Khóa' : 'Kích hoạt'}
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
