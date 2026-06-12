import type { ComponentType, ReactNode } from 'react'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Ban,
  CalendarDays,
  CheckCircle2,
  Copy,
  Info,
  Link2,
  Pencil,
  RefreshCw,
  Rows3,
  Trash2,
  Upload,
  UserPlus,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { ActionMenuButton } from '@/shared/ui/ActionMenuButton'
import { SchoolClassFormDialog } from '../components/SchoolClassFormDialog'
import {
  useAddClassUserMutation,
  useRemoveClassUserMutation,
  useUpdateSchoolClassMutation,
  useUpdateClassUserStatusMutation,
} from '../api/useSchoolClassMutations'
import { useSchoolClassQuery } from '../api/useSchoolClassQuery'
import { useSchoolClassUsersQuery } from '../api/useSchoolClassUsersQuery'
import { classManagementQueryKeys } from '../api/useSchoolClassesQuery'
import type {
  ClassUser,
  RelatedClassObject,
  SchoolClass,
  UpdateSchoolClassRequest,
} from '../types'
import {
  formatClassDate,
  formatNullableText,
  getClassStatusDisplay,
} from '../types'

const DEFAULT_USER_PAGE = 1
const DEFAULT_USER_PAGE_SIZE = 10

type ActiveTab = 'info' | 'users'

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
  isActive: boolean
}

function UserStatusBadge({ isActive }: StatusBadgeProps) {
  return (
    <span
      className={[
        'inline-flex rounded-full border px-2.5 py-1 text-xs font-black',
        isActive
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-amber-200 bg-amber-50 text-amber-700',
      ].join(' ')}
    >
      {isActive ? 'Đang hoạt động' : 'Tạm dừng'}
    </span>
  )
}

type ClassStatusBadgeProps = {
  status?: string | null
}

function ClassStatusBadge({ status }: ClassStatusBadgeProps) {
  const display = getClassStatusDisplay(status)

  return (
    <span
      className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${display.className}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {display.label}
    </span>
  )
}

type DetailCardProps = {
  children: ReactNode
  icon: ComponentType<{ 'aria-hidden'?: boolean; className?: string }>
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
  value: React.ReactNode
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="grid grid-cols-[110px_12px_minmax(0,1fr)] items-center gap-4 text-sm">
      <span className="font-bold text-slate-500">
        {label}
      </span>
      <span className="font-bold text-slate-400">:</span>
      <span className="min-w-0 font-black text-blue-950">
        {value}
      </span>
    </div>
  )
}

type CopyableIdProps = {
  value: string
}

function CopyableId({ value }: CopyableIdProps) {
  return (
    <span className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs font-bold text-slate-600">
      <span className="truncate">{value}</span>
      <button
        aria-label={`Sao chép ${value}`}
        className="ml-auto inline-flex size-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-white hover:text-blue-700"
        onClick={() => {
          void navigator.clipboard?.writeText(value)
        }}
        type="button"
      >
        <Copy aria-hidden="true" className="size-4" />
      </button>
    </span>
  )
}

type RelatedObjectRowProps = {
  label: string
  value?: RelatedClassObject | null
}

function getRelatedObjectTitle(value?: RelatedClassObject | null) {
  return value?.name?.trim() || value?.code?.trim() || 'Chưa có dữ liệu'
}

function RelatedObjectRow({ label, value }: RelatedObjectRowProps) {
  const title = getRelatedObjectTitle(value)
  const code = value?.name?.trim() ? value?.code?.trim() : null

  return (
    <DetailRow
      label={label}
      value={
        <div className="grid min-w-0 gap-2">
          <span>{title}</span>
          {code ? (
            <span className="text-xs font-bold text-slate-500">Mã: {code}</span>
          ) : null}
        </div>
      }
    />
  )
}

type ClassInfoTabProps = {
  schoolClass: SchoolClass
}

