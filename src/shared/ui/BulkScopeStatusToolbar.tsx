import { Archive, CheckCircle2, X } from 'lucide-react'

type BulkScopeStatusToolbarProps = {
  /** Danh từ số ít: "ngân hàng câu hỏi", "chủ đề câu hỏi". */
  entityNoun: string
  isPending: boolean
  onArchive: () => void
  onClearSelection: () => void
  onPublish: () => void
  selectedCount: number
}

/**
 * Thanh thao tác hàng loạt, chỉ hiện khi đã chọn ít nhất một mục.
 *
 * Lựa chọn được giữ xuyên trang (state nằm ở trang cha, không phải ở bảng), nên số đếm ở đây có thể
 * lớn hơn số dòng đang thấy — vì vậy luôn có nút bỏ chọn để thoát ra mà không phải lần lại từng trang.
 */
export function BulkScopeStatusToolbar({
  entityNoun,
  isPending,
  onArchive,
  onClearSelection,
  onPublish,
  selectedCount,
}: BulkScopeStatusToolbarProps) {
  if (selectedCount === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3">
      <p className="text-sm font-bold text-indigo-900">
        {`Đã chọn ${selectedCount} ${entityNoun}`}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
          onClick={onPublish}
          type="button"
        >
          <CheckCircle2 aria-hidden="true" className="size-4" />
          Xuất bản
        </button>

        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
          onClick={onArchive}
          type="button"
        >
          <Archive aria-hidden="true" className="size-4" />
          Lưu trữ
        </button>

        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
          onClick={onClearSelection}
          type="button"
        >
          <X aria-hidden="true" className="size-4" />
          Bỏ chọn
        </button>
      </div>
    </div>
  )
}
