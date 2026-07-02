import { ArrowLeft, Download, Plus, RefreshCw, Upload } from 'lucide-react'

type QuestionPageHeaderProps = {
  createLabel?: string
  description?: string
  isCreateDisabled?: boolean
  isExporting?: boolean
  isRefreshing: boolean
  onBack?: () => void
  onCreate?: () => void
  onExport?: () => void
  onImport?: () => void
  onRefresh: () => void
  title?: string
}

export function QuestionPageHeader({
  createLabel = 'Tạo câu hỏi',
  description = 'Quản lý và theo dõi danh sách câu hỏi theo quyền hiện tại.',
  isCreateDisabled = false,
  isExporting = false,
  isRefreshing,
  onBack,
  onCreate,
  onExport,
  onImport,
  onRefresh,
  title = 'Câu hỏi',
}: QuestionPageHeaderProps) {
  return (
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
      <div>
        {onBack ? (
          <button
            className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-indigo-600 transition hover:text-indigo-800"
            onClick={onBack}
            type="button"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Quay lại danh sách chủ đề
          </button>
        ) : null}
        <h1
          className="text-2xl font-black text-blue-950 sm:text-3xl"
          id="teacher-questions-title"
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

        {onExport ? (
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70"
            disabled={isExporting}
            onClick={onExport}
            type="button"
          >
            <Download aria-hidden="true" className="size-4" />
            {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
          </button>
        ) : null}

        {onImport ? (
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            onClick={onImport}
            type="button"
          >
            <Upload aria-hidden="true" className="size-4" />
            Nhập từ Excel
          </button>
        ) : null}

        {onCreate ? (
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-linear-to-r from-indigo-600 to-cyan-500 px-5 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isCreateDisabled}
            onClick={onCreate}
            title={isCreateDisabled ? 'Chọn chủ đề trước khi tạo câu hỏi' : undefined}
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
