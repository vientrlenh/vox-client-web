import { Plus, RefreshCw } from 'lucide-react'

type QuestionBankPageHeaderProps = {
  createLabel?: string
  description?: string
  isRefreshing: boolean
  onCreate?: () => void
  onRefresh: () => void
  title?: string
}

export function QuestionBankPageHeader({
  createLabel = 'Tạo ngân hàng',
  description = 'Theo dõi và quản lý ngân hàng câu hỏi theo quyền hiện tại.',
  isRefreshing,
  onCreate,
  onRefresh,
  title = 'Ngân hàng câu hỏi',
}: QuestionBankPageHeaderProps) {
  return (
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
      <div>
        <h1
          className="text-2xl font-black text-blue-950 sm:text-3xl"
          id="teacher-question-banks-title"
        >
          {title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-wait disabled:opacity-70"
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
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-linear-to-r from-indigo-600 to-cyan-500 px-5 text-sm font-bold text-white transition hover:opacity-90"
            onClick={onCreate}
            type="button"
          >
            <Plus aria-hidden="true" className="size-4" />
            {createLabel}
          </button>
        ) : null}
      </div>
    </div>
  )
}
