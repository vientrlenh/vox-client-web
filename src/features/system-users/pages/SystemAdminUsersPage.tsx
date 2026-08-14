// src/features/system-users/pages/SystemAdminUsersPage.tsx

import { useMemo, useState } from 'react'
import { RefreshCw, Users } from 'lucide-react'
import { Pagination } from '@/shared/components/Pagination'
import { useUsersQuery } from '../api/useUsersQuery'
import { UserDetailDialog } from '../components/UserDetailDialog'
import { UserFiltersBar, type UserFilters } from '../components/UserFiltersBar'
import { UserTable } from '../components/UserTable'
import type { SystemUser } from '../types'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 20
const EMPTY_FILTERS: UserFilters = {
  role: '',
  search: '',
}

export function SystemAdminUsersPage() {
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [pageSize] = useState(DEFAULT_PAGE_SIZE)
  const [filters, setFilters] = useState<UserFilters>(EMPTY_FILTERS)
  const [viewingUserId, setViewingUserId] = useState<string | null>(null)

  const { data, error, isLoading, isError, refetch, isFetching } = useUsersQuery(page, pageSize)

  const users = useMemo(() => data?.content ?? [], [data])
  const totalElements = data?.totalElements ?? 0
  const totalPages = Math.ceil(totalElements / pageSize)

  const roleOptions = useMemo(() => {
    const byCode = new Map<string, string>()
    for (const user of users) {
      for (const role of user.roles ?? []) {
        byCode.set(role.code, role.name || role.code)
      }
    }
    return Array.from(byCode, ([code, label]) => ({ code, label }))
  }, [users])

  const visibleUsers = useMemo(() => {
    const keyword = filters.search.trim().toLowerCase()

    return users.filter((user) => {
      const matchesRole = !filters.role || (user.roles ?? []).some((role) => role.code === filters.role)
      const matchesKeyword =
        !keyword ||
        [user.fullName, user.email, user.phone].some((field) => field?.toLowerCase().includes(keyword))

      return matchesRole && matchesKeyword
    })
  }, [users, filters])

  function handleFilterChange(name: keyof UserFilters, value: string) {
    setFilters((current) => ({ ...current, [name]: value }))
  }

  function handleView(user: SystemUser) {
    setViewingUserId(user.id)
  }

  return (
    <section aria-labelledby="system-admin-users-title" className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="mt-1 inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-cyan-700">
            <Users aria-hidden="true" className="size-6" />
          </span>
          <div>
            <p className="text-sm font-black uppercase text-cyan-700">Quản lý người dùng</p>
            <h1 className="mt-1 text-3xl font-black tracking-0 text-slate-950" id="system-admin-users-title">
              Người dùng trong hệ thống
            </h1>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-600">
              Tra cứu người dùng và vai trò của họ trên toàn hệ thống. Tìm kiếm và lọc vai trò áp dụng trong trang
              hiện tại.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            disabled={isFetching}
            onClick={() => {
              void refetch()
            }}
            type="button"
          >
            <RefreshCw aria-hidden="true" className={`size-4 ${isFetching ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      <UserFiltersBar filters={filters} onChange={handleFilterChange} roleOptions={roleOptions} />

      <div className="grid h-fit gap-4">
        <UserTable
          errorMessage={error instanceof Error ? error.message : undefined}
          isError={isError}
          isLoading={isLoading}
          onRetry={() => {
            void refetch()
          }}
          onView={handleView}
          users={visibleUsers}
        />
        <Pagination
          currentPage={page}
          itemName="người dùng"
          onPageChange={setPage}
          totalElements={totalElements}
          totalPages={totalPages}
        />
      </div>

      <UserDetailDialog
        isOpen={viewingUserId !== null}
        onClose={() => setViewingUserId(null)}
        userId={viewingUserId}
      />
    </section>
  )
}
