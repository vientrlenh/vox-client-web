import type { ReactNode } from 'react'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CalendarDays,
  Info,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { ActionMenuButton } from '@/shared/ui/ActionMenuButton'
import {
  SchoolGradeLevelFormDialog,
  type SchoolGradeLevelFormMode,
} from '../components/SchoolGradeLevelFormDialog'
import {
  SchoolGradeFormDialog,
  type SchoolGradeFormMode,
} from '../components/SchoolGradeFormDialog'
import {
  useUpdateSchoolGradeLevelMutation,
} from '../api/useSchoolGradeLevelMutations'
import {
  gradeLevelManagementQueryKeys,
  useSchoolGradeLevelQuery,
} from '../api/useSchoolGradeLevelsQuery'
import {
  gradeManagementQueryKeys,
  useSchoolGradesQuery,
} from '../api/useSchoolGradesQuery'
import {
  useCreateSchoolGradeMutation,
  useDeleteSchoolGradeMutation,
  useUpdateSchoolGradeMutation,
} from '../api/useSchoolGradeMutations'
import type {
  CreateSchoolGradeRequest,
  SchoolGrade,
  SchoolGradeLevel,
  UpdateSchoolGradeLevelRequest,
  UpdateSchoolGradeRequest,
} from '../types'
import {
  formatGradeDate,
  formatGradeDateOnly,
  formatNullableText,
  getGradeLevelStatusDisplay,
  getGradeStatusDisplay,
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

type GradeLevelStatusBadgeProps = {
  status?: string | null
}

function GradeLevelStatusBadge({ status }: GradeLevelStatusBadgeProps) {
  const display = getGradeLevelStatusDisplay(status)

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black ${display.className}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {display.label}
    </span>
  )
}

type GradeStatusBadgeProps = {
  status?: string | null
}

function GradeStatusBadge({ status }: GradeStatusBadgeProps) {
  const display = getGradeStatusDisplay(status)

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black ${display.className}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {display.label}
    </span>
  )
}

type DetailCardProps = {
  children: ReactNode
  icon: React.ComponentType<{ 'aria-hidden'?: boolean; className?: string }>
  title: string
}

function DetailCard({ children, icon: Icon, title }: DetailCardProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <span className="inline-flex size-9 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <Icon aria-hidden={true} className="size-5" />
        </span>
        <h2 className="text-base font-black text-blue-950">{title}</h2>
      </div>
      <div className="mt-4 grid gap-4">{children}</div>
    </section>
  )
}

type DetailRowProps = {
  label: string
  value: ReactNode
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="grid grid-cols-[120px_12px_minmax(0,1fr)] items-center gap-4 text-sm">
      <span className="font-bold text-slate-500">{label}</span>
      <span className="font-bold text-slate-400">:</span>
      <span className="min-w-0 font-black text-blue-950">{value}</span>
    </div>
  )
}

type GradeLevelInfoTabProps = {
  gradeLevel: SchoolGradeLevel
}

function GradeLevelInfoTab({ gradeLevel }: GradeLevelInfoTabProps) {
  return (
    <section aria-labelledby="grade-level-info-title" className="grid gap-5">
      <h2 className="sr-only" id="grade-level-info-title">
        Thông tin khối
      </h2>

      <div className="grid gap-5 xl:grid-cols-2">
        <DetailCard icon={Info} title="Thông tin cơ bản">
          <DetailRow label="Mã khối" value={gradeLevel.code} />
          <DetailRow label="Tên khối" value={gradeLevel.name} />
          <DetailRow label="Thứ tự" value={gradeLevel.order} />
          <DetailRow
            label="Trạng thái"
            value={<GradeLevelStatusBadge status={gradeLevel.status} />}
          />
          <DetailRow
            label="Mô tả"
            value={formatNullableText(gradeLevel.description)}
          />
        </DetailCard>

        <DetailCard icon={CalendarDays} title="Thời gian">
          <DetailRow
            label="Ngày tạo"
            value={formatGradeDate(gradeLevel.createdAt)}
          />
          <DetailRow
            label="Ngày cập nhật"
            value={formatGradeDate(gradeLevel.updatedAt)}
          />
        </DetailCard>
      </div>
    </section>
  )
}

