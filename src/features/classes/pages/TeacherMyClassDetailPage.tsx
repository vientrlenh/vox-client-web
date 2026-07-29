import { useMemo, useState } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { ArrowLeft, Info, RefreshCw, Search, Users } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { TabPillGroup } from '@/shared/ui/TabPill'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { useMyClassMembersQuery } from '../api/useMyClassMembersQuery'
import { useMyClassQuery } from '../api/useMyClassQuery'
import type {
  MyClass,
  MyClassMember,
  MyClassMemberFilters,
  RelatedClassObject,
} from '../types'
import {
  formatClassDate,
  formatNullableText,
  getClassStatusDisplay,
} from '../types'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300
const EMPTY_MEMBER_FILTERS: MyClassMemberFilters = {
  roleCode: '',
  search: '',
}

type DetailTab = 'info' | 'members'

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

function getRoleLabel(roleCodes: string[]) {
  if (roleCodes.includes('TEACHER')) {
    return 'Giáo viên'
  }

  if (roleCodes.includes('STUDENT')) {
    return 'Học sinh'
  }

  return '-'
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
        <span className="inline-flex size-9 items-center justify-center rounded-full bg-cyan-50 text-cyan-600">
          <Icon aria-hidden={true} className="size-5" />
        </span>
        <h2 className="text-base font-black text-slate-950">{title}</h2>
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
      <span className="min-w-0 font-black text-slate-950">{value}</span>
    </div>
  )
}

type ClassInfoTabProps = {
  schoolClass: MyClass
}

