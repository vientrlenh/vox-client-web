import { ArrowLeft, Plus, RefreshCw } from 'lucide-react'

type QuestionPageHeaderProps = {
  isCreateDisabled?: boolean
  isRefreshing: boolean
  onBack?: () => void
  onCreate: () => void
  onRefresh: () => void
  topicName?: string
}

export function QuestionPageHeader({
  isCreateDisabled = false,
  isRefreshing,
  onBack,
  onCreate,
  onRefresh,
  topicName,
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
          Câu hỏi
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {topicName
            ? `Quản lý câu hỏi cho chủ đề: ${topicName}`
            : 'Tạo và quản lý câu hỏi cho các kỳ thi đánh giá kỹ năng nói.'}
        </p>
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

        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-linear-to-r from-indigo-600 to-cyan-500 px-5 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isCreateDisabled}
          onClick={onCreate}
          title={isCreateDisabled ? 'Chọn chủ đề trước khi tạo câu hỏi' : undefined}
          type="button"
        >
          <Plus aria-hidden="true" className="size-4" />
          Tạo câu hỏi
        </button>
      </div>
    </div>
  )
}