type GradeDeleteDialogProps = {
  errorMessage?: string
  grade: SchoolGrade | null
  isSubmitting: boolean
  onClose: () => void
  onConfirm: () => void
}

function GradeDeleteDialog({
  errorMessage,
  grade,
  isSubmitting,
  onClose,
  onConfirm,
}: GradeDeleteDialogProps) {
  if (!grade) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 py-6">
      <div
        aria-labelledby="delete-grade-title"
        className="grid w-full max-w-md gap-5 rounded-lg bg-white p-6 shadow-xl shadow-slate-950/20"
        role="dialog"
      >
        <div>
          <h2
            className="text-xl font-black tracking-0 text-slate-950"
            id="delete-grade-title"
          >
            Xóa năm học
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
            Năm học <strong>{grade.name}</strong> ({grade.code}) sẽ bị xóa.
            Không thể xóa nếu năm học đang được dùng bởi các lớp học.
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
            {isSubmitting ? 'Đang xóa...' : 'Xóa năm học'}
          </button>
        </div>
      </div>
    </div>
  )
}

type GradePaginationProps = {
  isDisabled: boolean
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  page: number
  pageSize: number
  totalElements: number
  totalPages: number
}

function GradePagination({
  isDisabled,
  onPageChange,
  onPageSizeChange,
  page,
  pageSize,
  totalElements,
  totalPages,
}: GradePaginationProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <span>
        {totalElements} năm học, trang {totalPages ? page : 0}/{totalPages}
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

type GradesTabProps = {
  gradeLevelId: string
}

function GradesTab({ gradeLevelId }: GradesTabProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [gradeDialogMode, setGradeDialogMode] = useState<SchoolGradeFormMode | null>(null)
  const [gradeDialogTarget, setGradeDialogTarget] = useState<SchoolGrade | null>(null)
  const [gradeDialogError, setGradeDialogError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SchoolGrade | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [tabMessage, setTabMessage] = useState<PageMessage | null>(null)

  const gradesQuery = useSchoolGradesQuery(page, pageSize, gradeLevelId)
  const grades = gradesQuery.data?.content ?? []
  const createMutation = useCreateSchoolGradeMutation()
  const updateMutation = useUpdateSchoolGradeMutation()
  const deleteMutation = useDeleteSchoolGradeMutation()
  const isSaving = createMutation.isPending || updateMutation.isPending

  function handlePageSizeChange(nextPageSize: number) {
    setPage(DEFAULT_PAGE)
    setPageSize(nextPageSize)
  }

  function openCreateDialog() {
    setGradeDialogTarget(null)
    setGradeDialogError(null)
    setGradeDialogMode('create')
  }

  function openEditDialog(grade: SchoolGrade) {
    setGradeDialogTarget(grade)
    setGradeDialogError(null)
    setGradeDialogMode('edit')
  }

  function closeGradeDialog() {
    if (isSaving) return
    setGradeDialogError(null)
    setGradeDialogMode(null)
    setGradeDialogTarget(null)
  }

  async function handleCreateGrade(payload: CreateSchoolGradeRequest) {
    try {
      setGradeDialogError(null)
      const result = await createMutation.mutateAsync({
        payload,
        schoolGradeLevelId: gradeLevelId,
      })

      setTabMessage({ text: result.message ?? 'Tạo năm học thành công.', tone: 'success' })
      await queryClient.invalidateQueries({ queryKey: gradeManagementQueryKeys.all })
      setGradeDialogMode(null)
      setGradeDialogTarget(null)
    } catch (error) {
      setGradeDialogError(
        getErrorMessage(error) ?? 'Không thể tạo năm học. Vui lòng thử lại.',
      )
    }
  }

  async function handleUpdateGrade(id: string, payload: UpdateSchoolGradeRequest) {
    try {
      setGradeDialogError(null)
      const result = await updateMutation.mutateAsync({ id, payload })

      setTabMessage({ text: result.message, tone: 'success' })
      await queryClient.invalidateQueries({ queryKey: gradeManagementQueryKeys.all })
      setGradeDialogMode(null)
      setGradeDialogTarget(null)
    } catch (error) {
      setGradeDialogError(
        getErrorMessage(error) ?? 'Không thể cập nhật năm học. Vui lòng thử lại.',
      )
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return

    try {
      setDeleteError(null)
      const result = await deleteMutation.mutateAsync({ gradeId: deleteTarget.id })

      await queryClient.invalidateQueries({ queryKey: gradeManagementQueryKeys.all })
      setDeleteTarget(null)
      setTabMessage({ text: result.message ?? 'Xóa năm học thành công.', tone: 'success' })
    } catch (error) {
      setDeleteError(
        getErrorMessage(error) ?? 'Không thể xóa năm học. Vui lòng thử lại.',
      )
    }
  }

  const messageClassName =
    tabMessage?.tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-red-200 bg-red-50 text-red-700'

  return (
    <section aria-labelledby="grades-tab-title" className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            className="text-lg font-black text-slate-950"
            id="grades-tab-title"
          >
            Năm học trong khối
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Thêm, sửa và quản lý các năm học thuộc khối này.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-4 text-sm font-bold text-cyan-800 transition hover:bg-cyan-100"
            onClick={() =>
              navigate(`/school-admin/grades/${gradeLevelId}/grades/import`)
            }
            type="button"
          >
            <Upload aria-hidden="true" className="size-4" />
            Import năm học
          </button>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 text-sm font-bold text-white transition hover:bg-cyan-700"
            onClick={openCreateDialog}
            type="button"
          >
            <Plus aria-hidden="true" className="size-4" />
            Tạo năm học
          </button>
        </div>
      </div>

      {tabMessage ? (
        <div
          className={`rounded-lg border px-4 py-3 text-sm font-semibold ${messageClassName}`}
          role={tabMessage.tone === 'error' ? 'alert' : 'status'}
        >
          {tabMessage.text}
        </div>
      ) : null}

      {gradesQuery.isLoading ? (
        <div
          className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600"
          role="status"
        >
          Đang tải danh sách năm học...
        </div>
      ) : null}

      {gradesQuery.isError ? (
        <div
          className="grid gap-4 rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700"
          role="alert"
        >
          <span>
            {getErrorMessage(gradesQuery.error) ?? 'Không thể tải danh sách năm học.'}
          </span>
          <button
            className="inline-flex h-10 w-fit items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-bold text-white"
            onClick={() => { void gradesQuery.refetch() }}
            type="button"
          >
            Thử lại
          </button>
        </div>
      ) : null}

      {!gradesQuery.isLoading && !gradesQuery.isError && grades.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-base font-black text-slate-950">Chưa có năm học</p>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Tạo năm học đầu tiên cho khối này.
          </p>
        </div>
      ) : null}

      {!gradesQuery.isLoading && !gradesQuery.isError && grades.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Năm học</th>
                  <th className="px-4 py-3">Ngày bắt đầu</th>
                  <th className="px-4 py-3">Ngày kết thúc</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {grades.map((grade) => (
                  <tr className="bg-white" key={grade.id}>
                    <td className="px-4 py-4">
                      <div className="grid text-left">
                        <span className="text-sm font-black text-slate-950">
                          {grade.name}
                        </span>
                        <span className="mt-1 text-xs font-bold text-slate-500">
                          {grade.code}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-slate-600">
                      {formatGradeDateOnly(grade.startDate)}
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-slate-600">
                      {formatGradeDateOnly(grade.endDate)}
                    </td>
                    <td className="px-4 py-4">
                      <GradeStatusBadge status={grade.status} />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end">
                        <ActionMenuButton
                          ariaLabel={`Mở thao tác năm học ${grade.code}`}
                          items={[
                            {
                              id: 'edit',
                              label: 'Sửa năm học',
                              onSelect: () => openEditDialog(grade),
                              tone: 'primary',
                            },
                            {
                              icon: Trash2,
                              id: 'delete',
                              label: 'Xóa năm học',
                              onSelect: () => setDeleteTarget(grade),
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
      ) : null}

      <GradePagination
        isDisabled={gradesQuery.isLoading || gradesQuery.isError}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
        page={page}
        pageSize={pageSize}
        totalElements={gradesQuery.data?.totalElements ?? 0}
        totalPages={gradesQuery.data?.totalPages ?? 0}
      />

      <SchoolGradeFormDialog
        errorMessage={gradeDialogError ?? undefined}
        grade={gradeDialogTarget}
        isOpen={Boolean(gradeDialogMode)}
        isSubmitting={isSaving}
        mode={gradeDialogMode ?? 'create'}
        onClose={closeGradeDialog}
        onCreate={(payload) => { void handleCreateGrade(payload) }}
        onUpdate={(id, payload) => { void handleUpdateGrade(id, payload) }}
      />

      <GradeDeleteDialog
        errorMessage={deleteError ?? undefined}
        grade={deleteTarget}
        isSubmitting={deleteMutation.isPending}
        onClose={() => {
          if (!deleteMutation.isPending) setDeleteTarget(null)
        }}
        onConfirm={() => { void handleDeleteConfirm() }}
      />
    </section>
  )
}

type ActiveTab = 'info' | 'grades'

export function SchoolAdminGradeLevelDetailPage() {
  const { gradeLevelId } = useParams()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<ActiveTab>('info')
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [pageMessage, setPageMessage] = useState<PageMessage | null>(null)

  const gradeLevelQuery = useSchoolGradeLevelQuery(gradeLevelId ?? null)
  const updateMutation = useUpdateSchoolGradeLevelMutation()
  const gradeLevel = gradeLevelQuery.data

  function closeEditDialog() {
    if (updateMutation.isPending) return
    setEditError(null)
    setIsEditDialogOpen(false)
  }

  async function handleUpdateGradeLevel(
    id: string,
    payload: UpdateSchoolGradeLevelRequest,
  ) {
    try {
      setEditError(null)
      const result = await updateMutation.mutateAsync({ gradeLevelId: id, payload })

      await queryClient.invalidateQueries({
        queryKey: gradeLevelManagementQueryKeys.all,
      })
      setIsEditDialogOpen(false)
      setPageMessage({ text: result.message, tone: 'success' })
    } catch (error) {
      setEditError(
        getErrorMessage(error) ?? 'Không thể cập nhật khối. Vui lòng thử lại.',
      )
    }
  }

  if (!gradeLevelId) {
    return (
      <section className="grid gap-4">
        <Link
          className="inline-flex w-fit items-center gap-2 text-sm font-bold text-cyan-700 transition hover:text-cyan-900"
          to="/school-admin/grades"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Quay lại danh sách khối
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
          Không tìm thấy mã khối trong đường dẫn.
        </div>
      </section>
    )
  }

  if (gradeLevelQuery.isLoading) {
    return (
      <section className="grid gap-4">
        <Link
          className="inline-flex w-fit items-center gap-2 text-sm font-bold text-cyan-700 transition hover:text-cyan-900"
          to="/school-admin/grades"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Quay lại danh sách khối
        </Link>
        <div
          className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600"
          role="status"
        >
          Đang tải thông tin khối...
        </div>
      </section>
    )
  }

  if (gradeLevelQuery.isError) {
    return (
      <section className="grid gap-4">
        <Link
          className="inline-flex w-fit items-center gap-2 text-sm font-bold text-cyan-700 transition hover:text-cyan-900"
          to="/school-admin/grades"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Quay lại danh sách khối
        </Link>
        <div
          className="grid gap-4 rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700"
          role="alert"
        >
          <span>
            {getErrorMessage(gradeLevelQuery.error) ?? 'Không thể tải thông tin khối.'}
          </span>
          <button
            className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-bold text-white"
            onClick={() => { void gradeLevelQuery.refetch() }}
            type="button"
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            Thử lại
          </button>
        </div>
      </section>
    )
  }

  if (!gradeLevel) {
    return (
      <section className="grid gap-4">
        <Link
          className="inline-flex w-fit items-center gap-2 text-sm font-bold text-cyan-700 transition hover:text-cyan-900"
          to="/school-admin/grades"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Quay lại danh sách khối
        </Link>
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-base font-black text-slate-950">Không tìm thấy khối</p>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Khối này không tồn tại hoặc đã bị xóa.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section
      aria-labelledby="grade-level-detail-title"
      className="grid gap-5 text-blue-950"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <nav
            aria-label="Đường dẫn"
            className="flex items-center gap-2 text-sm font-bold text-slate-500"
          >
            <Link
              className="transition hover:text-blue-800"
              to="/school-admin/grades"
            >
              Quản lý khối
            </Link>
            <span aria-hidden="true">/</span>
            <span>Chi tiết khối</span>
          </nav>
          <h1
            className="mt-4 text-3xl font-black tracking-0 text-blue-950"
            id="grade-level-detail-title"
          >
            Chi tiết khối học
          </h1>
          <p className="mt-3 text-sm font-medium text-slate-500">
            Xem thông tin khối học và quản lý các năm học trong khối.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 text-sm font-black text-blue-950 shadow-sm shadow-slate-950/5 transition hover:bg-slate-50"
            to="/school-admin/grades"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Quay lại
          </Link>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-5 text-sm font-black text-white shadow-sm shadow-cyan-950/20 transition hover:bg-cyan-700"
            onClick={() => {
              setEditError(null)
              setIsEditDialogOpen(true)
            }}
            type="button"
          >
            <Pencil aria-hidden="true" className="size-4" />
            Chỉnh sửa
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
          <div className="inline-flex size-24 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-blue-600">
            <span className="text-2xl font-black">{gradeLevel.order}</span>
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-0 text-blue-950">
              {gradeLevel.name}
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="min-w-36 border-slate-200 md:border-r md:pr-10">
                <p className="text-xs font-bold text-slate-500">Mã khối</p>
                <p className="mt-2 text-base font-black text-blue-950">
                  {gradeLevel.code}
                </p>
              </div>
              <div className="min-w-36 border-slate-200 md:border-r md:px-10">
                <p className="text-xs font-bold text-slate-500">Thứ tự</p>
                <p className="mt-2 text-base font-black text-blue-950">
                  {gradeLevel.order}
                </p>
              </div>
              <div className="min-w-36 md:pl-10">
                <p className="text-xs font-bold text-slate-500">Trạng thái</p>
                <div className="mt-2">
                  <GradeLevelStatusBadge status={gradeLevel.status} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {pageMessage ? (
        <div
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"
          role="status"
        >
          {pageMessage.text}
        </div>
      ) : null}

      <div className="rounded-lg border border-slate-200 bg-white p-1">
        <div aria-label="Chi tiết khối học" className="flex gap-1" role="tablist">
          <button
            aria-selected={activeTab === 'info'}
            className={[
              'h-10 rounded-md px-4 text-sm font-black transition',
              activeTab === 'info'
                ? 'bg-cyan-600 text-white'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950',
            ].join(' ')}
            onClick={() => setActiveTab('info')}
            role="tab"
            type="button"
          >
            Thông tin khối
          </button>
          <button
            aria-selected={activeTab === 'grades'}
            className={[
              'h-10 rounded-md px-4 text-sm font-black transition',
              activeTab === 'grades'
                ? 'bg-cyan-600 text-white'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950',
            ].join(' ')}
            onClick={() => setActiveTab('grades')}
            role="tab"
            type="button"
          >
            Năm học
          </button>
        </div>
      </div>

      {activeTab === 'info' ? (
        <GradeLevelInfoTab gradeLevel={gradeLevel} />
      ) : (
        <GradesTab gradeLevelId={gradeLevelId} />
      )}

      <SchoolGradeLevelFormDialog
        errorMessage={editError ?? undefined}
        gradeLevel={gradeLevel}
        isOpen={isEditDialogOpen}
        isSubmitting={updateMutation.isPending}
        mode={'edit' as SchoolGradeLevelFormMode}
        onClose={closeEditDialog}
        onCreate={() => undefined}
        onUpdate={(id, payload) => { void handleUpdateGradeLevel(id, payload) }}
      />
    </section>
  )
}
