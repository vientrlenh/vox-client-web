import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Eye, RefreshCw, Upload } from 'lucide-react'
import { useNavigate } from 'react-router'
import { ActionMenuButton } from '@/shared/ui/ActionMenuButton'
import { useImportSessionsQuery } from '../api/useImportSessionsQuery'
import type { ImportSessionFilters, ImportSessionSummary } from '../types'
import {
  formatImportDate,
  getImportResultCounts,
  getImportStatusDisplay,
  getImportTypeDisplay,
} from '../types'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10
const EMPTY_FILTERS: ImportSessionFilters = {
  status: '',
  type: '',
}

function getErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }

  return undefined
}

type ImportStatusBadgeProps = {
  status: string
}

function ImportStatusBadge({ status }: ImportStatusBadgeProps) {
  const display = getImportStatusDisplay(status)

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${display.className}`}
    >
      {display.label}
    </span>
  )
}

type ImportSessionsTableProps = {
  errorMessage?: string
  isError: boolean
  isLoading: boolean
  onRetry: () => void
  onView: (session: ImportSessionSummary) => void
  sessions: ImportSessionSummary[]
}

function ImportSessionsTable({
  errorMessage,
  isError,
  isLoading,
  onRetry,
  onView,
  sessions,
}: ImportSessionsTableProps) {
  if (isLoading) {
    return (
      <div
        className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600"
        role="status"
      >
        Đang tải danh sách file import...
      </div>
    )
  }

  if (isError) {
    return (
      <div
        className="grid gap-4 rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700"
        role="alert"
      >
        <span>{errorMessage ?? 'Không thể tải danh sách file import.'}</span>
        <button
          className="inline-flex h-10 w-fit items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-bold text-white"
          onClick={onRetry}
          type="button"
        >
          Thử lại
        </button>
      </div>
    )
  }

  if (!sessions.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-base font-black text-slate-950">
          Chưa có file import
        </p>
        <p className="mt-2 text-sm font-medium text-slate-500">
          Tạo import mới hoặc điều chỉnh bộ lọc để xem lại lịch sử import.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left">
          <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">File</th>
              <th className="px-4 py-3">Loại</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Dòng</th>
              <th className="px-4 py-3">Kết quả</th>
              <th className="px-4 py-3">Ngày tạo</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sessions.map((session) => (
              <tr className="bg-white" key={session.id}>
                <td className="max-w-72 px-4 py-4">
                  <div className="grid">
                    <span className="truncate text-sm font-black text-slate-950">
                      {session.fileName}
                    </span>
                    <span className="mt-1 truncate font-mono text-xs font-semibold text-slate-500">
                      {session.id}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4 text-sm font-semibold text-slate-700">
                  {getImportTypeDisplay(session.type)}
                </td>
                <td className="px-4 py-4">
                  <ImportStatusBadge status={session.status} />
                </td>
                <td className="px-4 py-4 text-sm font-semibold text-slate-600">
                  {session.totalRows}
                </td>
                <td className="px-4 py-4 text-sm font-semibold text-slate-600">
                  {(() => {
                    const result = getImportResultCounts(session)
                    return `${result.added} thêm / ${result.updated} cập nhật / ${result.invalid} lỗi`
                  })()}
                </td>
                <td className="px-4 py-4 text-sm font-semibold text-slate-600">
                  {formatImportDate(session.createdAt)}
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end">
                    <ActionMenuButton
                      ariaLabel={`Mở thao tác file ${session.fileName}`}
                      items={[
                        {
                          icon: Eye,
                          id: 'view',
                          label: 'Xem chi tiết',
                          onSelect: () => onView(session),
                          tone: 'primary',
                        },
                      ]}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

type PaginationProps = {
  isDisabled: boolean
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  page: number
  pageSize: number
  totalElements: number
  totalPages: number
}

function Pagination({
  isDisabled,
  onPageChange,
  onPageSizeChange,
  page,
  pageSize,
  totalElements,
  totalPages,
}: PaginationProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <span>
        {totalElements} file import, trang {totalPages ? page : 0}/{totalPages}
      </span>
      <div className="flex items-center gap-2">
        <select
          aria-label="Số file mỗi trang"
          className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700"
          disabled={isDisabled}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          value={pageSize}
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
        <button
          className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 disabled:opacity-50"
          disabled={isDisabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
          type="button"
        >
          Trước
        </button>
        <button
          className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 disabled:opacity-50"
          disabled={isDisabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          type="button"
        >
          Sau
        </button>
      </div>
    </div>
  )
}

type ImportTypeOption = {
  label: string
  to: string
}

const IMPORT_TYPE_OPTIONS: ImportTypeOption[] = [
  { label: 'Lớp học', to: '/school-admin/classes/import' },
  { label: 'Học viên trong lớp', to: '/school-admin/classes/users/import' },
  { label: 'Người dùng', to: '/school-admin/students/import' },
]

type ImportTypeMenuProps = {
  onSelect: (to: string) => void
}

function ImportTypeMenu({ onSelect }: ImportTypeMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node | null

      if (target && containerRef.current?.contains(target)) {
        return
      }

      setIsOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-4 text-sm font-bold text-cyan-800 transition hover:bg-cyan-100"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <Upload aria-hidden="true" className="size-4" />
        Import
        <ChevronDown aria-hidden="true" className="size-4" />
      </button>
      {isOpen ? (
        <div
          className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-1 shadow-lg shadow-slate-950/10"
          role="menu"
        >
          {IMPORT_TYPE_OPTIONS.map((option) => (
            <button
              className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              key={option.to}
              onClick={() => {
                setIsOpen(false)
                onSelect(option.to)
              }}
              role="menuitem"
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function SchoolAdminImportSessionsPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [filters, setFilters] = useState<ImportSessionFilters>(EMPTY_FILTERS)
  const sessionsQuery = useImportSessionsQuery(page, pageSize, filters)
  const sessions = sessionsQuery.data?.content ?? []

  function handleFilterChange(name: keyof ImportSessionFilters, value: string) {
    setFilters((current) => ({
      ...current,
      [name]: value,
    }))
    setPage(DEFAULT_PAGE)
  }

  function handlePageSizeChange(nextPageSize: number) {
    setPage(DEFAULT_PAGE)
    setPageSize(nextPageSize)
  }

  return (
    <section aria-labelledby="school-admin-imports-title" className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-cyan-700">
            Quản lý import
          </p>
          <h1
            className="mt-2 text-3xl font-black tracking-0 text-slate-950"
            id="school-admin-imports-title"
          >
            Danh sách file import
          </h1>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-600">
            Theo dõi lịch sử import, trạng thái xử lý và chi tiết từng dòng dữ
            liệu.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ImportTypeMenu onSelect={(to) => navigate(to)} />
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            disabled={sessionsQuery.isFetching}
            onClick={() => {
              void sessionsQuery.refetch()
            }}
            type="button"
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            Làm mới
          </button>
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Loại import
          <select
            className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
            onChange={(event) => handleFilterChange('type', event.target.value)}
            value={filters.type}
          >
            <option value="">Tất cả</option>
            <option value="SCHOOL_CLASS">Lớp học</option>
            <option value="SCHOOL_CLASS_USER">Học viên trong lớp</option>
            <option value="USER">Người dùng</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Trạng thái
          <select
            className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
            onChange={(event) =>
              handleFilterChange('status', event.target.value)
            }
            value={filters.status}
          >
            <option value="">Tất cả</option>
            <option value="PREVIEWED">Đang preview</option>
            <option value="COMPLETED">Hoàn tất</option>
            <option value="FAILED">Thất bại</option>
            <option value="CANCELLED">Đã hủy</option>
            <option value="EXPIRED">Hết hạn</option>
          </select>
        </label>
      </div>

      <div className="grid gap-4">
        <ImportSessionsTable
          errorMessage={getErrorMessage(sessionsQuery.error)}
          isError={sessionsQuery.isError}
          isLoading={sessionsQuery.isLoading}
          onRetry={() => {
            void sessionsQuery.refetch()
          }}
          onView={(session) => navigate(`/school-admin/imports/${session.id}`)}
          sessions={sessions}
        />
        <Pagination
          isDisabled={sessionsQuery.isLoading || sessionsQuery.isError}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          page={page}
          pageSize={pageSize}
          totalElements={sessionsQuery.data?.totalElements ?? 0}
          totalPages={sessionsQuery.data?.totalPages ?? 0}
        />
      </div>
    </section>
  )
}
