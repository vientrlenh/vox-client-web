import { Search } from 'lucide-react'

export type SchoolStatusFilter = '' | 'true' | 'false'

type SchoolsFiltersBarProps = {
  keyword: string
  onKeywordChange: (value: string) => void
  onStatusChange: (value: SchoolStatusFilter) => void
  status: SchoolStatusFilter
}

const selectClassName =
  'h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'

export function SchoolsFiltersBar({ keyword, onKeywordChange, onStatusChange, status }: SchoolsFiltersBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          className="h-10 w-64 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          onChange={(event) => onKeywordChange(event.target.value)}
          placeholder="Tìm theo mã hoặc tên trường..."
          value={keyword}
        />
      </div>

      <select
        className={selectClassName}
        onChange={(event) => onStatusChange(event.target.value as SchoolStatusFilter)}
        value={status}
      >
        <option value="">Tất cả trạng thái</option>
        <option value="true">Hoạt động</option>
        <option value="false">Đã khóa</option>
      </select>
    </div>
  )
}
