import type { ComponentType, ReactNode } from 'react'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CalendarDays,
  Info,
  Pencil,
  RefreshCw,
  UserRound,
} from 'lucide-react'
import { Link, useParams } from 'react-router'
import { RoleBadges } from '../components/SchoolUserBadges'
import { SchoolUserFormDialog } from '../components/SchoolUserFormDialog'
import { useUpdateSchoolUserMutation } from '../api/useSchoolUserMutations'
import { useSchoolUserQuery } from '../api/useSchoolUserQuery'
import { schoolUserManagementQueryKeys } from '../api/useSchoolUsersQuery'
import type { SchoolUser, UpdateSchoolUserInput } from '../types'
import { formatNullableText, formatUserDate } from '../types'

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

type BackLinkProps = {
  label?: string
}

function BackLink({ label = 'Quay lại danh sách' }: BackLinkProps) {
  return (
    <Link
      className="inline-flex w-fit items-center gap-2 text-sm font-bold text-cyan-700 transition hover:text-cyan-900"
      to="/school-admin/students"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      {label}
    </Link>
  )
}

export function SchoolAdminSchoolUserDetailPage() {
  const { userId } = useParams()
  const queryClient = useQueryClient()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [pageMessage, setPageMessage] = useState<PageMessage | null>(null)
  const schoolUserQuery = useSchoolUserQuery(userId ?? null)
  const updateMutation = useUpdateSchoolUserMutation()
  const schoolUser = schoolUserQuery.data

  function closeEditDialog() {
    if (updateMutation.isPending) {
      return
    }

    setEditError(null)
    setIsEditOpen(false)
  }

  async function handleUpdate(id: string, input: UpdateSchoolUserInput) {
    try {
      setEditError(null)
      const result = await updateMutation.mutateAsync({ input, userId: id })

      await queryClient.invalidateQueries({
        queryKey: schoolUserManagementQueryKeys.all,
      })
      setIsEditOpen(false)
      setPageMessage({ text: result.message, tone: 'success' })
    } catch (error) {
      setEditError(
        getErrorMessage(error) ??
          'Không thể lưu người dùng. Vui lòng thử lại.',
      )
    }
  }

  if (!userId) {
    return (
      <section className="grid gap-4">
        <BackLink />
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
          Không tìm thấy mã người dùng trong đường dẫn.
        </div>
      </section>
    )
  }

  if (schoolUserQuery.isLoading) {
    return (
      <section className="grid gap-4">
        <BackLink />
        <div
          className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600"
          role="status"
        >
          Đang tải thông tin người dùng...
        </div>
      </section>
    )
  }

  if (schoolUserQuery.isError) {
    return (
      <section className="grid gap-4">
        <BackLink />
        <div
          className="grid gap-4 rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700"
          role="alert"
        >
          <span>
            {getErrorMessage(schoolUserQuery.error) ??
              'Không thể tải thông tin người dùng.'}
          </span>
          <button
            className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-bold text-white"
            onClick={() => {
              void schoolUserQuery.refetch()
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

  if (!schoolUser) {
    return (
      <section className="grid gap-4">
        <BackLink />
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-base font-black text-slate-950">
            Không tìm thấy người dùng nhà trường theo yêu cầu
          </p>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Người dùng này không tồn tại hoặc đã bị xóa.
          </p>
        </div>
      </section>
    )
  }

  const profile = schoolUser.user
  const displayName =
    profile?.fullName?.trim() || profile?.email || schoolUser.userId || '-'

  return (
    <section
      aria-labelledby="school-user-detail-title"
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
              to="/school-admin/students"
            >
              Người dùng nhà trường
            </Link>
            <span aria-hidden="true">/</span>
            <span>Chi tiết</span>
          </nav>
          <h1
            className="mt-4 text-3xl font-black tracking-0 text-blue-950"
            id="school-user-detail-title"
          >
            Chi tiết người dùng
          </h1>
          <p className="mt-3 text-sm font-medium text-slate-500">
            Xem thông tin chi tiết và cập nhật hồ sơ người dùng.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 text-sm font-black text-blue-950 shadow-sm shadow-slate-950/5 transition hover:bg-slate-50"
            to="/school-admin/students"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Quay lại
          </Link>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-5 text-sm font-black text-white shadow-sm shadow-cyan-950/20 transition hover:bg-cyan-700"
            onClick={() => {
              setEditError(null)
              setIsEditOpen(true)
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
          <div className="inline-flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-50 text-blue-600">
            {profile?.avatarUrl ? (
              <img
                alt={displayName}
                className="size-full object-cover"
                src={profile.avatarUrl}
              />
            ) : (
              <UserRound aria-hidden="true" className="size-10" />
            )}
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-0 text-blue-950">
              {displayName}
            </h2>
            <p className="mt-1 text-sm font-bold text-slate-500">
              {formatNullableText(profile?.email)}
            </p>
            <div className="mt-3">
              <RoleBadges roles={profile?.schoolRoles} />
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

      <div className="grid gap-5 xl:grid-cols-2">
        <DetailCard icon={Info} title="Thông tin cơ bản">
          <DetailRow label="Họ tên" value={formatNullableText(profile?.fullName)} />
          <DetailRow label="Email" value={formatNullableText(profile?.email)} />
          <DetailRow
            label="Số điện thoại"
            value={formatNullableText(profile?.phone)}
          />
          <DetailRow
            label="Ngày sinh"
            value={formatUserDate(profile?.dateOfBirth)}
          />
          <DetailRow
            label="Địa chỉ"
            value={formatNullableText(profile?.address)}
          />
        </DetailCard>

        <DetailCard icon={CalendarDays} title="Thời gian tham gia">
          <DetailRow
            label="Ngày bắt đầu"
            value={formatUserDate(schoolUser.startDate)}
          />
          <DetailRow
            label="Ngày kết thúc"
            value={
              schoolUser.endDate
                ? formatUserDate(schoolUser.endDate)
                : 'Không thời hạn'
            }
          />
          <DetailRow label="Vai trò" value={<RoleBadges roles={profile?.schoolRoles} />} />
        </DetailCard>
      </div>

      <SchoolUserFormDialog
        errorMessage={editError ?? undefined}
        isOpen={isEditOpen}
        isSubmitting={updateMutation.isPending}
        mode="edit"
        onClose={closeEditDialog}
        onCreate={() => undefined}
        onUpdate={(id, input) => {
          void handleUpdate(id, input)
        }}
        schoolUser={schoolUser as SchoolUser}
      />
    </section>
  )
}
