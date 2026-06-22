import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Edit, Plus, RefreshCw, Search, Trash2, Upload } from 'lucide-react'
import { useNavigate } from 'react-router'
import { ActionMenuButton } from '@/shared/ui/ActionMenuButton'
import { RoleBadges } from '../components/SchoolUserBadges'
import {
  SchoolUserFormDialog,
  type SchoolUserFormMode,
} from '../components/SchoolUserFormDialog'
import {
  useCreateSchoolUserMutation,
  useDeleteSchoolUserMutation,
  useUpdateSchoolUserMutation,
} from '../api/useSchoolUserMutations'
import {
  schoolUserManagementQueryKeys,
  useSchoolUsersQuery,
} from '../api/useSchoolUsersQuery'
import type {
  CreateSchoolUserRequest,
  SchoolUser,
  SchoolUserFilters,
  UpdateSchoolUserInput,
} from '../types'
import { formatNullableText } from '../types'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10
const EMPTY_FILTERS: SchoolUserFilters = {
  role: '',
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

function getDisplayName(schoolUser: SchoolUser) {
  return (
    schoolUser.user?.fullName?.trim() ||
    schoolUser.user?.email ||
    schoolUser.userId ||
    'Không xác định'
  )
}

type DeleteDialogProps = {
  errorMessage?: string
  isSubmitting: boolean
  onClose: () => void
  onConfirm: () => void
  schoolUser: SchoolUser | null
}

function DeleteDialog({
  errorMessage,
  isSubmitting,
  onClose,
  onConfirm,
  schoolUser,
}: DeleteDialogProps) {
  if (!schoolUser) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 py-6">
      <div
        aria-labelledby="delete-school-user-title"
        className="grid w-full max-w-md gap-5 rounded-lg bg-white p-6 shadow-xl shadow-slate-950/20"
        role="dialog"
      >
        <div>
          <h2
            className="text-xl font-black tracking-0 text-slate-950"
            id="delete-school-user-title"
          >
            Vô hiệu hóa người dùng
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
            {getDisplayName(schoolUser)} sẽ được chuyển sang trạng thái vô hiệu
            hóa và ẩn khỏi danh sách. Bạn có thể lọc trạng thái "Đã vô hiệu hóa"
            để xem lại.
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
            {isSubmitting ? 'Đang xử lý...' : 'Vô hiệu hóa'}
          </button>
        </div>
      </div>
    </div>
  )
}

type UserTableProps = {
  errorMessage?: string
  isError: boolean
  isLoading: boolean
  onDelete: (schoolUser: SchoolUser) => void
  onEdit: (schoolUser: SchoolUser) => void
  onRetry: () => void
  onView: (schoolUser: SchoolUser) => void
  schoolUsers: SchoolUser[]
}

