// src/features/system-users/components/UserFiltersBar.tsx

import { Search } from 'lucide-react'

export type UserFilters = {
  role: string
  search: string
}

type UserFiltersBarProps = {
  filters: UserFilters
  onChange: (name: keyof UserFilters, value: string) => void
  roleOptions: { code: string; label: string }[]
}

export function UserFiltersBar({ filters, onChange, roleOptions }: UserFiltersBarProps) {
  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[minmax(180px,1fr)_180px]">
      <label className="grid gap-2 text-sm font-bold text-slate-700">
        Tìm kiếm
        <span className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
          />
          <input
            className="h-11 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
            onChange={(event) => onChange('search', event.target.value)}
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
          onChange={(event) => onChange('role', event.target.value)}
          value={filters.role}
        >
          <option value="">Tất cả</option>
          {roleOptions.map((role) => (
            <option key={role.code} value={role.code}>
              {role.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
