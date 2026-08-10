import { CircleAlert, CircleCheck, TriangleAlert, X } from 'lucide-react'
import { groupBulkFailures } from '../bulkStatus'
import type { BulkStatusResult } from '../bulkStatus'
import { getQuestionStatusDisplay } from '../types'

type BulkStatusResultDialogProps = {
  onClose: () => void
  result: BulkStatusResult | null
}

/**
 * Kết quả của một lần cập nhật trạng thái hàng loạt.
 *
 * <p>Cố ý là dialog chứ không phải toast: trước đây mọi lý do bị nối bằng " | " vào một toast tự tắt
 * sau 4,5 giây, nên người dùng không kịp đọc và cũng không biết câu nào hỏng vì sao. Dialog chỉ đóng
 * khi người dùng bấm đóng.
 */
export function BulkStatusResultDialog({ onClose, result }: BulkStatusResultDialogProps) {
  if (!result) {
    return null
  }

  const { actionVerb, failed, totalCount, updatedCount } = result
  const groups = groupBulkFailures(failed)
  const tone = updatedCount === 0 ? 'error' : 'warning'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <section
        aria-labelledby="bulk-status-result-title"
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
              <h2 className="text-lg font-black text-blue-950" id="bulk-status-result-title">
                Kết quả {actionVerb} hàng loạt
              </h2>
              <p className="mt-1 text-sm font-medium leading-6 text-slate-600">
                {`Đã ${actionVerb} ${updatedCount}/${totalCount} câu hỏi. ${failed.length} câu bị bỏ qua và giữ nguyên trạng thái.`}
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
              {`${updatedCount} câu hỏi đã được ${actionVerb} thành công.`}
            </p>
          ) : null}

          {groups.map((group) => (
            <article
              className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3"
              key={group.key}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-sm font-bold leading-6 text-slate-900">{group.reason}</h3>
                <span className="shrink-0 rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-xs font-black text-slate-600">
                  {group.items.length} câu
                </span>
              </div>

              {group.hint ? (
                <p className="text-xs font-semibold leading-5 text-slate-500">{group.hint}</p>
              ) : null}

              <ul className="flex flex-wrap gap-1.5">
                {group.items.map((item) => {
                  const status = getQuestionStatusDisplay(item.currentStatus)

                  return (
                    <li
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700"
                      key={item.questionId}
                    >
                      {item.questionCode ?? 'Không rõ mã'}
                      {item.currentStatus ? (
                        <span
                          className={['rounded border px-1.5 py-0.5 text-[11px] font-bold', status.className].join(' ')}
                        >
                          {status.label}
                        </span>
                      ) : null}
                    </li>
                  )
                })}
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