function ClassInfoTab({ schoolClass }: ClassInfoTabProps) {
  return (
    <section aria-labelledby="class-info-title" className="grid gap-5">
      <h2 className="sr-only" id="class-info-title">
        Thông tin lớp
      </h2>

      <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <DetailCard icon={Info} title="Thông tin cơ bản">
          <DetailRow label="Mã lớp" value={schoolClass.code} />
          <DetailRow label="Tên lớp" value={schoolClass.name} />
          <DetailRow
            label="Trạng thái"
            value={<ClassStatusBadge status={schoolClass.status} />}
          />
          <DetailRow
            label="Mô tả"
            value={formatNullableText(schoolClass.description)}
          />
        </DetailCard>

        <DetailCard icon={Link2} title="Thông tin liên quan">
          <DetailRow
            label="ID lớp"
            value={<CopyableId value={schoolClass.id} />}
          />
          <RelatedObjectRow
            label="Trường học"
            value={schoolClass.school}
          />
          <RelatedObjectRow
            label="Ngôn ngữ"
            value={schoolClass.language}
          />
          <RelatedObjectRow
            label="Khối lớp"
            value={schoolClass.schoolGrade}
          />
        </DetailCard>
      </div>

      <DetailCard icon={CalendarDays} title="Thời gian">
        <div className="grid gap-4 lg:grid-cols-2">
          <DetailRow
            label="Ngày tạo"
            value={formatClassDate(schoolClass.createdAt)}
          />
          <DetailRow
            label="Ngày cập nhật"
            value={formatClassDate(schoolClass.updatedAt)}
          />
        </div>
      </DetailCard>
    </section>
  )
}

type UserPaginationProps = {
  isDisabled: boolean
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  page: number
  pageSize: number
  totalElements: number
  totalPages: number
}

