import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Edit,
  Plus,
  RefreshCw,
  Search,
  Upload,
  Trash2,
} from 'lucide-react'
import { useNavigate } from 'react-router'
import { ActionMenuButton } from '@/shared/ui/ActionMenuButton'
import {
  SchoolClassFormDialog,
  type SchoolClassFormMode,
} from '../components/SchoolClassFormDialog'
import {
  useCreateSchoolClassMutation,
  useDeleteSchoolClassMutation,
  useUpdateSchoolClassMutation,
} from '../api/useSchoolClassMutations'
import {
  classManagementQueryKeys,
  useSchoolClassesQuery,
} from '../api/useSchoolClassesQuery'
import type {
  ClassFilters,
  CreateSchoolClassRequest,
  SchoolClass,
  UpdateSchoolClassRequest,
} from '../types'
import { formatClassDate, getClassStatusDisplay } from '../types'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10
const EMPTY_FILTERS: ClassFilters = {
  languageId: '',
  schoolGradeId: '',
  search: '',
  status: '',
}

type PageMessage = {
  text: string
  tone: 'error' | 'success'
}

function getErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    if (
      error.message.includes('Missing schoolId in access token') ||
      error.message.includes('Missing VITE_SCHOOL_ID')
    ) {
      return 'Chưa xác định được trường học hiện tại. Vui lòng đăng nhập lại.'
    }

    return error.message
  }

  return undefined
}

type DeleteDialogProps = {
  errorMessage?: string
  isSubmitting: boolean
  onClose: () => void
  onConfirm: () => void
  schoolClass: SchoolClass | null
}

