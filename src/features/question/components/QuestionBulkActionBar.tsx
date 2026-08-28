import type { BulkActionPlan } from '../bulkStatus'
import { formatSkipGroups } from '../bulkStatus'
import type { QuestionWorkflowAction } from '../permissions'

export type BulkActionOption = {
  action: QuestionWorkflowAction
  buttonLabel: string
  confirmVerb: string
  label: string
  successVerb: string
}

export type BulkActionOptionWithCount = BulkActionOption & {
  eligibleCount: number
}

type QuestionBulkActionBarProps = {
  actionOptions: BulkActionOptionWithCount[]
  isProcessing: boolean
  onActionChange: (action: QuestionWorkflowAction) => void
  onClear: () => void
  onKeepEligible: () => void
  onRun: () => void
  plan: BulkActionPlan
  selectedAction: BulkActionOption | null
  selectedCount: number
  selectedOnPageCount: number
}

export function QuestionBulkActionBar({
  actionOptions,
  isProcessing,
  onActionChange,
  onClear,
  onKeepEligible,
  onRun,
  plan,
  selectedAction,
  selectedCount,
  selectedOnPageCount,
}: QuestionBulkActionBarProps) {
  const eligibleCount = plan.eligible.length
  const skippedCount = plan.skipped.length
  const hasSelection = selectedCount > 0

  return (
    <div className="grid gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* min-w-0 + flex-1: cột chữ nuốt hết phần rộng còn thừa nên cụm điều khiển bên phải
            không bị đẩy ngang mỗi khi nội dung chữ dài ngắn khác nhau. */}
        <div className="grid min-w-0 flex-1 basis-64 gap-1 text-sm text-indigo-900">
          {hasSelection ? (
            <span className="font-semibold">
              Đang chọn {selectedCount} câu hỏi
              {selectedCount > selectedOnPageCount
                ? ` (${selectedOnPageCount} câu trên trang này)`
                : ''}
              .
            </span>
          ) : (
            <span className="font-semibold">
              Chọn câu hỏi ở bảng bên dưới để xử lý nhiều câu cùng lúc. Lựa chọn được giữ
              nguyên khi bạn chuyển trang.
            </span>
          )}

          {hasSelection && selectedAction ? (
            <>
              <span className={eligibleCount > 0 ? 'text-indigo-800/80' : 'font-semibold text-amber-700'}>
                {eligibleCount > 0
                  ? `${eligibleCount} câu sẽ được ${selectedAction.successVerb}.`
                  : `Không có câu nào ${selectedAction.confirmVerb} được với lựa chọn hiện tại.`}
              </span>
              {skippedCount > 0 ? (
                <span className="font-semibold text-amber-700">
                  {skippedCount} câu bị bỏ qua và giữ nguyên trạng thái:{' '}
                  {formatSkipGroups(plan.skippedGroups)}.
                </span>
              ) : null}

              {/* Nút này nằm ở cột chữ chứ không ở cụm điều khiển: nó chỉ hiện khi có câu bị bỏ
                  qua, mà một nút lúc có lúc không trong cụm bên phải là nguồn xê dịch ngang lớn
                  nhất. Đặt ngay dưới dòng giải thích "N câu bị bỏ qua" cũng đúng ngữ cảnh hơn --
                  nó là hành động xử lý chính dòng đó. */}
              {skippedCount > 0 && eligibleCount > 0 ? (
                <button
                  className="mt-1 inline-flex h-9 items-center justify-center justify-self-start rounded-lg border border-amber-300 bg-amber-50 px-3 text-sm font-bold text-amber-800 transition hover:bg-amber-100"
                  onClick={onKeepEligible}
                  type="button"
                >
                  Chỉ chọn {eligibleCount} câu hợp lệ
                </button>
              ) : null}
            </>
          ) : null}
        </div>

        {/* shrink-0 + ml-auto: cụm luôn dính mép phải, không co lại rồi trôi khi chữ bên trái đổi. */}
        <div className="flex shrink-0 items-center justify-end gap-2 md:ml-auto">
          <label className="flex items-center gap-2 text-sm font-bold text-indigo-950">
            <span>Thao tác</span>
            {/* w-56 cố định: thẻ select tự co theo nhãn dài nhất, mà nhãn đổi từ "Gửi duyệt"
                thành "Gửi duyệt (3/5 câu)" ngay khi vừa tick một câu -- để tự động là nó nhảy. */}
            <select
              className="h-10 w-56 rounded-lg border border-indigo-200 bg-white px-3 text-sm font-semibold text-indigo-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              onChange={(event) => onActionChange(event.target.value as QuestionWorkflowAction)}
              value={selectedAction?.action ?? ''}
            >
              {actionOptions.map((option) => (
                <option key={option.action} value={option.action}>
                  {hasSelection
                    ? `${option.label} (${option.eligibleCount}/${selectedCount} câu)`
                    : option.label}
                </option>
              ))}
            </select>
          </label>

          <button
            className="inline-flex h-10 items-center justify-center rounded-lg border border-indigo-200 bg-white px-4 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-60"
            disabled={!hasSelection}
            onClick={onClear}
            type="button"
          >
            Bỏ chọn
          </button>

          {/* min-w cố định: nhãn chạy từ "Xử lý hàng loạt" tới "Xuất bản hàng loạt (110)" tuỳ
              thao tác và số câu chọn. 14rem phủ được nhãn dài nhất nên nút không đổi bề rộng. */}
          <button
            className="inline-flex h-10 min-w-56 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:bg-slate-300"
            disabled={eligibleCount === 0 || isProcessing || !selectedAction}
            onClick={onRun}
            title={
              hasSelection && eligibleCount === 0 && selectedAction
                ? `Không có câu nào ${selectedAction.confirmVerb} được với lựa chọn hiện tại.`
                : undefined
            }
            type="button"
          >
            {isProcessing
              ? 'Đang xử lý...'
              : selectedAction
                ? `${selectedAction.buttonLabel}${eligibleCount > 0 ? ` (${eligibleCount})` : ''}`
                : 'Xử lý hàng loạt'}
          </button>
        </div>
      </div>
    </div>
  )
}
