import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import type { SchoolDirectory } from '../types'
import { formatNullableText, formatSchoolDirectoryDate } from '../types'
import { SchoolDirectoryVerifiedBadge } from './SchoolDirectoryVerifiedBadge'

type SchoolDirectoryDetailDrawerProps = {
  directory: SchoolDirectory | null
  errorMessage?: string
  isError: boolean
  isLoading: boolean
  onClose: () => void
  onRetry: () => void
  open: boolean
}

type DetailRow = {
  label: string
  value: ReactNode
}

function DetailRows({ rows }: { rows: DetailRow[] }) {
  return (
    <dl className="grid gap-4">
      {rows.map((row) => (
        <div className="grid gap-1" key={row.label}>
          <dt className="text-xs font-bold uppercase text-slate-500">
            {row.label}
          </dt>
          <dd className="min-w-0 break-words text-sm font-bold text-blue-950">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function SchoolDirectoryDetailDrawer({
  directory,
  errorMessage,
  isError,
  isLoading,
  onClose,
  onRetry,
  open,
}: SchoolDirectoryDetailDrawerProps) {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <button
        aria-label="Đóng chi tiết trường bằng lớp phủ"
        className="absolute inset-0 bg-slate-950/45"
        onClick={onClose}
        type="button"
      />
      <aside
        aria-labelledby="school-directory-detail-title"
        aria-modal="true"
        className="absolute right-0 top-0 flex h-full w-full max-w-xl animate-[slideInRight_180ms_ease-out] flex-col overflow-hidden bg-white shadow-2xl shadow-slate-950/20"
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="min-w-0">
            <h2
              className="text-lg font-black text-blue-950"
              id="school-directory-detail-title"
            >
              Chi tiết trường
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Thông tin chi tiết của trường trong danh mục hệ thống.
            </p>
          </div>
          <button
            aria-label="Đóng chi tiết trường"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {isLoading ? (
            <div className="flex min-h-80 items-center justify-center text-sm font-bold text-slate-500">
              Đang tải chi tiết trường...
            </div>
          ) : null}

          {isError ? (
            <div className="flex min-h-80 flex-col items-center justify-center text-center">
              <p className="text-sm font-bold text-red-600">
                {errorMessage ?? 'Không thể tải chi tiết trường.'}
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

          {!isLoading && !isError && !directory ? (
            <div className="flex min-h-80 items-center justify-center text-center text-sm font-bold text-slate-500">
              Không tìm thấy trường.
            </div>
          ) : null}

          {!isLoading && !isError && directory ? (
            <div className="grid gap-6">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="font-mono text-sm font-black uppercase text-indigo-700">
                  {formatNullableText(directory.code)}
                </p>
                <p className="mt-1 text-xl font-black text-blue-950">
                  {formatNullableText(directory.name)}
                </p>
                <div className="mt-3">
                  <SchoolDirectoryVerifiedBadge verified={directory.verified} />
                </div>
              </div>

              <DetailRows
                rows={[
                  { label: 'ID', value: directory.id },
                  { label: 'Mã trường', value: formatNullableText(directory.code) },
                  { label: 'Tên trường', value: formatNullableText(directory.name) },
                  {
                    label: 'Mã tỉnh',
                    value: formatNullableText(directory.provinceCode),
                  },
                  {
                    label: 'Tỉnh / Thành',
                    value: formatNullableText(directory.provinceName),
                  },
                  {
                    label: 'Quận / Huyện',
                    value: formatNullableText(directory.districtName),
                  },
                  { label: 'Domain', value: formatNullableText(directory.domain) },
                  { label: 'Địa chỉ', value: formatNullableText(directory.address) },
                  {
                    label: 'Nguồn gốc',
                    value: formatNullableText(directory.origin),
                  },
                  {
                    label: 'Ngày tạo',
                    value: formatSchoolDirectoryDate(directory.createdAt),
                  },
                  {
                    label: 'Cập nhật lần cuối',
                    value: formatSchoolDirectoryDate(directory.updatedAt),
                  },
                ]}
              />
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  )
}
