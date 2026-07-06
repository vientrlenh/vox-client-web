import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, RefreshCw, Trash2, Upload } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { ActionMenuButton } from '@/shared/ui/ActionMenuButton'
import {
  SchoolGradeLevelFormDialog,
  type SchoolGradeLevelFormMode,
} from '../components/SchoolGradeLevelFormDialog'
import {
  useCreateSchoolGradeLevelMutation,
  useDeleteSchoolGradeLevelMutation,
  useUpdateSchoolGradeLevelMutation,
} from '../api/useSchoolGradeLevelMutations'
import {
  gradeLevelManagementQueryKeys,
  useSchoolGradeLevelsQuery,
} from '../api/useSchoolGradeLevelsQuery'
import type {
  CreateSchoolGradeLevelRequest,
  SchoolGradeLevel,
  UpdateSchoolGradeLevelRequest,
} from '../types'
import {
  formatGradeDate,
  formatNullableText,
  getGradeLevelStatusDisplay,
} from '../types'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10

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

type StatusBadgeProps = {
  status?: string | null
}

function StatusBadge({ status }: StatusBadgeProps) {
  const display = getGradeLevelStatusDisplay(status)

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black ${display.className}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {display.label}
    </span>
  )
}

type DeleteDialogProps = {
  errorMessage?: string
  gradeLevel: SchoolGradeLevel | null
  isSubmitting: boolean
  onClose: () => void
  onConfirm: () => void
}

function DeleteDialog({
  errorMessage,
  gradeLevel,
  isSubmitting,
  onClose,
  onConfirm,
}: DeleteDialogProps) {
  if (!gradeLevel) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 py-6">
      <div
        aria-labelledby="delete-grade-level-title"
        className="grid w-full max-w-md gap-5 rounded-lg bg-white p-6 shadow-xl shadow-slate-950/20"
        role="dialog"
      >
        <div>
          <h2
            className="text-xl font-black tracking-0 text-slate-950"
            id="delete-grade-level-title"
          >
            Xóa khối
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
            Khối <strong>{gradeLevel.name}</strong> ({gradeLevel.code}) sẽ bị
            xóa khỏi trường. Không thể xóa nếu khối còn chứa năm học.
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
            {isSubmitting ? 'Đang xóa...' : 'Xóa khối'}
          </button>
        </div>
      </div>
    </div>
  )
}

type GradeLevelTableProps = {
  errorMessage?: string
  gradeLevels: SchoolGradeLevel[]
  isError: boolean
  isLoading: boolean
  onDelete: (gradeLevel: SchoolGradeLevel) => void
  onEdit: (gradeLevel: SchoolGradeLevel) => void
  onRetry: () => void
}

