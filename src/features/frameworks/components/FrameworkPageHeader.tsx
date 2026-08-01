import { Plus, RefreshCw } from 'lucide-react'

type FrameworkPageHeaderProps = {
  isRefreshing: boolean
  onCreate?: () => void
  onRefresh: () => void
}

export function FrameworkPageHeader({
  isRefreshing,
  onCreate,
  onRefresh,
}: FrameworkPageHeaderProps) {
  return (
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
      <div>
        <h1
          className="text-2xl font-black text-blue-950 sm:text-3xl"
          id="system-admin-frameworks-title"
        >
          Quản lý khung đánh giá năng lực
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Tạo, cập nhật và quản lý trạng thái các khung đánh giá năng lực đánh giá kỹ năng nói.
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
        {onCreate ? (
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-black text-white transition hover:bg-indigo-700"
            onClick={onCreate}
            type="button"
          >
            <Plus aria-hidden="true" className="size-4" />
            Tạo khung đánh giá năng lực
          </button>
        ) : null}
      </div>
    </div>
  )
}
