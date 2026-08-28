import { CircleAlert, CircleCheck, TriangleAlert, X } from 'lucide-react'
import type { BulkScopeStatusFailure } from '@/shared/api'

export type BulkScopeStatusResult = {
  /** Động từ ở dạng thường, ghép vào câu: "Đã xuất bản 3/5 ngân hàng câu hỏi." */
  actionVerb: string
  /** Danh từ chỉ loại mục, số ít: "ngân hàng câu hỏi", "chủ đề câu hỏi". */
  entityNoun: string
  failed: BulkScopeStatusFailure[]
  totalCount: number
  updatedCount: number
}

type BulkScopeStatusResultDialogProps = {
  onClose: () => void
  result: BulkScopeStatusResult | null
}

/**
 * Kết quả một lần đổi trạng thái hàng loạt cho ngân hàng/chủ đề câu hỏi.
 *
 * Là dialog chứ không phải toast, cùng lý do với BulkStatusResultDialog của câu hỏi: backend trả
 * "thành công một phần", nên phải đọc kỹ mục nào bị bỏ qua vì sao — toast tự tắt thì không kịp đọc.
 *
 * Gom theo `reasonCode` thay vì theo chuỗi `reason`: cùng một lý do nhưng backend chèn tên loại mục
 * vào câu ("ngân hàng câu hỏi"/"chủ đề câu hỏi") nên chuỗi không trùng nhau tuyệt đối.
 */
export function BulkScopeStatusResultDialog({
  onClose,
  result,
}: BulkScopeStatusResultDialogProps) {
  if (!result) {
    return null
  }

  const { actionVerb, entityNoun, failed, totalCount, updatedCount } = result
  const groups = groupByReasonCode(failed)
  const tone = updatedCount === 0 ? 'error' : 'warning'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <section
        aria-labelledby="bulk-scope-status-result-title"
        aria-modal="true"
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={[
                'mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border',
                tone === 'error'
                  ? 'border-red-200 bg-red-50 text-red-600'
                  : 'border-amber-200 bg-amber-50 text-amber-700',
              ].join(' ')}
            >
              {tone === 'error' ? (
                <CircleAlert aria-hidden="true" className="size-5" />
              ) : (
                <TriangleAlert aria-hidden="true" className="size-5" />
              )}
            </div>
            <div className="min-w-0">
              <h2
                className="text-lg font-black text-blue-950"
                id="bulk-scope-status-result-title"
              >
                Kết quả {actionVerb} hàng loạt
              </h2>
              <p className="mt-1 text-sm font-medium leading-6 text-slate-600">
                {`Đã ${actionVerb} ${updatedCount}/${totalCount} ${entityNoun}. ${failed.length} mục bị bỏ qua và giữ nguyên trạng thái.`}
              </p>
            </div>
          </div>
          <button
            aria-label="Đóng kết quả"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="grid gap-3 overflow-y-auto px-6 py-5">
          {updatedCount > 0 ? (
            <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
              <CircleCheck aria-hidden="true" className="size-4 shrink-0" />
              {`${updatedCount} ${entityNoun} đã được ${actionVerb} thành công.`}
            </p>
          ) : null}

          {groups.map((group) => (
            <article
              className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3"
              key={group.reasonCode}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-sm font-bold leading-6 text-slate-900">
                  {group.reason}
                </h3>
                <span className="shrink-0 rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-xs font-black text-slate-600">
                  {group.items.length} mục
                </span>
              </div>

              <ul className="flex flex-wrap gap-1.5">
                {group.items.map((item) => (
                  <li
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700"
                    key={item.id}
                  >
                    {item.code ?? 'Không rõ mã'}
                    {item.currentStatus ? (
                      <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-bold text-slate-600">
                        {item.currentStatus}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="flex justify-end border-t border-slate-200 px-6 py-4">
          <button
            className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-black text-white transition hover:bg-indigo-700"
            onClick={onClose}
            type="button"
          >
            Đã hiểu
          </button>
        </div>
      </section>
    </div>
  )
}

function groupByReasonCode(failed: BulkScopeStatusFailure[]) {
  const groups = new Map<
    string,
    { items: BulkScopeStatusFailure[]; reason: string; reasonCode: string }
  >()

  for (const item of failed) {
    const existing = groups.get(item.reasonCode)

    if (existing) {
      existing.items.push(item)
      continue
    }

    groups.set(item.reasonCode, {
      items: [item],
      reason: item.reason,
      reasonCode: item.reasonCode,
    })
  }

  return [...groups.values()]
}
