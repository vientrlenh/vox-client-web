import { useEffect, useMemo, useState } from 'react'
import { ListFilter, Search, UserPlus, X } from 'lucide-react'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { getRoleDisplay } from '@/features/school-users/types'
import { getClassErrorMessage } from '../api/schoolClassApiUtils'
import { useSchoolUsersNotInClassQuery } from '../api/useSchoolUsersNotInClassQuery'
import type {
  ClassUserCandidate,
  ClassUserCandidateFilters,
  SchoolUserRoleCode,
} from '../types'
import { formatNullableText } from '../types'

export type SelectedClassUser = {
  email: string | null
  fullName: string | null
  userId: string
}

type ClassUserPickerDialogProps = {
  classId: string
  errorMessage?: string
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (selected: SelectedClassUser[]) => void
}

const PAGE_SIZE = 10
const SEARCH_DEBOUNCE_MS = 350

const EMPTY_FILTERS: ClassUserCandidateFilters = {
  roleCode: '',
  search: '',
}

const ROLE_FILTERS: Array<{ label: string; value: '' | SchoolUserRoleCode }> = [
  { label: 'Tất cả vai trò', value: '' },
  { label: 'Học sinh', value: 'STUDENT' },
  { label: 'Giáo viên', value: 'TEACHER' },
]

function toSelected(candidate: ClassUserCandidate): SelectedClassUser {
  return {
    email: candidate.user?.email ?? null,
    fullName: candidate.user?.fullName ?? null,
    userId: candidate.userId,
  }
}

function displayName(candidate: ClassUserCandidate) {
  return (
    candidate.user?.fullName?.trim() ||
    candidate.user?.email ||
    candidate.userId
  )
}

/**
 * Chọn nhiều người dùng của trường để thêm vào một lớp.
 *
 * <p>Danh sách được lọc và phân trang phía server; những người đang là thành viên
 * active của lớp, hoặc có tài khoản không hoạt động (endpoint thêm vào lớp sẽ từ chối),
 * đều đã bị loại từ tầng query. Lựa chọn được giữ theo `userId` nên đổi trang hay đổi
 * bộ lọc không làm mất những người đã tick.
 *
 * <p>Component chỉ được render khi hộp thoại mở, nên bộ lọc và danh sách đã chọn tự
 * reset theo vòng đời mount thay vì phải dọn bằng effect.
 */