function UserTable({
  errorMessage,
  isError,
  isLoading,
  onDelete,
  onEdit,
  onRetry,
  onView,
  schoolUsers,
}: UserTableProps) {
  if (isLoading) {
    return (
      <div
        className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600"
        role="status"
      >
        Đang tải danh sách người dùng...
      </div>
    )
  }

  if (isError) {
    return (
      <div
        className="grid gap-4 rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700"
        role="alert"
      >
        <span>{errorMessage ?? 'Không thể tải danh sách người dùng.'}</span>
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

  if (!schoolUsers.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-base font-black text-slate-950">Chưa có người dùng</p>
        <p className="mt-2 text-sm font-medium text-slate-500">
          Điều chỉnh bộ lọc hoặc tạo người dùng đầu tiên.
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
              <th className="px-4 py-3">Người dùng</th>
              <th className="px-4 py-3">Số điện thoại</th>
              <th className="px-4 py-3">Vai trò</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {schoolUsers.map((schoolUser) => {
              const displayName = getDisplayName(schoolUser)

              return (
                <tr className="bg-white" key={schoolUser.id}>
                  <td className="px-4 py-4">
                    <div className="grid text-left">
                      <span className="text-sm font-black text-slate-950">
                        {displayName}
                      </span>
                      <span className="mt-1 text-xs font-bold text-slate-500">
                        {formatNullableText(schoolUser.user?.email)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold text-slate-600">
                    {formatNullableText(schoolUser.user?.phone)}
                  </td>
                  <td className="px-4 py-4">
                    <RoleBadges roles={schoolUser.user?.schoolRoles} />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end">
                      <ActionMenuButton
                        ariaLabel={`Mở thao tác người dùng ${displayName}`}
                        items={[
                          {
                            icon: Search,
                            id: 'view',
                            label: 'Xem chi tiết',
                            onSelect: () => onView(schoolUser),
                            tone: 'primary',
                          },
                          {
                            icon: Edit,
                            id: 'edit',
                            label: 'Sửa người dùng',
                            onSelect: () => onEdit(schoolUser),
                            tone: 'primary',
                          },
                          {
                            icon: Trash2,
                            id: 'delete',
                            label: 'Vô hiệu hóa',
                            onSelect: () => onDelete(schoolUser),
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
        {totalElements} người dùng, trang {totalPages ? page : 0}/{totalPages}
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

export function SchoolAdminSchoolUsersPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [filters, setFilters] = useState<SchoolUserFilters>(EMPTY_FILTERS)
  const [showDisabled, setShowDisabled] = useState(false)
  const [pageMessage, setPageMessage] = useState<PageMessage | null>(null)
  const [dialogMode, setDialogMode] = useState<SchoolUserFormMode | null>(null)
  const [dialogTarget, setDialogTarget] = useState<SchoolUser | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SchoolUser | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const effectiveFilters: SchoolUserFilters = {
    ...filters,
    status: showDisabled ? 'DISABLED' : filters.status,
  }

  const usersQuery = useSchoolUsersQuery(page, pageSize, effectiveFilters)
  const schoolUsers = usersQuery.data?.content ?? []
  const createMutation = useCreateSchoolUserMutation()
  const updateMutation = useUpdateSchoolUserMutation()
  const deleteMutation = useDeleteSchoolUserMutation()
  const isSaving = createMutation.isPending || updateMutation.isPending

  function handleFilterChange(name: keyof SchoolUserFilters, value: string) {
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
    setDialogTarget(null)
    setDialogError(null)
    setDialogMode('create')
  }

  function openEditDialog(schoolUser: SchoolUser) {
    setDialogTarget(schoolUser)
    setDialogError(null)
    setDialogMode('edit')
  }

  function closeDialog() {
    if (isSaving) {
      return
    }

    setDialogError(null)
    setDialogMode(null)
    setDialogTarget(null)
  }

  async function invalidateAll() {
    await queryClient.invalidateQueries({
      queryKey: schoolUserManagementQueryKeys.all,
    })
  }

  async function handleCreate(payload: CreateSchoolUserRequest) {
    try {
      setDialogError(null)
      const result = await createMutation.mutateAsync({ payload })

      setPageMessage({ text: result.message, tone: 'success' })
      await invalidateAll()
      setDialogMode(null)
      setDialogTarget(null)
    } catch (error) {
      setDialogError(
        getErrorMessage(error) ??
          'Không thể lưu người dùng. Vui lòng thử lại.',
      )
    }
  }

  async function handleUpdate(userId: string, input: UpdateSchoolUserInput) {
    try {
      setDialogError(null)
      const result = await updateMutation.mutateAsync({ input, userId })

      setPageMessage({ text: result.message, tone: 'success' })
      await invalidateAll()
      setDialogMode(null)
      setDialogTarget(null)
    } catch (error) {
      setDialogError(
        getErrorMessage(error) ??
          'Không thể lưu người dùng. Vui lòng thử lại.',
      )
    }
  }

  function openDeleteDialog(schoolUser: SchoolUser) {
    setDeleteError(null)
    setDeleteTarget(schoolUser)
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget?.userId) {
      return
    }

    try {
      setDeleteError(null)
      const result = await deleteMutation.mutateAsync({
        userId: deleteTarget.userId,
      })

      await invalidateAll()
      setDeleteTarget(null)
      setPageMessage({ text: result.message, tone: 'success' })
    } catch (error) {
      setDeleteError(
        getErrorMessage(error) ??
          'Không thể vô hiệu hóa người dùng. Vui lòng thử lại.',
      )
    }
  }

  const pageMessageClassName =
    pageMessage?.tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-red-200 bg-red-50 text-red-700'

  return (
    <section
      aria-labelledby="school-admin-users-title"
      className="grid gap-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-cyan-700">
            Quản lý người dùng
          </p>
          <h1
            className="mt-2 text-3xl font-black tracking-0 text-slate-950"
            id="school-admin-users-title"
          >
            Người dùng trong nhà trường
          </h1>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-600">
            Tạo, cập nhật, lọc và quản lý học sinh, giáo viên trong trường.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-4 text-sm font-bold text-cyan-800 transition hover:bg-cyan-100"
            onClick={() => navigate('/school-admin/students/import')}
            type="button"
          >
            <Upload aria-hidden="true" className="size-4" />
            Import người dùng
          </button>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            disabled={usersQuery.isFetching}
            onClick={() => {
              void usersQuery.refetch()
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
            Tạo người dùng
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

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[minmax(180px,1fr)_180px_180px]">
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
              placeholder="Họ tên, email hoặc SĐT"
              type="search"
              value={filters.search}
            />
          </span>
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Vai trò
          <select
            className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
            onChange={(event) => handleFilterChange('role', event.target.value)}
            value={filters.role}
          >
            <option value="">Tất cả vai trò</option>
            <option value="STUDENT">Học sinh</option>
            <option value="TEACHER">Giáo viên</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Trạng thái
          <select
            className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100 disabled:bg-slate-100 disabled:text-slate-500"
            disabled={showDisabled}
            onChange={(event) =>
              handleFilterChange('status', event.target.value)
            }
            value={filters.status}
          >
            <option value="">Tất cả</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Tạm dừng</option>
            <option value="LOCKED">Đã khóa</option>
          </select>
        </label>
      </div>

      <label className="flex w-fit items-center gap-2 text-sm font-bold text-slate-700">
        <input
          checked={showDisabled}
          className="size-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
          onChange={(event) => {
            setShowDisabled(event.target.checked)
            setPage(DEFAULT_PAGE)
          }}
          type="checkbox"
        />
        Hiện người dùng đã vô hiệu hóa
      </label>

      <div className="grid h-fit gap-4">
        <UserTable
          errorMessage={getErrorMessage(usersQuery.error)}
          isError={usersQuery.isError}
          isLoading={usersQuery.isLoading}
          onDelete={openDeleteDialog}
          onEdit={openEditDialog}
          onRetry={() => {
            void usersQuery.refetch()
          }}
          onView={(schoolUser) =>
            navigate(`/school-admin/students/${schoolUser.userId}`)
          }
          schoolUsers={schoolUsers}
        />
        <Pagination
          isDisabled={usersQuery.isLoading || usersQuery.isError}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          page={page}
          pageSize={pageSize}
          totalElements={usersQuery.data?.totalElements ?? 0}
          totalPages={usersQuery.data?.totalPages ?? 0}
        />
      </div>

      <SchoolUserFormDialog
        errorMessage={dialogError ?? undefined}
        isOpen={Boolean(dialogMode)}
        isSubmitting={isSaving}
        mode={dialogMode ?? 'create'}
        onClose={closeDialog}
        onCreate={(payload) => {
          void handleCreate(payload)
        }}
        onUpdate={(userId, input) => {
          void handleUpdate(userId, input)
        }}
        schoolUser={dialogTarget}
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
        schoolUser={deleteTarget}
      />
    </section>
  )
}
