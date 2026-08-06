import { AlertTriangle } from 'lucide-react'
import { buildValidityRulesForDisplay } from '@/shared/lib/aiEvaluation'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import type { GradingTaskItem } from '../types'

/**
 * Vi phạm quy tắc mà AI phát hiện ở câu này. Cùng nguồn và cùng cách diễn giải với
 * trang kết quả (`buildValidityRulesForDisplay`) — hai màn nói khác nhau về cùng một
 * bài là chuyện giáo viên sẽ phát hiện trước ai hết.
 */
export function ValidityRulesCard({ item }: { item: GradingTaskItem }) {
  const rules = buildValidityRulesForDisplay({ signals: item.aiSignals, validity: item.aiValidity })
  if (rules.length === 0) {
    return null
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <div className="flex items-center gap-2 text-sm font-bold text-amber-900">
        <AlertTriangle className="size-4 text-amber-600" />
        Vi phạm quy tắc
      </div>
      <div className="mt-3 grid gap-2">
        {rules.map((rule) => (
          <div
            className="rounded-xl border border-amber-200 bg-white px-3.5 py-2.5"
            key={rule.ruleId ?? rule.message ?? 'rule'}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12.5px] font-bold text-slate-900">{rule.ruleId ?? 'Quy tắc'}</span>
              {rule.occurrenceCount > 1 ? (
                <StatusBadge label={`${rule.occurrenceCount} lượt`} tone="warning" />
              ) : null}
            </div>
            {rule.message ? (
              <p className="mt-1 text-[12.5px] leading-relaxed text-slate-600">{rule.message}</p>
            ) : null}
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] font-medium text-slate-400">
              {rule.severity ? <span>Mức độ: {rule.severity}</span> : null}
              {rule.action ? (
                <span>
                  Hành động:{' '}
                  {/* Rule mức lượt nói: cờ chỉ hạ điểm lượt bị gắn, không đánh hỏng cả bài —
                      viết rõ ra, không thì giáo viên tưởng bài này đã bị cho 0. */}
                  {item.aiValidity?.validForScoring !== false && rule.action === 'reject_or_zero'
                    ? 'chỉ áp dụng ở lượt bị gắn cờ; toàn bài vẫn được chấm'
                    : rule.action}
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
