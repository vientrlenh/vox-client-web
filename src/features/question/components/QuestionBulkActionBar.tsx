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
        <div className="grid gap-1 text-sm text-indigo-900">
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
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm font-bold text-indigo-950">
            <span>Thao tác</span>
            <select
              className="h-10 rounded-lg border border-indigo-200 bg-white px-3 text-sm font-semibold text-indigo-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
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

          {skippedCount > 0 && eligibleCount > 0 ? (
            <button
              className="inline-flex h-10 items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-4 text-sm font-bold text-amber-800 transition hover:bg-amber-100"
              onClick={onKeepEligible}
              type="button"
            >
              Chỉ chọn {eligibleCount} câu hợp lệ
            </button>
          ) : null}

          <button
            className="inline-flex h-10 items-center justify-center rounded-lg border border-indigo-200 bg-white px-4 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-60"
            disabled={!hasSelection}
            onClick={onClear}
            type="button"
          >
            Bỏ chọn
          </button>

          <button
            className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:bg-slate-300"
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
