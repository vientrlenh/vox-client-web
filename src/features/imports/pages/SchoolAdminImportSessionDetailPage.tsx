import { useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  FileSpreadsheet,
  RefreshCw,
  Rows3,
} from 'lucide-react'
import { Link, useParams } from 'react-router'
import {
  useImportRowsQuery,
  useImportSessionQuery,
} from '../api/useImportSessionsQuery'
import type { ImportDataEntry, ImportMappingEntry, ImportRow } from '../types'
import {
  formatImportDate,
  formatNullableText,
  getImportStatusDisplay,
  getImportTypeDisplay,
} from '../types'

const DEFAULT_ROW_PAGE = 1
const DEFAULT_ROW_PAGE_SIZE = 10

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

type StatusBadgeProps = {
  status?: string | null
}

function StatusBadge({ status }: StatusBadgeProps) {
  const display = getImportStatusDisplay(status)

  return (
    <span
      className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-black ${display.className}`}
    >
      {display.label}
    </span>
  )
}

type StatCardProps = {
  label: string
  value: number
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </div>
  )
}

function DataEntryList({ entries }: { entries: ImportDataEntry[] }) {
  if (!entries.length) {
    return <span className="text-sm font-semibold text-slate-500">-</span>
  }

  return (
    <div className="grid min-w-72 gap-2">
      {entries.map((entry) => (
        <div
          className="grid grid-cols-[120px_minmax(0,1fr)] gap-3 text-xs"
          key={`${entry.key}-${entry.value}`}
        >
          <span className="truncate font-black text-slate-500">
            {entry.key}
          </span>
          <span className="min-w-0 truncate font-semibold text-slate-800">
            {formatNullableText(entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

function MappingList({ mappings }: { mappings: ImportMappingEntry[] }) {
  if (!mappings.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm font-semibold text-slate-500">
        Chưa có mapping.
      </div>
    )
  }

  return (
    <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-4">
      {mappings.map((mapping) => (
        <div
          className="grid gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
          key={`${mapping.originalHeader}-${mapping.systemField}`}
        >
          <span className="truncate font-bold text-slate-700">
            {mapping.originalHeader}
          </span>
          <span className="truncate font-mono text-xs font-bold text-cyan-700">
            {mapping.systemField}
          </span>
        </div>
      ))}
    </div>
  )
}

type RowsTableProps = {
  errorMessage?: string
  isError: boolean
  isLoading: boolean
  onRetry: () => void
  rows: ImportRow[]
}

function RowsTable({
  errorMessage,
  isError,
  isLoading,
  onRetry,
  rows,
}: RowsTableProps) {
  if (isLoading) {
    return (
      <div
        className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600"
        role="status"
      >
        Đang tải dòng import...
      </div>
    )
  }

  if (isError) {
    return (
      <div
        className="grid gap-4 rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700"
        role="alert"
      >
        <span>{errorMessage ?? 'Không thể tải dòng import.'}</span>
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

  if (!rows.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-base font-black text-slate-950">
          Không có dòng import
        </p>
        <p className="mt-2 text-sm font-medium text-slate-500">
          Đổi bộ lọc trạng thái để xem các dòng khác.
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
              <th className="px-4 py-3">Dòng</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Dữ liệu gốc</th>
              <th className="px-4 py-3">Dữ liệu map</th>
              <th className="px-4 py-3">Lỗi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr className="bg-white align-top" key={row.id}>
                <td className="px-4 py-4 text-sm font-black text-slate-950">
                  #{row.rowNumber}
                </td>
                <td className="px-4 py-4">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-4 py-4">
                  <DataEntryList entries={row.rawData} />
                </td>
                <td className="px-4 py-4">
                  <DataEntryList entries={row.mappedData} />
                </td>
                <td className="px-4 py-4">
                  {row.errors.length ? (
                    <div className="grid min-w-64 gap-2">
                      {row.errors.map((error) => (
                        <div
                          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
                          key={`${error.field}-${error.message}`}
                        >
                          {error.field ? `${error.field}: ` : ''}
                          {error.message}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm font-semibold text-slate-500">
                      -
                    </span>
                  )}
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
        {totalElements} dòng, trang {totalPages ? page : 0}/{totalPages}
      </span>
      <div className="flex items-center gap-2">
        <select
          aria-label="Số dòng mỗi trang"
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

export function SchoolAdminImportSessionDetailPage() {
  const { sessionId } = useParams()
  const [rowPage, setRowPage] = useState(DEFAULT_ROW_PAGE)
  const [rowPageSize, setRowPageSize] = useState(DEFAULT_ROW_PAGE_SIZE)
  const [rowStatus, setRowStatus] = useState('')
  const sessionQuery = useImportSessionQuery(sessionId ?? null)
  const rowsQuery = useImportRowsQuery(
    sessionId ?? null,
    rowPage,
    rowPageSize,
    rowStatus,
  )
  const session = sessionQuery.data
  const rows = rowsQuery.data?.content ?? []

  function handleRowPageSizeChange(nextPageSize: number) {
    setRowPage(DEFAULT_ROW_PAGE)
    setRowPageSize(nextPageSize)
  }

  if (!sessionId) {
    return (
      <section className="grid gap-4">
        <Link
          className="inline-flex w-fit items-center gap-2 text-sm font-bold text-cyan-700 transition hover:text-cyan-900"
          to="/school-admin/imports"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Quay lại danh sách import
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
          Không tìm thấy mã import trong đường dẫn.
        </div>
      </section>
    )
  }

  if (sessionQuery.isLoading) {
    return (
      <section className="grid gap-4">
        <Link
          className="inline-flex w-fit items-center gap-2 text-sm font-bold text-cyan-700 transition hover:text-cyan-900"
          to="/school-admin/imports"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Quay lại danh sách import
        </Link>
        <div
          className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600"
          role="status"
        >
          Đang tải thông tin import...
        </div>
      </section>
    )
  }

  if (sessionQuery.isError) {
    return (
      <section className="grid gap-4">
        <Link
          className="inline-flex w-fit items-center gap-2 text-sm font-bold text-cyan-700 transition hover:text-cyan-900"
          to="/school-admin/imports"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Quay lại danh sách import
        </Link>
        <div
          className="grid gap-4 rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700"
          role="alert"
        >
          <span>
            {getErrorMessage(sessionQuery.error) ??
              'Không thể tải thông tin import.'}
          </span>
          <button
            className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-bold text-white"
            onClick={() => {
              void sessionQuery.refetch()
            }}
            type="button"
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            Thử lại
          </button>
        </div>
      </section>
    )
  }

  if (!session) {
    return (
      <section className="grid gap-4">
        <Link
          className="inline-flex w-fit items-center gap-2 text-sm font-bold text-cyan-700 transition hover:text-cyan-900"
          to="/school-admin/imports"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Quay lại danh sách import
        </Link>
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-base font-black text-slate-950">
            Không tìm thấy file import
          </p>
        </div>
      </section>
    )
  }

  return (
    <section
      aria-labelledby="school-admin-import-detail-title"
      className="grid gap-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <nav
            aria-label="Đường dẫn"
            className="flex items-center gap-2 text-sm font-bold text-slate-500"
          >
            <Link className="transition hover:text-blue-800" to="/school-admin/imports">
              Quản lý import
            </Link>
            <span aria-hidden="true">/</span>
            <span>Chi tiết file</span>
          </nav>
          <h1
            className="mt-4 text-3xl font-black tracking-0 text-slate-950"
            id="school-admin-import-detail-title"
          >
            Chi tiết file import
          </h1>
          <p className="mt-3 text-sm font-medium text-slate-500">
            Xem mapping, kết quả xử lý và từng dòng dữ liệu trong file import.
          </p>
        </div>
        <Link
          className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 text-sm font-black text-slate-800 shadow-sm shadow-slate-950/5 transition hover:bg-slate-50"
          to="/school-admin/imports"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Quay lại
        </Link>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
          <div className="inline-flex size-24 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-cyan-700">
            <FileSpreadsheet aria-hidden="true" className="size-11" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-black tracking-0 text-slate-950">
              {session.fileName}
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="min-w-42 border-slate-200 md:border-r md:pr-10">
                <p className="text-xs font-bold text-slate-500">Loại import</p>
                <p className="mt-2 text-base font-black text-slate-950">
                  {getImportTypeDisplay(session.type)}
                </p>
              </div>
              <div className="min-w-42 border-slate-200 md:border-r md:px-10">
                <p className="text-xs font-bold text-slate-500">Trạng thái</p>
                <div className="mt-2">
                  <StatusBadge status={session.status} />
                </div>
              </div>
              <div className="min-w-42 md:pl-10">
                <p className="text-xs font-bold text-slate-500">Ngày tạo</p>
                <p className="mt-2 text-base font-black text-slate-950">
                  {formatImportDate(session.createdAt)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <StatCard label="Tổng dòng" value={session.totalRows} />
        <StatCard label="Hợp lệ" value={session.validRows} />
        <StatCard label="Không hợp lệ" value={session.invalidRows} />
        <StatCard label="Đã import" value={session.importedRows} />
        <StatCard label="Bỏ qua" value={session.skippedRows} />
      </div>

      {session.failureReason ? (
        <div
          className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"
          role="alert"
        >
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <span>{session.failureReason}</span>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="grid gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 aria-hidden="true" className="size-5 text-cyan-700" />
            <h2 className="text-lg font-black text-slate-950">
              Mapping đã xác nhận
            </h2>
          </div>
          <MappingList mappings={session.confirmedMapping} />
        </section>
        <section className="grid gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays aria-hidden="true" className="size-5 text-cyan-700" />
            <h2 className="text-lg font-black text-slate-950">Thông tin phụ</h2>
          </div>
          <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm">
            <div className="grid gap-1">
              <span className="font-bold text-slate-500">Import ID</span>
              <span className="break-all font-mono text-xs font-bold text-slate-800">
                {session.id}
              </span>
            </div>
            <div className="grid gap-1">
              <span className="font-bold text-slate-500">Hết hạn</span>
              <span className="font-semibold text-slate-800">
                {formatImportDate(session.expiresAt)}
              </span>
            </div>
            <div className="grid gap-1">
              <span className="font-bold text-slate-500">Cập nhật</span>
              <span className="font-semibold text-slate-800">
                {formatImportDate(session.updatedAt)}
              </span>
            </div>
          </div>
        </section>
      </div>

      <section className="grid gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Rows3 aria-hidden="true" className="size-5 text-cyan-700" />
            <h2 className="text-lg font-black text-slate-950">
              Dòng dữ liệu
            </h2>
          </div>
          <label className="grid gap-2 text-sm font-bold text-slate-700 sm:w-56">
            Trạng thái dòng
            <select
              className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              onChange={(event) => {
                setRowPage(DEFAULT_ROW_PAGE)
                setRowStatus(event.target.value)
              }}
              value={rowStatus}
            >
              <option value="">Tất cả</option>
              <option value="PENDING">Đang chờ</option>
              <option value="VALID">Hợp lệ</option>
              <option value="INVALID">Không hợp lệ</option>
              <option value="IMPORTED">Đã import</option>
              <option value="SKIPPED">Bỏ qua</option>
            </select>
          </label>
        </div>

        <RowsTable
          errorMessage={getErrorMessage(rowsQuery.error)}
          isError={rowsQuery.isError}
          isLoading={rowsQuery.isLoading}
          onRetry={() => {
            void rowsQuery.refetch()
          }}
          rows={rows}
        />
        <Pagination
          isDisabled={rowsQuery.isLoading || rowsQuery.isError}
          onPageChange={setRowPage}
          onPageSizeChange={handleRowPageSizeChange}
          page={rowPage}
          pageSize={rowPageSize}
          totalElements={rowsQuery.data?.totalElements ?? 0}
          totalPages={rowsQuery.data?.totalPages ?? 0}
        />
      </section>
    </section>
  )
}