function GradeLevelTable({
  errorMessage,
  gradeLevels,
  isError,
  isLoading,
  onDelete,
  onEdit,
  onRetry,
}: GradeLevelTableProps) {
  if (isLoading) {
    return (
      <div
        className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600"
        role="status"
      >
        Đang tải danh sách khối...
      </div>
    )
  }

  if (isError) {
    return (
      <div
        className="grid gap-4 rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700"
        role="alert"
      >
        <span>{errorMessage ?? 'Không thể tải danh sách khối.'}</span>
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

  if (!gradeLevels.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-base font-black text-slate-950">Chưa có khối</p>
        <p className="mt-2 text-sm font-medium text-slate-500">
          Tạo khối đầu tiên cho trường của bạn.
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
              <th className="px-4 py-3">STT</th>
              <th className="px-4 py-3">Khối</th>
              <th className="px-4 py-3">Mô tả</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Ngày tạo</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {gradeLevels.map((gradeLevel) => (
              <tr className="bg-white" key={gradeLevel.id}>
                <td className="px-4 py-4 text-sm font-bold text-slate-500">
                  {gradeLevel.order}
                </td>
                <td className="px-4 py-4">
                  <Link
                    className="grid text-left transition hover:opacity-75"
                    to={`/school-admin/grades/${gradeLevel.id}`}
                  >
                    <span className="text-sm font-black text-cyan-700">
                      {gradeLevel.name}
                    </span>
                    <span className="mt-1 text-xs font-bold text-slate-500">
                      {gradeLevel.code}
                    </span>
                  </Link>
                </td>
                <td className="max-w-64 px-4 py-4 text-sm font-semibold text-slate-600">
                  {formatNullableText(gradeLevel.description)}
                </td>
                <td className="px-4 py-4">
                  <StatusBadge status={gradeLevel.status} />
                </td>
                <td className="px-4 py-4 text-sm font-semibold text-slate-600">
                  {formatGradeDate(gradeLevel.createdAt)}
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end">
                    <ActionMenuButton
                      ariaLabel={`Mở thao tác khối ${gradeLevel.code}`}
                      items={[
                        {
                          id: 'view',
                          label: 'Xem chi tiết',
                          onSelect: () => undefined,
                          tone: 'primary',
                        },
                        {
                          id: 'edit',
                          label: 'Sửa khối',
                          onSelect: () => onEdit(gradeLevel),
                          tone: 'primary',
                        },
                        {
                          icon: Trash2,
                          id: 'delete',
                          label: 'Xóa khối',
                          onSelect: () => onDelete(gradeLevel),
                          tone: 'danger',
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
        {totalElements} khối, trang {totalPages ? page : 0}/{totalPages}
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

export function SchoolAdminGradesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [pageMessage, setPageMessage] = useState<PageMessage | null>(null)
  const [dialogMode, setDialogMode] = useState<SchoolGradeLevelFormMode | null>(null)
  const [dialogTarget, setDialogTarget] = useState<SchoolGradeLevel | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SchoolGradeLevel | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const gradeLevelsQuery = useSchoolGradeLevelsQuery(page, pageSize)
  const gradeLevels = gradeLevelsQuery.data?.content ?? []
  const createMutation = useCreateSchoolGradeLevelMutation()
  const updateMutation = useUpdateSchoolGradeLevelMutation()
  const deleteMutation = useDeleteSchoolGradeLevelMutation()
  const isSaving = createMutation.isPending || updateMutation.isPending

  function handlePageSizeChange(nextPageSize: number) {
    setPage(DEFAULT_PAGE)
    setPageSize(nextPageSize)
  }

  function openCreateDialog() {
    setDialogTarget(null)
    setDialogError(null)
    setDialogMode('create')
  }

  function openEditDialog(gradeLevel: SchoolGradeLevel) {
    setDialogTarget(gradeLevel)
    setDialogError(null)
    setDialogMode('edit')
  }

  function closeDialog() {
    if (isSaving) return
    setDialogError(null)
    setDialogMode(null)
    setDialogTarget(null)
  }

  async function handleCreate(payload: CreateSchoolGradeLevelRequest) {
    try {
      setDialogError(null)
      const result = await createMutation.mutateAsync({ payload })

      setPageMessage({ text: result.message ?? 'Tạo khối thành công.', tone: 'success' })
      await queryClient.invalidateQueries({
        queryKey: gradeLevelManagementQueryKeys.all,
      })
      setDialogMode(null)
      setDialogTarget(null)
    } catch (error) {
      setDialogError(
        getErrorMessage(error) ?? 'Không thể tạo khối. Vui lòng thử lại.',
      )
    }
  }

  async function handleUpdate(id: string, payload: UpdateSchoolGradeLevelRequest) {
    try {
      setDialogError(null)
      const result = await updateMutation.mutateAsync({ gradeLevelId: id, payload })

      setPageMessage({ text: result.message, tone: 'success' })
      await queryClient.invalidateQueries({
        queryKey: gradeLevelManagementQueryKeys.all,
      })
      setDialogMode(null)
      setDialogTarget(null)
    } catch (error) {
      setDialogError(
        getErrorMessage(error) ?? 'Không thể cập nhật khối. Vui lòng thử lại.',
      )
    }
  }

  function openDeleteDialog(gradeLevel: SchoolGradeLevel) {
    setDeleteError(null)
    setDeleteTarget(gradeLevel)
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return

    try {
      setDeleteError(null)
      const result = await deleteMutation.mutateAsync({
        gradeLevelId: deleteTarget.id,
      })

      await queryClient.invalidateQueries({
        queryKey: gradeLevelManagementQueryKeys.all,
      })
      setDeleteTarget(null)
      setPageMessage({ text: result.message ?? 'Xóa khối thành công.', tone: 'success' })
    } catch (error) {
      setDeleteError(
        getErrorMessage(error) ?? 'Không thể xóa khối. Vui lòng thử lại.',
      )
    }
  }

  const pageMessageClassName =
    pageMessage?.tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-red-200 bg-red-50 text-red-700'

  return (
    <section aria-labelledby="school-admin-grades-title" className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-cyan-700">
            Quản lý khối
          </p>
          <h1
            className="mt-2 text-3xl font-black tracking-0 text-slate-950"
            id="school-admin-grades-title"
          >
            Danh sách khối học
          </h1>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-600">
            Tạo, cập nhật và quản lý các khối học của trường.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            disabled={gradeLevelsQuery.isFetching}
            onClick={() => {
              void gradeLevelsQuery.refetch()
            }}
            type="button"
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            Làm mới
          </button>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-4 text-sm font-bold text-cyan-800 transition hover:bg-cyan-100"
            onClick={() => navigate('/school-admin/grades/import')}
            type="button"
          >
            <Upload aria-hidden="true" className="size-4" />
            Import
          </button>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 text-sm font-bold text-white transition hover:bg-cyan-700"
            onClick={openCreateDialog}
            type="button"
          >
            <Plus aria-hidden="true" className="size-4" />
            Tạo khối
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

      <div className="grid h-fit gap-4">
        <GradeLevelTable
          errorMessage={getErrorMessage(gradeLevelsQuery.error)}
          gradeLevels={gradeLevels}
          isError={gradeLevelsQuery.isError}
          isLoading={gradeLevelsQuery.isLoading}
          onDelete={openDeleteDialog}
          onEdit={openEditDialog}
          onRetry={() => {
            void gradeLevelsQuery.refetch()
          }}
        />
        <Pagination
          isDisabled={gradeLevelsQuery.isLoading || gradeLevelsQuery.isError}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          page={page}
          pageSize={pageSize}
          totalElements={gradeLevelsQuery.data?.totalElements ?? 0}
          totalPages={gradeLevelsQuery.data?.totalPages ?? 0}
        />
      </div>

      <SchoolGradeLevelFormDialog
        errorMessage={dialogError ?? undefined}
        gradeLevel={dialogTarget}
        isOpen={Boolean(dialogMode)}
        isSubmitting={isSaving}
        mode={dialogMode ?? 'create'}
        onClose={closeDialog}
        onCreate={(payload) => {
          void handleCreate(payload)
        }}
        onUpdate={(id, payload) => {
          void handleUpdate(id, payload)
        }}
      />

      <DeleteDialog
        errorMessage={deleteError ?? undefined}
        gradeLevel={deleteTarget}
        isSubmitting={deleteMutation.isPending}
        onClose={() => {
          if (!deleteMutation.isPending) {
            setDeleteTarget(null)
          }
        }}
        onConfirm={() => {
          void handleDeleteConfirm()
        }}
      />
    </section>
  )
}