function ClassInfoTab({ schoolClass }: ClassInfoTabProps) {
  const status = getClassStatusDisplay(schoolClass.status)

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <DetailCard icon={Info} title="Thông tin lớp">
        <DetailRow label="Mã lớp" value={schoolClass.code} />
        <DetailRow label="Tên lớp" value={schoolClass.name} />
        <DetailRow
          label="Mô tả"
          value={formatNullableText(schoolClass.description)}
        />
        <DetailRow
          label="Trạng thái"
          value={
            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${status.className}`}
            >
              {status.label}
            </span>
          }
        />
      </DetailCard>

      <DetailCard icon={Users} title="Phân loại & quy mô">
        <DetailRow
          label="Niên học"
          value={getRelatedLabel(schoolClass.schoolGrade)}
        />
        <DetailRow
          label="Ngôn ngữ"
          value={getRelatedLabel(schoolClass.language)}
        />
        <DetailRow label="Sĩ số" value={schoolClass.activeMemberCount} />
        <DetailRow
          label="Ngày tạo"
          value={formatClassDate(schoolClass.createdAt)}
        />
        <DetailRow
          label="Cập nhật"
          value={formatClassDate(schoolClass.updatedAt)}
        />
      </DetailCard>
    </div>
  )
}

type MemberTableProps = {
  errorMessage?: string
  isError: boolean
  isLoading: boolean
  members: MyClassMember[]
  onRetry: () => void
}

function MemberTable({
  errorMessage,
  isError,
  isLoading,
  members,
  onRetry,
}: MemberTableProps) {
  if (isLoading) {
    return (
      <div
        className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600"
        role="status"
      >
        Đang tải danh sách thành viên...
      </div>
    )
  }

  if (isError) {
    return (
      <div
        className="grid gap-4 rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700"
        role="alert"
      >
        <span>{errorMessage ?? 'Không thể tải danh sách thành viên.'}</span>
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

  if (!members.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-base font-black text-slate-950">
          Chưa có thành viên
        </p>
        <p className="mt-2 text-sm font-medium text-slate-500">
          Không có thành viên nào khớp bộ lọc hiện tại.
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
              <th className="px-4 py-3">Họ tên</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Số điện thoại</th>
              <th className="px-4 py-3">Vai trò</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Ngày tham gia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {members.map((member) => (
              <tr className="bg-white" key={member.id}>
                <td className="px-4 py-4 text-sm font-black text-slate-950">
                  {formatNullableText(member.user?.fullName)}
                </td>
                <td className="px-4 py-4 text-sm font-semibold text-slate-600">
                  {formatNullableText(member.user?.email)}
                </td>
                <td className="px-4 py-4 text-sm font-semibold text-slate-600">
                  {formatNullableText(member.user?.phone)}
                </td>
                <td className="px-4 py-4 text-sm font-semibold text-slate-600">
                  {getRoleLabel(member.user?.roleCodes ?? [])}
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${
                      member.isActive
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-slate-100 text-slate-600'
                    }`}
                  >
                    {member.isActive ? 'Đang học' : 'Đã rời lớp'}
                  </span>
                </td>
                <td className="px-4 py-4 text-sm font-semibold text-slate-600">
                  {formatClassDate(member.joinedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

type MembersTabProps = {
  classId: string
}

function MembersTab({ classId }: MembersTabProps) {
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [filters, setFilters] = useState<MyClassMemberFilters>(
    EMPTY_MEMBER_FILTERS,
  )

  const debouncedSearch = useDebouncedValue(filters.search, SEARCH_DEBOUNCE_MS)
  const appliedFilters = useMemo<MyClassMemberFilters>(
    () => ({ ...filters, search: debouncedSearch }),
    [debouncedSearch, filters],
  )

  const membersQuery = useMyClassMembersQuery(
    classId,
    page,
    DEFAULT_PAGE_SIZE,
    appliedFilters,
  )
  const members = membersQuery.data?.content ?? []
  const totalPages = membersQuery.data?.totalPages ?? 0
  const totalElements = membersQuery.data?.totalElements ?? 0

  function handleFilterChange(
    name: keyof MyClassMemberFilters,
    value: string,
  ) {
    setFilters((current) => ({
      ...current,
      [name]: value,
    }))
    setPage(DEFAULT_PAGE)
  }

  return (
    <section aria-labelledby="class-members-title" className="grid gap-4">
      <h2 className="sr-only" id="class-members-title">
        Thành viên lớp
      </h2>

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
              placeholder="Họ tên hoặc email"
              type="search"
              value={filters.search}
            />
          </span>
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Vai trò
          <select
            className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
            onChange={(event) =>
              handleFilterChange('roleCode', event.target.value)
            }
            value={filters.roleCode}
          >
            <option value="">Tất cả</option>
            <option value="TEACHER">Giáo viên</option>
            <option value="STUDENT">Học sinh</option>
          </select>
        </label>
      </div>

      <MemberTable
        errorMessage={getErrorMessage(membersQuery.error)}
        isError={membersQuery.isError}
        isLoading={membersQuery.isLoading}
        members={members}
        onRetry={() => {
          void membersQuery.refetch()
        }}
      />

      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <span>
          {totalElements} thành viên, trang {totalPages ? page : 0}/{totalPages}
        </span>
        <div className="flex items-center gap-2">
          <button
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
            type="button"
          >
            Trước
          </button>
          <button
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 disabled:opacity-50"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
            type="button"
          >
            Sau
          </button>
        </div>
      </div>
    </section>
  )
}

export function TeacherMyClassDetailPage() {
  const { classId } = useParams<{ classId: string }>()
  const [tab, setTab] = useState<DetailTab>('info')
  const classQuery = useMyClassQuery(classId ?? null)
  const schoolClass = classQuery.data

  const backLink = (
    <Link
      className="inline-flex h-11 w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
      to="/teacher/classes"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      Quay lại danh sách
    </Link>
  )

  if (classQuery.isLoading) {
    return (
      <div
        className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600"
        role="status"
      >
        Đang tải thông tin lớp học...
      </div>
    )
  }

  // Backend cố tình trả "không tìm thấy" cho cả lớp không tồn tại lẫn lớp mình
  // không thuộc, nên FE gộp chung một thông báo.
  if (classQuery.isError || !schoolClass) {
    return (
      <section className="grid gap-4">
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          role="alert"
        >
          Không tìm thấy lớp học hoặc bạn không có quyền truy cập.
        </div>
        {backLink}
      </section>
    )
  }

  return (
    <section aria-labelledby="teacher-my-class-detail-title" className="grid gap-6">
      <div className="grid gap-4">
        {backLink}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase text-cyan-700">
              Chi tiết lớp
            </p>
            <h1
              className="mt-2 text-3xl font-black tracking-0 text-slate-950"
              id="teacher-my-class-detail-title"
            >
              {schoolClass.name}
            </h1>
            <p className="mt-2 text-sm font-bold text-slate-500">
              {schoolClass.code}
            </p>
          </div>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            disabled={classQuery.isFetching}
            onClick={() => {
              void classQuery.refetch()
            }}
            type="button"
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            Làm mới
          </button>
        </div>
      </div>

      <TabPillGroup<DetailTab>
        items={[
          { label: 'Thông tin lớp', value: 'info' },
          { label: 'Thành viên', value: 'members' },
        ]}
        onChange={setTab}
        value={tab}
      />

      {tab === 'info' ? (
        <ClassInfoTab schoolClass={schoolClass} />
      ) : (
        <MembersTab classId={schoolClass.id} />
      )}
    </section>
  )
}