function DeleteDialog({
  errorMessage,
  isSubmitting,
  onClose,
  onConfirm,
  schoolClass,
}: DeleteDialogProps) {
  if (!schoolClass) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 py-6">
      <div
        aria-labelledby="delete-class-title"
        className="grid w-full max-w-md gap-5 rounded-lg bg-white p-6 shadow-xl shadow-slate-950/20"
        role="dialog"
      >
        <div>
          <h2
            className="text-xl font-black tracking-0 text-slate-950"
            id="delete-class-title"
          >
            Xóa lớp học
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
            Lớp {schoolClass.code} sẽ được chuyển sang trạng thái lưu trữ. Bạn
            vẫn có thể lọc trạng thái lưu trữ để xem lại lớp học này.
          </p>
        </div>

        {errorMessage ? (
          <div
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
            role="alert"
          >
            {errorMessage}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            Hủy
          </button>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-70"
            disabled={isSubmitting}
            onClick={onConfirm}
            type="button"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            {isSubmitting ? 'Đang xóa...' : 'Xóa lớp'}
          </button>
        </div>
      </div>
    </div>
  )
}

type ClassTableProps = {
  classes: SchoolClass[]
  errorMessage?: string
  isError: boolean
  isLoading: boolean
  onDelete: (schoolClass: SchoolClass) => void
  onEdit: (schoolClass: SchoolClass) => void
  onRetry: () => void
  onView: (schoolClass: SchoolClass) => void
}

function ClassTable({
  classes,
  errorMessage,
  isError,
  isLoading,
  onDelete,
  onEdit,
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
          Chưa có lớp học
        </p>
        <p className="mt-2 text-sm font-medium text-slate-500">
          Điều chỉnh bộ lọc hoặc tạo lớp học đầu tiên.
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
              <th className="px-4 py-3">ID lớp</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Ngày tạo</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {classes.map((schoolClass) => {
              const status = getClassStatusDisplay(schoolClass.status)

              return (
                <tr className="bg-white" key={schoolClass.id}>
                  <td className="px-4 py-4">
                    <div className="grid text-left">
                      <span className="text-sm font-black text-slate-950">
                        {schoolClass.name}
                      </span>
                      <span className="mt-1 text-xs font-bold text-slate-500">
                        {schoolClass.code}
                      </span>
                    </div>
                  </td>
                  <td className="max-w-64 px-4 py-4">
                    <span className="block truncate font-mono text-xs font-semibold text-slate-600">
                      {schoolClass.id}
                    </span>
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
                  <td className="px-4 py-4">
                    <div className="flex justify-end">
                      <ActionMenuButton
                        ariaLabel={`Mở thao tác lớp ${schoolClass.code}`}
                        items={[
                          {
                            icon: Search,
                            id: 'view',
                            label: 'Xem chi tiết',
                            onSelect: () => onView(schoolClass),
                            tone: 'primary',
                          },
                          {
                            icon: Edit,
                            id: 'edit',
                            label: 'Sửa lớp',
                            onSelect: () => onEdit(schoolClass),
                            tone: 'primary',
                          },
                          {
                            icon: Trash2,
                            id: 'delete',
                            label: 'Xóa lớp',
                            onSelect: () => onDelete(schoolClass),
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

export function SchoolAdminClassesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [filters, setFilters] = useState<ClassFilters>(EMPTY_FILTERS)
  const [pageMessage, setPageMessage] = useState<PageMessage | null>(null)
  const [classDialogMode, setClassDialogMode] =
    useState<SchoolClassFormMode | null>(null)
  const [classDialogTarget, setClassDialogTarget] =
    useState<SchoolClass | null>(null)
  const [classDialogError, setClassDialogError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SchoolClass | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const classesQuery = useSchoolClassesQuery(page, pageSize, filters)
  const classes = classesQuery.data?.content ?? []
  const createMutation = useCreateSchoolClassMutation()
  const updateMutation = useUpdateSchoolClassMutation()
  const deleteMutation = useDeleteSchoolClassMutation()
  const isSavingClass = createMutation.isPending || updateMutation.isPending

  function handleFilterChange(name: keyof ClassFilters, value: string) {
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

  function openCreateDialog() {
    setClassDialogTarget(null)
    setClassDialogError(null)
    setClassDialogMode('create')
  }

  function openEditDialog(schoolClass: SchoolClass) {
    setClassDialogTarget(schoolClass)
    setClassDialogError(null)
    setClassDialogMode('edit')
  }

  function openClassDetail(schoolClass: SchoolClass) {
    navigate(`/school-admin/classes/${schoolClass.id}`)
  }

  function closeClassDialog() {
    if (isSavingClass) {
      return
    }

    setClassDialogError(null)
    setClassDialogMode(null)
    setClassDialogTarget(null)
  }

  async function handleCreateClass(payload: CreateSchoolClassRequest) {
    try {
      setClassDialogError(null)
      const result = await createMutation.mutateAsync({ payload })

      setPageMessage({ text: result.message, tone: 'success' })
      await queryClient.invalidateQueries({
        queryKey: classManagementQueryKeys.all,
      })
      setClassDialogMode(null)
      setClassDialogTarget(null)
    } catch (error) {
      setClassDialogError(
        getErrorMessage(error) ?? 'Không thể lưu lớp học. Vui lòng thử lại.',
      )
    }
  }

  async function handleUpdateClass(
    id: string,
    payload: UpdateSchoolClassRequest,
  ) {
    try {
      setClassDialogError(null)
      const result = await updateMutation.mutateAsync({
        id,
        payload,
      })

      setPageMessage({ text: result.message, tone: 'success' })
      await queryClient.invalidateQueries({
        queryKey: classManagementQueryKeys.all,
      })
      setClassDialogMode(null)
      setClassDialogTarget(null)
    } catch (error) {
      setClassDialogError(
        getErrorMessage(error) ?? 'Không thể lưu lớp học. Vui lòng thử lại.',
      )
    }
  }

  function openDeleteDialog(schoolClass: SchoolClass) {
    setDeleteError(null)
    setDeleteTarget(schoolClass)
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) {
      return
    }

    try {
      setDeleteError(null)
      const result = await deleteMutation.mutateAsync({
        classId: deleteTarget.id,
      })

      await queryClient.invalidateQueries({
        queryKey: classManagementQueryKeys.all,
      })
      setDeleteTarget(null)
      setPageMessage({ text: result.message, tone: 'success' })
    } catch (error) {
      setDeleteError(
        getErrorMessage(error) ?? 'Không thể xóa lớp học. Vui lòng thử lại.',
      )
    }
  }

  const pageMessageClassName =
    pageMessage?.tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-red-200 bg-red-50 text-red-700'

  return (
    <section aria-labelledby="school-admin-classes-title" className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-cyan-700">
            Quản lý lớp học
          </p>
          <h1
            className="mt-2 text-3xl font-black tracking-0 text-slate-950"
            id="school-admin-classes-title"
          >
            Danh sách lớp học
          </h1>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-600">
            Tạo, cập nhật, lọc và quản lý trạng thái các lớp học trong trường.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-4 text-sm font-bold text-cyan-800 transition hover:bg-cyan-100"
            onClick={() => navigate('/school-admin/classes/import')}
            type="button"
          >
            <Upload aria-hidden="true" className="size-4" />
            Tạo lớp số lượng lớn
          </button>
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
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 text-sm font-bold text-white transition hover:bg-cyan-700"
            onClick={openCreateDialog}
            type="button"
          >
            <Plus aria-hidden="true" className="size-4" />
            Tạo lớp
          </button>
        </div>
      </div>

      {pageMessage ? (
        <div
          className={`rounded-lg border px-4 py-3 text-sm font-semibold ${pageMessageClassName}`}
          role={pageMessage.tone === 'error' ? 'alert' : 'status'}
        >
          {pageMessage.text}
        </div>
      ) : null}

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[minmax(180px,1fr)_180px_minmax(180px,1fr)_minmax(180px,1fr)]">
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
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          ID ngôn ngữ
          <input
            className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
            onChange={(event) =>
              handleFilterChange('languageId', event.target.value)
            }
            placeholder="ID ngôn ngữ"
            value={filters.languageId}
          />
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          ID khối lớp
          <input
            className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
            onChange={(event) =>
              handleFilterChange('schoolGradeId', event.target.value)
            }
            placeholder="ID khối lớp"
            value={filters.schoolGradeId}
          />
        </label>
      </div>

      <div className="grid h-fit gap-4">
        <ClassTable
          classes={classes}
          errorMessage={getErrorMessage(classesQuery.error)}
          isError={classesQuery.isError}
          isLoading={classesQuery.isLoading}
          onDelete={openDeleteDialog}
          onEdit={openEditDialog}
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

      <SchoolClassFormDialog
        errorMessage={classDialogError ?? undefined}
        isOpen={Boolean(classDialogMode)}
        isSubmitting={isSavingClass}
        mode={classDialogMode ?? 'create'}
        onClose={closeClassDialog}
        onCreate={(payload) => {
          void handleCreateClass(payload)
        }}
        onUpdate={(id, payload) => {
          void handleUpdateClass(id, payload)
        }}
        schoolClass={classDialogTarget}
      />
      <DeleteDialog
        errorMessage={deleteError ?? undefined}
        isSubmitting={deleteMutation.isPending}
        onClose={() => {
          if (!deleteMutation.isPending) {
            setDeleteTarget(null)
          }
        }}
        onConfirm={() => {
          void handleDeleteConfirm()
        }}
        schoolClass={deleteTarget}
      />
    </section>
  )
}
