import { useMemo, useState } from 'react'
import { RefreshCw, Search } from 'lucide-react'
import { useNavigate } from 'react-router'
import { useAppSelector } from '@/app/store/hooks'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { useMyClassesQuery } from '../api/useMyClassesQuery'
import type { MyClass, MyClassFilters, RelatedClassObject } from '../types'
import { formatClassDate, getClassStatusDisplay } from '../types'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10
const SEARCH_DEBOUNCE_MS = 300
const EMPTY_FILTERS: MyClassFilters = {
  search: '',
  status: '',
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

function getRelatedLabel(value?: RelatedClassObject | null) {
  return value?.name?.trim() || value?.code?.trim() || '-'
}

type ClassTableProps = {
  classes: MyClass[]
  errorMessage?: string
  isError: boolean
  isLoading: boolean
  onRetry: () => void
  onView: (schoolClass: MyClass) => void
}

function ClassTable({
  classes,
  errorMessage,
  isError,
  isLoading,
  onRetry,
  onView,
}: ClassTableProps) {
  if (isLoading) {
    return (
      <div
        className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600"
        role="status"
      >
        Đang tải danh sách lớp học...
      </div>
    )
  }

  if (isError) {
    return (
      <div
        className="grid gap-4 rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700"
        role="alert"
      >
        <span>{errorMessage ?? 'Không thể tải danh sách lớp học.'}</span>
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

  if (!classes.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-base font-black text-slate-950">
          Chưa có lớp học nào
        </p>
        <p className="mt-2 text-sm font-medium text-slate-500">
          Bạn chưa được thêm vào lớp nào, hoặc không có lớp khớp bộ lọc hiện tại.
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
              <th className="px-4 py-3">Lớp học</th>
              <th className="px-4 py-3">Niên học</th>
              <th className="px-4 py-3">Ngôn ngữ</th>
              <th className="px-4 py-3">Sĩ số</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Ngày tạo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {classes.map((schoolClass) => {
              const status = getClassStatusDisplay(schoolClass.status)

              return (
                <tr
                  className="cursor-pointer bg-white transition hover:bg-cyan-50/60"
                  key={schoolClass.id}
                  onClick={() => onView(schoolClass)}
                >
                  <td className="px-4 py-4">
                    <button
                      className="grid text-left"
                      onClick={(event) => {
                        event.stopPropagation()
                        onView(schoolClass)
                      }}
                      type="button"
                    >
                      <span className="text-sm font-black text-slate-950">
                        {schoolClass.name}
                      </span>
                      <span className="mt-1 text-xs font-bold text-slate-500">
                        {schoolClass.code}
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold text-slate-600">
                    {getRelatedLabel(schoolClass.schoolGrade)}
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold text-slate-600">
                    {getRelatedLabel(schoolClass.language)}
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold text-slate-600">
                    {schoolClass.activeMemberCount}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold text-slate-600">
                    {formatClassDate(schoolClass.createdAt)}
                  </td>
                </tr>
              )
            })}
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
        {totalElements} lớp học, trang {totalPages ? page : 0}/{totalPages}
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

export function TeacherMyClassesPage() {
  const navigate = useNavigate()
  const schoolId = useAppSelector((state) => state.auth.user?.schoolId) ?? ''
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [filters, setFilters] = useState<MyClassFilters>(EMPTY_FILTERS)

  // Gõ tới đâu bắn request tới đó thì mỗi ký tự là một round-trip; queryKey chứa
  // từ khoá nên phải chặn ở đây chứ không chặn được ở tầng query.
  const debouncedSearch = useDebouncedValue(filters.search, SEARCH_DEBOUNCE_MS)
  const appliedFilters = useMemo<MyClassFilters>(
    () => ({ ...filters, search: debouncedSearch }),
    [debouncedSearch, filters],
  )

  const classesQuery = useMyClassesQuery(
    schoolId,
    page,
    pageSize,
    appliedFilters,
  )
  const classes = classesQuery.data?.content ?? []

  function handleFilterChange(name: keyof MyClassFilters, value: string) {
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

  function openClassDetail(schoolClass: MyClass) {
    navigate(`/teacher/classes/${schoolClass.id}`)
  }

  if (!schoolId) {
    return (
      <section className="grid gap-4">
        <h1 className="text-3xl font-black tracking-0 text-slate-950">
          Lớp của tôi
        </h1>
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          role="alert"
        >
          Chưa xác định được trường học hiện tại. Vui lòng đăng nhập lại.
        </div>
      </section>
    )
  }

  return (
    <section aria-labelledby="teacher-my-classes-title" className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-cyan-700">Lớp học</p>
          <h1
            className="mt-2 text-3xl font-black tracking-0 text-slate-950"
            id="teacher-my-classes-title"
          >
            Lớp của tôi
          </h1>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-600">
            Danh sách các lớp bạn đang có mặt. Chọn một lớp để xem thông tin chi
            tiết và danh sách thành viên.
          </p>
        </div>
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          disabled={classesQuery.isFetching}
          onClick={() => {
            void classesQuery.refetch()
          }}
          type="button"
        >
          <RefreshCw aria-hidden="true" className="size-4" />
          Làm mới
        </button>
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[minmax(200px,1fr)_200px]">
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Tìm kiếm
          <span className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            />
            <input
              className="h-11 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              onChange={(event) =>
                handleFilterChange('search', event.target.value)
              }
              placeholder="Mã lớp hoặc tên lớp"
              type="search"
              value={filters.search}
            />
          </span>
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
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Tạm dừng</option>
            <option value="ARCHIVED">Đã lưu trữ</option>
          </select>
        </label>
      </div>

      <div className="grid h-fit gap-4">
        <ClassTable
          classes={classes}
          errorMessage={getErrorMessage(classesQuery.error)}
          isError={classesQuery.isError}
          isLoading={classesQuery.isLoading}
          onRetry={() => {
            void classesQuery.refetch()
          }}
          onView={openClassDetail}
        />
        <Pagination
          isDisabled={classesQuery.isLoading || classesQuery.isError}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          page={page}
          pageSize={pageSize}
          totalElements={classesQuery.data?.totalElements ?? 0}
          totalPages={classesQuery.data?.totalPages ?? 0}
        />
      </div>
    </section>
  )
}
