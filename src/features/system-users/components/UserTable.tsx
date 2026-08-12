// src/features/system-users/components/UserTable.tsx

import { Search, ShieldCheck, User as UserIcon } from 'lucide-react'
import { ActionMenuButton } from '@/shared/ui/ActionMenuButton'
import type { SystemUser } from '../types'

function getDisplayName(user: SystemUser) {
  return user.fullName?.trim() || user.email || user.id
}

const ROLE_BADGE_CLASS_NAMES: Record<string, string> = {
  SCHOOL_ADMIN: 'bg-cyan-50 text-cyan-700 ring-cyan-600/20',
  STUDENT: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  SYSTEM_ADMIN: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  TEACHER: 'bg-amber-50 text-amber-700 ring-amber-600/20',
}
const DEFAULT_ROLE_BADGE_CLASS_NAME = 'bg-slate-100 text-slate-700 ring-slate-500/20'

function getRoleBadgeClassName(code: string) {
  return ROLE_BADGE_CLASS_NAMES[code] ?? DEFAULT_ROLE_BADGE_CLASS_NAME
}

type UserTableProps = {
  errorMessage?: string
  isError: boolean
  isLoading: boolean
  onRetry: () => void
  onView?: (user: SystemUser) => void
  users: SystemUser[]
}

export function UserTable({ errorMessage, isError, isLoading, onRetry, onView, users }: UserTableProps) {
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

  if (users.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <UserIcon aria-hidden="true" className="mx-auto size-10 text-slate-300" />
        <p className="mt-3 text-base font-black text-slate-950">Chưa có người dùng</p>
        <p className="mt-2 text-sm font-medium text-slate-500">
          Điều chỉnh bộ lọc hoặc chuyển trang để xem thêm người dùng.
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
              <th className="px-4 py-3">Liên hệ</th>
              <th className="px-4 py-3">Vai trò</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => {
              const displayName = getDisplayName(user)

              return (
                <tr className="bg-white" key={user.id}>
                  <td className="px-4 py-4">
                    <span className="text-sm font-black text-slate-950">{displayName}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm font-semibold text-slate-700">{user.email}</div>
                    <div className="mt-0.5 text-xs font-bold text-slate-500">{user.phone || 'Chưa cập nhật'}</div>
                  </td>
                  <td className="px-4 py-4">
                    {user.roles && user.roles.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {user.roles.map((role) => (
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold ring-1 ring-inset ${getRoleBadgeClassName(role.code)}`}
                            key={role.id}
                          >
                            <ShieldCheck className="size-3.5" />
                            {role.name || role.code}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400">Chưa gán vai trò</span>
                    )}
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
                            onSelect: () => onView?.(user),
                            tone: 'primary',
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