function UserPagination({
  isDisabled,
  onPageChange,
  onPageSizeChange,
  page,
  pageSize,
  totalElements,
  totalPages,
}: UserPaginationProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <span>
        {totalElements} học viên, trang {totalPages ? page : 0}/{totalPages}
      </span>
      <div className="flex items-center gap-2">
        <select
          aria-label="Số học viên mỗi trang"
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

type ClassUsersTabProps = {
  classId: string
}

function ClassUsersTab({ classId }: ClassUsersTabProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(DEFAULT_USER_PAGE)
  const [pageSize, setPageSize] = useState(DEFAULT_USER_PAGE_SIZE)
  const [userId, setUserId] = useState('')
  const [message, setMessage] = useState<PageMessage | null>(null)
  const [removeTarget, setRemoveTarget] = useState<ClassUser | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)

  const usersQuery = useSchoolClassUsersQuery(classId, page, pageSize)
  const addMutation = useAddClassUserMutation()
  const removeMutation = useRemoveClassUserMutation()
  const statusMutation = useUpdateClassUserStatusMutation()
  const users = usersQuery.data?.content ?? []
  const usersQueryKey = classManagementQueryKeys.classUsers(
    classId,
    page,
    pageSize,
  )
  const isActionPending =
    addMutation.isPending ||
    removeMutation.isPending ||
    statusMutation.isPending

  async function invalidateUsers() {
    await queryClient.invalidateQueries({
      queryKey: usersQueryKey,
    })
  }

  function handlePageSizeChange(nextPageSize: number) {
    setPage(DEFAULT_USER_PAGE)
    setPageSize(nextPageSize)
  }

  async function handleAddUser() {
    const trimmedUserId = userId.trim()

    if (!trimmedUserId) {
      setMessage({ text: 'ID học viên là bắt buộc.', tone: 'error' })
      return
    }

    try {
      setMessage(null)
      const result = await addMutation.mutateAsync({
        classId,
        userId: trimmedUserId,
      })

      setUserId('')
      setPage(DEFAULT_USER_PAGE)
      await invalidateUsers()
      setMessage({ text: result.message, tone: 'success' })
    } catch (error) {
      setMessage({
        text:
          getErrorMessage(error) ??
          'Không thể thêm học viên vào lớp. Vui lòng thử lại.',
        tone: 'error',
      })
    }
  }

  async function handleToggleUser(classUser: ClassUser) {
    try {
      setMessage(null)
      const result = await statusMutation.mutateAsync({
        classId,
        isActive: !classUser.isActive,
        userId: classUser.userId,
      })

      await invalidateUsers()
      setMessage({ text: result.message, tone: 'success' })
    } catch (error) {
      setMessage({
        text:
          getErrorMessage(error) ??
          'Không thể cập nhật trạng thái học viên. Vui lòng thử lại.',
        tone: 'error',
      })
    }
  }

  async function handleRemoveConfirm() {
    if (!removeTarget) {
      return
    }

    try {
      setRemoveError(null)
      const result = await removeMutation.mutateAsync({
        classId,
        userId: removeTarget.userId,
      })

      await invalidateUsers()
      setRemoveTarget(null)
      setMessage({ text: result.message, tone: 'success' })
    } catch (error) {
      setRemoveError(
        getErrorMessage(error) ??
          'Không thể xóa học viên khỏi lớp. Vui lòng thử lại.',
      )
    }
  }

  const messageClassName =
    message?.tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-red-200 bg-red-50 text-red-700'

  return (
    <section aria-labelledby="class-users-title" className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            className="text-lg font-black text-slate-950"
            id="class-users-title"
          >
            Học viên trong lớp
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Thêm, xóa và cập nhật trạng thái học viên đang tham gia lớp học.
          </p>
        </div>
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-4 text-sm font-bold text-cyan-800 transition hover:bg-cyan-100"
          onClick={() => navigate(`/school-admin/classes/${classId}/users/import`)}
          type="button"
        >
          <Upload aria-hidden="true" className="size-4" />
          Import học viên
        </button>
      </div>

      {message ? (
        <div
          className={`rounded-lg border px-4 py-3 text-sm font-semibold ${messageClassName}`}
          role={message.tone === 'error' ? 'alert' : 'status'}
        >
          {message.text}
        </div>
      ) : null}

      <form
        className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault()
          void handleAddUser()
        }}
      >
        <label className="grid flex-1 gap-2 text-sm font-bold text-slate-700">
          ID học viên
          <input
            className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
            disabled={isActionPending}
            onChange={(event) => setUserId(event.target.value)}
            placeholder="Nhập ID học viên"
            value={userId}
          />
        </label>
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 text-sm font-bold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isActionPending}
          type="submit"
        >
          <UserPlus aria-hidden="true" className="size-4" />
          Thêm học viên
        </button>
      </form>

      {usersQuery.isLoading ? (
        <div
          className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600"
          role="status"
        >
          Đang tải danh sách học viên...
        </div>
      ) : null}

      {usersQuery.isError ? (
        <div
          className="grid gap-4 rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700"
          role="alert"
        >
          <span>
            {getErrorMessage(usersQuery.error) ??
              'Không thể tải danh sách học viên.'}
          </span>
          <button
            className="inline-flex h-10 w-fit items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-bold text-white"
            onClick={() => {
              void usersQuery.refetch()
            }}
            type="button"
          >
            Thử lại
          </button>
        </div>
      ) : null}

      {!usersQuery.isLoading && !usersQuery.isError && users.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-base font-black text-slate-950">
            Chưa có học viên trong lớp
          </p>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Nhập ID học viên để thêm học viên vào lớp.
          </p>
        </div>
      ) : null}

      {!usersQuery.isLoading && !usersQuery.isError && users.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Học viên</th>
                  <th className="px-4 py-3">ID học viên</th>
                  <th className="px-4 py-3">Số điện thoại</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Ngày tham gia</th>
                  <th className="px-4 py-3">Ngày rời lớp</th>
                  <th className="px-4 py-3">Người thêm</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((classUser) => {
                  const displayName =
                    classUser.user?.fullName?.trim() ||
                    classUser.user?.email ||
                    classUser.userId

                  return (
                    <tr className="bg-white" key={classUser.id}>
                      <td className="px-4 py-4">
                        <div className="grid text-left">
                          <span className="text-sm font-black text-slate-950">
                            {displayName}
                          </span>
                          <span className="mt-1 text-xs font-bold text-slate-500">
                            {formatNullableText(classUser.user?.email)}
                          </span>
                        </div>
                      </td>
                      <td className="max-w-56 px-4 py-4">
                        <span className="block truncate font-mono text-xs font-semibold text-slate-600">
                          {classUser.userId}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-slate-600">
                        {formatNullableText(classUser.user?.phone)}
                      </td>
                      <td className="px-4 py-4">
                        <UserStatusBadge isActive={classUser.isActive} />
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-slate-600">
                        {formatClassDate(classUser.joinedAt)}
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-slate-600">
                        {formatClassDate(classUser.leftAt)}
                      </td>
                      <td className="max-w-48 px-4 py-4">
                        <span className="block truncate text-sm font-semibold text-slate-600">
                          {formatNullableText(classUser.assignedBy)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end">
                          <ActionMenuButton
                            ariaLabel={`Mở thao tác học viên ${displayName}`}
                            disabled={isActionPending}
                            items={[
                              {
                                icon: classUser.isActive ? Ban : CheckCircle2,
                                id: 'toggle-status',
                                label: classUser.isActive
                                  ? 'Tạm dừng'
                                  : 'Kích hoạt',
                                onSelect: () => {
                                  void handleToggleUser(classUser)
                                },
                                tone: classUser.isActive ? 'default' : 'success',
                              },
                              {
                                icon: Trash2,
                                id: 'remove',
                                label: 'Xóa khỏi lớp',
                                onSelect: () => setRemoveTarget(classUser),
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
      ) : null}

      <UserPagination
        isDisabled={usersQuery.isLoading || usersQuery.isError}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
        page={page}
        pageSize={pageSize}
        totalElements={usersQuery.data?.totalElements ?? 0}
        totalPages={usersQuery.data?.totalPages ?? 0}
      />

      {removeTarget ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 py-6">
          <div
            aria-labelledby="remove-class-user-title"
            className="grid w-full max-w-md gap-5 rounded-lg bg-white p-6 shadow-xl shadow-slate-950/20"
            role="dialog"
          >
            <div>
              <h2
                className="text-xl font-black tracking-0 text-slate-950"
                id="remove-class-user-title"
              >
                Xóa học viên khỏi lớp
              </h2>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                Học viên {formatNullableText(removeTarget.user?.email)} sẽ
                không còn nằm trong danh sách lớp học này.
              </p>
            </div>

            {removeError ? (
              <div
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
                role="alert"
              >
                {removeError}
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
                disabled={removeMutation.isPending}
                onClick={() => {
                  setRemoveError(null)
                  setRemoveTarget(null)
                }}
                type="button"
              >
                Hủy
              </button>
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-70"
                disabled={removeMutation.isPending}
                onClick={() => {
                  void handleRemoveConfirm()
                }}
                type="button"
              >
                <Trash2 aria-hidden="true" className="size-4" />
                {removeMutation.isPending ? 'Đang xóa...' : 'Xóa khỏi lớp'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export function SchoolAdminClassDetailPage() {
  const { classId } = useParams()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<ActiveTab>('info')
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [pageMessage, setPageMessage] = useState<PageMessage | null>(null)
  const schoolClassQuery = useSchoolClassQuery(classId ?? null)
  const updateMutation = useUpdateSchoolClassMutation()
  const schoolClass = schoolClassQuery.data

  function closeEditDialog() {
    if (updateMutation.isPending) {
      return
    }

    setEditError(null)
    setIsEditDialogOpen(false)
  }

  async function handleUpdateClass(
    id: string,
    payload: UpdateSchoolClassRequest,
  ) {
    try {
      setEditError(null)
      const result = await updateMutation.mutateAsync({
        id,
        payload,
      })

      await queryClient.invalidateQueries({
        queryKey: classManagementQueryKeys.all,
      })
      setIsEditDialogOpen(false)
      setPageMessage({ text: result.message, tone: 'success' })
    } catch (error) {
      setEditError(
        getErrorMessage(error) ?? 'Không thể lưu lớp học. Vui lòng thử lại.',
      )
    }
  }

  if (!classId) {
    return (
      <section className="grid gap-4">
        <Link
          className="inline-flex w-fit items-center gap-2 text-sm font-bold text-cyan-700 transition hover:text-cyan-900"
          to="/school-admin/classes"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Quay lại danh sách lớp
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
          Không tìm thấy mã lớp trong đường dẫn.
        </div>
      </section>
    )
  }

  if (schoolClassQuery.isLoading) {
    return (
      <section className="grid gap-4">
        <Link
          className="inline-flex w-fit items-center gap-2 text-sm font-bold text-cyan-700 transition hover:text-cyan-900"
          to="/school-admin/classes"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Quay lại danh sách lớp
        </Link>
        <div
          className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600"
          role="status"
        >
          Đang tải thông tin lớp học...
        </div>
      </section>
    )
  }

  if (schoolClassQuery.isError) {
    return (
      <section className="grid gap-4">
        <Link
          className="inline-flex w-fit items-center gap-2 text-sm font-bold text-cyan-700 transition hover:text-cyan-900"
          to="/school-admin/classes"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Quay lại danh sách lớp
        </Link>
        <div
          className="grid gap-4 rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700"
          role="alert"
        >
          <span>
            {getErrorMessage(schoolClassQuery.error) ??
              'Không thể tải thông tin lớp học.'}
          </span>
          <button
            className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-bold text-white"
            onClick={() => {
              void schoolClassQuery.refetch()
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

  if (!schoolClass) {
    return (
      <section className="grid gap-4">
        <Link
          className="inline-flex w-fit items-center gap-2 text-sm font-bold text-cyan-700 transition hover:text-cyan-900"
          to="/school-admin/classes"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Quay lại danh sách lớp
        </Link>
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-base font-black text-slate-950">
            Không tìm thấy lớp học
          </p>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Lớp học này không tồn tại hoặc đã bị xóa.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section
      aria-labelledby="school-class-detail-title"
      className="grid gap-5 text-blue-950"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <nav
            aria-label="Đường dẫn"
            className="flex items-center gap-2 text-sm font-bold text-slate-500"
          >
            <Link className="transition hover:text-blue-800" to="/school-admin/classes">
              Quản lý lớp học
            </Link>
            <span aria-hidden="true">/</span>
            <span>Chi tiết lớp học</span>
          </nav>
          <h1
            className="mt-4 text-3xl font-black tracking-0 text-blue-950"
            id="school-class-detail-title"
          >
            Chi tiết lớp học
          </h1>
          <p className="mt-3 text-sm font-medium text-slate-500">
            Xem thông tin chi tiết và trạng thái hiện tại của lớp học.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 text-sm font-black text-blue-950 shadow-sm shadow-slate-950/5 transition hover:bg-slate-50"
            to="/school-admin/classes"
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
          <div className="inline-flex size-28 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-blue-600">
            <Rows3 aria-hidden="true" className="size-12" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-0 text-blue-950">
              {schoolClass.name}
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="min-w-42 border-slate-200 md:border-r md:pr-10">
                <p className="text-xs font-bold text-slate-500">Mã lớp</p>
                <p className="mt-2 text-base font-black text-blue-950">
                  {schoolClass.code}
                </p>
              </div>
              <div className="min-w-42 border-slate-200 md:border-r md:px-10">
                <p className="text-xs font-bold text-slate-500">Tên lớp</p>
                <p className="mt-2 text-base font-black text-blue-950">
                  {schoolClass.name}
                </p>
              </div>
              <div className="min-w-42 md:pl-10">
                <p className="text-xs font-bold text-slate-500">Trạng thái</p>
                <div className="mt-2">
                  <ClassStatusBadge status={schoolClass.status} />
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
        <div aria-label="Chi tiết lớp học" className="flex gap-1" role="tablist">
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
            Thông tin lớp
          </button>
          <button
            aria-selected={activeTab === 'users'}
            className={[
              'h-10 rounded-md px-4 text-sm font-black transition',
              activeTab === 'users'
                ? 'bg-cyan-600 text-white'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950',
            ].join(' ')}
            onClick={() => setActiveTab('users')}
            role="tab"
            type="button"
          >
            Học viên trong lớp
          </button>
        </div>
      </div>

      {activeTab === 'info' ? (
        <ClassInfoTab schoolClass={schoolClass} />
      ) : (
        <ClassUsersTab classId={classId} />
      )}

      <SchoolClassFormDialog
        errorMessage={editError ?? undefined}
        isOpen={isEditDialogOpen}
        isSubmitting={updateMutation.isPending}
        mode="edit"
        onClose={closeEditDialog}
        onCreate={() => undefined}
        onUpdate={(id, payload) => {
          void handleUpdateClass(id, payload)
        }}
        schoolClass={schoolClass}
      />
    </section>
  )
}
