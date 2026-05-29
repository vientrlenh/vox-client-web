import { Calendar, ChevronDown, Filter, RefreshCw } from 'lucide-react'

type RegistrationPageHeaderProps = {
  isRefreshing: boolean
  onRefresh: () => void
}

export function RegistrationPageHeader({
  isRefreshing,
  onRefresh,
}: RegistrationPageHeaderProps) {
  return (
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
      <div>
        <h1
          className="text-2xl font-black text-blue-950 sm:text-3xl"
          id="system-admin-registrations-title"
        >
          Quản lý đơn đăng ký
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Theo dõi, xét duyệt và quản lý các yêu cầu đăng ký tài khoản trường
          học.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          className="inline-flex h-11 min-w-48 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-blue-950 disabled:cursor-not-allowed disabled:opacity-70"
          disabled
          type="button"
        >
          <span className="inline-flex items-center gap-2">
            <Filter aria-hidden="true" className="size-4 text-indigo-600" />
            Tất cả trạng thái
          </span>
          <ChevronDown aria-hidden="true" className="size-4" />
        </button>

        <button
          className="inline-flex h-11 min-w-60 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-blue-950 disabled:cursor-not-allowed disabled:opacity-70"
          disabled
          type="button"
        >
          <span className="inline-flex items-center gap-2">
            <Calendar aria-hidden="true" className="size-4 text-indigo-600" />
            01/05/2024 - 31/05/2024
          </span>
          <ChevronDown aria-hidden="true" className="size-4" />
        </button>

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

        
      </div>
    </div>
  )
}
