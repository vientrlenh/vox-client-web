import { RefreshCw, Upload } from 'lucide-react'
import { Link } from 'react-router'

type SchoolDirectoryPageHeaderProps = {
  isRefreshing: boolean
  onRefresh: () => void
}

export function SchoolDirectoryPageHeader({
  isRefreshing,
  onRefresh,
}: SchoolDirectoryPageHeaderProps) {
  return (
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
      <div>
        <h1
          className="text-2xl font-black text-blue-950 sm:text-3xl"
          id="system-admin-school-directory-title"
        >
          Danh mục trường
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Tra cứu danh mục trường học toàn hệ thống và import dữ liệu từ file
          Excel hoặc CSV.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-wait disabled:opacity-70"
          disabled={isRefreshing}
          onClick={onRefresh}
          type="button"
        >
          <RefreshCw
            aria-hidden="true"
            className={['size-4', isRefreshing ? 'animate-spin' : ''].join(' ')}
          />
          Làm mới
        </button>
        <Link
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-black text-white transition hover:bg-indigo-700"
          to="/system-admin/school-directory/import"
        >
          <Upload aria-hidden="true" className="size-4" />
          Import danh mục
        </Link>
      </div>
    </div>
  )
}
