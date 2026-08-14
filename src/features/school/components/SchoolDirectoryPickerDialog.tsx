import { useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { toApiError } from '@/shared/api'
import { useSchoolDirectoriesQuery } from '@/features/school-directory/api/useSchoolDirectoriesQuery'
import { SchoolDirectoryVerifiedBadge } from '@/features/school-directory/components/SchoolDirectoryVerifiedBadge'
import { formatNullableText } from '@/features/school-directory/types'
import type { SchoolDirectory } from '@/features/school-directory/types'

const PAGE_SIZE = 10

type SchoolDirectoryPickerDialogProps = {
  onClose: () => void
  onSelect: (directory: SchoolDirectory) => void
}

/**
 * Chọn một trường trong danh mục hệ thống để tạo trường từ đó.
 *
 * <p>Chỉ lật trang được, không tìm kiếm: query `schoolDirectoryPage(page, size)` ở backend chưa
 * nhận tham số từ khoá. Khi backend bổ sung, thêm ô tìm kiếm vào đây là đủ.
 *
 * <p>Không tự nhận cờ đóng/mở: bên gọi render có điều kiện, để danh mục chỉ được nạp khi người
 * dùng thực sự mở hộp thoại chứ không phải mỗi lần vào trang tạo trường.
 */
export function SchoolDirectoryPickerDialog({
  onClose,
  onSelect,
}: SchoolDirectoryPickerDialogProps) {
  const [page, setPage] = useState(1)
  const directoriesQuery = useSchoolDirectoriesQuery(page, PAGE_SIZE)

  const directories = directoriesQuery.data?.content ?? []
  const totalPages = directoriesQuery.data?.totalPages ?? 0
  const safeTotalPages = Math.max(totalPages, 1)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        aria-label="Đóng danh mục trường"
        className="absolute inset-0 bg-slate-950/45"
        onClick={onClose}
        type="button"
      />

      <section
        aria-labelledby="school-directory-picker-title"
        aria-modal="true"
        className="relative flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h2
              className="text-lg font-black text-blue-950"
              id="school-directory-picker-title"
            >
              Chọn trường từ danh mục
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Mã, tên, địa chỉ và domain sẽ được lấy từ danh mục, không nhập tay.
            </p>
          </div>
          <button
            aria-label="Đóng"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="min-h-72 flex-1 overflow-y-auto">
          {directoriesQuery.isLoading ? (
            <div className="flex min-h-72 items-center justify-center px-6 py-12 text-sm font-bold text-slate-500">
              Đang tải danh mục trường...
            </div>
          ) : null}

          {directoriesQuery.isError ? (
            <div className="flex min-h-72 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
              <p className="text-sm font-bold text-red-600">
                {toApiError(directoriesQuery.error).message}
              </p>
              <button
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
                onClick={() => {
                  void directoriesQuery.refetch()
                }}
                type="button"
              >
                Thử lại
              </button>
            </div>
          ) : null}

          {!directoriesQuery.isLoading &&
          !directoriesQuery.isError &&
          directories.length === 0 ? (
            <div className="flex min-h-72 items-center justify-center px-6 py-12 text-sm font-bold text-slate-500">
              Chưa có trường nào trong danh mục.
            </div>
          ) : null}

          {directories.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {directories.map((directory) => (
                <li
                  className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                  key={directory.id}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-sm font-black uppercase text-blue-950">
                        {formatNullableText(directory.code)}
                      </span>
                      <SchoolDirectoryVerifiedBadge
                        verified={directory.verified}
                      />
                    </div>
                    <p className="mt-1 text-sm font-bold text-blue-950">
                      {formatNullableText(directory.name)}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-600">
                      {formatNullableText(directory.provinceName)}
                      {directory.districtName
                        ? ` · ${directory.districtName}`
                        : ''}
                      {directory.domain ? ` · ${directory.domain}` : ''}
                    </p>
                  </div>
                  <button
                    className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50"
                    onClick={() => onSelect(directory)}
                    type="button"
                  >
                    Chọn
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-6 py-4 text-sm text-blue-950">
          <span>Tổng {directoriesQuery.data?.totalElements ?? 0} trường</span>
          <div className="flex items-center gap-3">
            <button
              aria-label="Trang trước"
              className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-blue-950 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={directoriesQuery.isLoading || page <= 1}
              onClick={() => setPage((current) => current - 1)}
              type="button"
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
            </button>
            <span>
              Trang {page} / {safeTotalPages}
            </span>
            <button
              aria-label="Trang sau"
              className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-blue-950 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={directoriesQuery.isLoading || page >= safeTotalPages}
              onClick={() => setPage((current) => current + 1)}
              type="button"
            >
              <ChevronRight aria-hidden="true" className="size-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