export function ClassUserPickerDialog({
  classId,
  errorMessage,
  isSubmitting,
  onClose,
  onSubmit,
}: ClassUserPickerDialogProps) {
  const [filters, setFilters] = useState<ClassUserCandidateFilters>(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Map<string, SelectedClassUser>>(
    new Map(),
  )

  // Gõ tới đâu bắn request tới đó thì mỗi ký tự là một round-trip; queryKey chứa
  // từ khoá nên phải chặn ở đây chứ không chặn được ở tầng query.
  const debouncedSearch = useDebouncedValue(filters.search, SEARCH_DEBOUNCE_MS)
  const appliedFilters = useMemo<ClassUserCandidateFilters>(
    () => ({ ...filters, search: debouncedSearch }),
    [debouncedSearch, filters],
  )

  const candidatesQuery = useSchoolUsersNotInClassQuery(
    classId,
    page,
    PAGE_SIZE,
    appliedFilters,
  )
  const candidates = candidatesQuery.data?.content ?? []
  const totalPages = candidatesQuery.data?.totalPages ?? 0
  const totalElements = candidatesQuery.data?.totalElements ?? 0

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isSubmitting, onClose])

  const pageUserIds = candidates.map((candidate) => candidate.userId)
  const isPageFullySelected =
    pageUserIds.length > 0 &&
    pageUserIds.every((userId) => selected.has(userId))

  function toggleCandidate(candidate: ClassUserCandidate) {
    setSelected((current) => {
      const next = new Map(current)

      if (next.has(candidate.userId)) {
        next.delete(candidate.userId)
      } else {
        next.set(candidate.userId, toSelected(candidate))
      }

      return next
    })
  }

  function togglePage() {
    setSelected((current) => {
      const next = new Map(current)

      if (isPageFullySelected) {
        pageUserIds.forEach((userId) => next.delete(userId))
      } else {
        candidates.forEach((candidate) => {
          next.set(candidate.userId, toSelected(candidate))
        })
      }

      return next
    })
  }

  function handleFilterChange<TKey extends keyof ClassUserCandidateFilters>(
    key: TKey,
    value: ClassUserCandidateFilters[TKey],
  ) {
    setFilters((current) => ({ ...current, [key]: value }))
    setPage(1)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <section
        aria-labelledby="class-user-picker-title"
        aria-modal="true"
        className="flex max-h-[88vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl"
        role="dialog"
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h2
              className="text-lg font-black text-slate-900"
              id="class-user-picker-title"
            >
              Thêm học viên vào lớp
            </h2>
            <p className="mt-0.5 text-[12.5px] font-medium text-slate-500">
              Chỉ hiển thị người dùng đang hoạt động và chưa ở trong lớp này.
            </p>
          </div>
          <button
            aria-label="Đóng hộp thoại"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="grid gap-3 border-b border-slate-200 px-6 py-3.5 md:grid-cols-[minmax(180px,1fr)_190px]">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            />
            <input
              aria-label="Tìm người dùng"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 text-[13.5px] font-medium text-slate-700 outline-none focus:border-cyan-400"
              onChange={(event) =>
                handleFilterChange('search', event.target.value)
              }
              placeholder="Họ tên, email hoặc SĐT"
              type="search"
              value={filters.search}
            />
          </div>
          <div className="relative">
            <ListFilter
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            />
            <select
              aria-label="Lọc theo vai trò"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-[13.5px] font-medium text-slate-700 outline-none focus:border-cyan-400"
              onChange={(event) =>
                handleFilterChange(
                  'roleCode',
                  event.target.value as '' | SchoolUserRoleCode,
                )
              }
              value={filters.roleCode}
            >
              {ROLE_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {errorMessage ? (
          <div
            className="mx-6 mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
            role="alert"
          >
            {errorMessage}
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto px-6 py-3">
          {candidatesQuery.isLoading ? (
            <p className="py-10 text-center text-sm text-slate-400" role="status">
              Đang tải danh sách người dùng…
            </p>
          ) : null}

          {candidatesQuery.isError ? (
            <div
              className="grid gap-3 rounded-lg border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700"
              role="alert"
            >
              <span>
                {getClassErrorMessage(candidatesQuery.error) ??
                  'Không thể tải danh sách người dùng.'}
              </span>
              <button
                className="inline-flex h-9 w-fit items-center justify-center rounded-lg bg-red-600 px-4 text-xs font-bold text-white"
                onClick={() => {
                  void candidatesQuery.refetch()
                }}
                type="button"
              >
                Thử lại
              </button>
            </div>
          ) : null}

          {!candidatesQuery.isLoading &&
          !candidatesQuery.isError &&
          candidates.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">
              Không tìm thấy người dùng phù hợp.
            </p>
          ) : null}

          {!candidatesQuery.isLoading &&
          !candidatesQuery.isError &&
          candidates.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left">
                <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
                  <tr>
                    <th className="w-12 px-4 py-3">
                      <input
                        aria-label="Chọn tất cả người dùng trong trang"
                        checked={isPageFullySelected}
                        className="size-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                        onChange={togglePage}
                        type="checkbox"
                      />
                    </th>
                    <th className="px-4 py-3">Người dùng</th>
                    <th className="px-4 py-3">Số điện thoại</th>
                    <th className="px-4 py-3">Vai trò</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {candidates.map((candidate) => {
                    const name = displayName(candidate)
                    const isChecked = selected.has(candidate.userId)

                    return (
                      <tr className="bg-white" key={candidate.userId}>
                        <td className="px-4 py-3">
                          <input
                            aria-label={`Chọn ${name}`}
                            checked={isChecked}
                            className="size-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                            onChange={() => toggleCandidate(candidate)}
                            type="checkbox"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="grid text-left">
                            <span className="text-sm font-black text-slate-950">
                              {name}
                            </span>
                            <span className="mt-0.5 text-xs font-bold text-slate-500">
                              {formatNullableText(candidate.user?.email)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-600">
                          {formatNullableText(candidate.user?.phone)}
                        </td>
                        <td className="px-4 py-3">
                          <ClassUserRoleBadges roles={candidate.user?.roles} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs font-medium text-slate-500">
            <b className="font-extrabold tabular-nums text-slate-900">
              {totalElements}
            </b>{' '}
            người dùng · trang {totalPages ? page : 0}/{totalPages}
          </span>
          <div className="flex gap-2">
            <button
              className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
              disabled={candidatesQuery.isFetching || page <= 1}
              onClick={() => setPage((current) => current - 1)}
              type="button"
            >
              Trước
            </button>
            <button
              className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
              disabled={candidatesQuery.isFetching || page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              type="button"
            >
              Sau
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
            <span>Đã chọn {selected.size} người</span>
            {selected.size > 0 ? (
              <button
                className="text-xs font-bold text-cyan-700 underline-offset-2 transition hover:underline disabled:opacity-50"
                disabled={isSubmitting}
                onClick={() => setSelected(new Map())}
                type="button"
              >
                Bỏ chọn tất cả
              </button>
            ) : null}
          </div>
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
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 text-sm font-bold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting || selected.size === 0}
              onClick={() => onSubmit([...selected.values()])}
              type="button"
            >
              <UserPlus aria-hidden="true" className="size-4" />
              {isSubmitting
                ? 'Đang thêm...'
                : `Thêm ${selected.size} người vào lớp`}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

type ClassUserRoleBadgesProps = {
  roles?: { code: string; id: string; name: string | null }[] | null
}

export function ClassUserRoleBadges({ roles }: ClassUserRoleBadgesProps) {
  if (!roles || roles.length === 0) {
    return <span className="text-sm font-semibold text-slate-400">-</span>
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {roles.map((role) => {
        const display = getRoleDisplay(role.code)

        return (
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${display.className}`}
            key={role.id}
          >
            {display.label}
          </span>
        )
      })}
    </div>
  )
}
