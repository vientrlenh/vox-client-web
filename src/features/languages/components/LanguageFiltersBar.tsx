import { Search } from 'lucide-react'
import type { LanguageFilters } from '../types'

type LanguageFiltersBarProps = {
  filters: LanguageFilters
  onChange: (name: keyof LanguageFilters, value: string) => void
}

export function LanguageFiltersBar({
  filters,
  onChange,
}: LanguageFiltersBarProps) {
  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[minmax(220px,1fr)_220px]">
      <label className="grid gap-2 text-sm font-bold text-blue-950">
        Tìm kiếm
        <span className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
          />
          <input
            aria-label="Tìm kiếm ngôn ngữ"
            className="h-11 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm font-medium text-blue-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            onChange={(event) => onChange('search', event.target.value)}
            placeholder="Mã hoặc tên ngôn ngữ"
            type="search"
            value={filters.search}
          />
        </span>
      </label>

      <label className="grid gap-2 text-sm font-bold text-blue-950">
        Trạng thái
        <select
          aria-label="Lọc trạng thái ngôn ngữ"
          className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-blue-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          onChange={(event) => onChange('isActive', event.target.value)}
          value={filters.isActive}
        >
          <option value="">Tất cả</option>
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Đã lưu trữ</option>
        </select>
      </label>
    </div>
  )
}
