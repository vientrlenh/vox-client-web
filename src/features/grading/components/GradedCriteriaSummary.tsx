import { Bot, ClipboardList } from 'lucide-react'
import { criterionScorePercentage, getResultScoreTone } from '@/shared/lib/aiEvaluation'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { formatScore, type GradingCriterionMeta, type GradingTaskItem } from '../types'

type GradedCriteriaSummaryProps = {
  criteria: GradingCriterionMeta[]
  item: GradingTaskItem
  label?: string
}

/**
 * Điểm + nhận xét từng tiêu chí ở dạng CHỈ ĐỌC.
 *
 * `CriterionScoreCard` chỉ dựng khi vòng chấm cho `REGRADED`, nên phân công vừa đóng là điểm tiêu
 * chí, nhận xét từng tiêu chí của AI và nhận xét của người chấm biến mất sạch — đúng lúc người ta
 * mở lại bài để xem mình đã chấm ra sao. Khối này lấp đúng chỗ đó; dữ liệu đã có sẵn trong
 * `gradingTaskDetail`, không cần query mới.
 *
 * Lặp theo `criteria` chứ không theo `currentScores`: rubric mới là nguồn đủ tiêu chí và là nơi
 * duy nhất có thang điểm thật (`minScore`/`maxScore`) — thiếu tiêu chí nào thì phải nói ra là
 * "chưa chấm", không lặng lẽ giấu đi.
 *
 * Chữ nghĩa cố ý trung tính ("bản chấm hiện tại", không phải "điểm giáo viên đã chấm"): vòng chấm
 * kết thúc bằng UPHELD thì không có bản chấm tay nào được ghi, `currentScores` vẫn là số của AI —
 * mà DTO không trả `outcome` để phân biệt. Gọi tên sai còn tệ hơn không gọi.
 */
export function GradedCriteriaSummary({ criteria, item, label }: GradedCriteriaSummaryProps) {
  if (criteria.length === 0 && !item.currentFeedbackSummary) {
    return null
  }

  const title = label ? `Điểm từng tiêu chí · ${label}` : 'Điểm từng tiêu chí'

  return (
    <div className="grid gap-3">
      {criteria.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <ClipboardList className="size-4 text-cyan-700" />
              {title}
            </div>
            <span className="text-[13px] font-extrabold tabular-nums text-cyan-700">
              {formatScore(item.currentItemScore)}
            </span>
          </div>

          <div className="mt-3.5 grid gap-2.5">
            {criteria.map((criterion) => {
              const current = item.currentScores.find(
                (score) => score.criterionId === criterion.id,
              )
              const ai = item.aiScores.find((score) => score.criterionId === criterion.id)
              // Nhận xét AI chỉ tách ra khi nó KHÁC nhận xét đang có hiệu lực — lần chấm đầu hai
              // bản là một, in hai lần chỉ làm người đọc tưởng có hai ý kiến.
              const aiRationaleDiffers = Boolean(ai?.rationale) && ai?.rationale !== current?.rationale
              const aiScoreDiffers = ai?.score != null && ai.score !== current?.score

              return (
                <div className="rounded-xl border border-slate-200 bg-white p-3.5" key={criterion.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[13px] font-bold text-slate-900">
                        {criterion.label ?? 'Tiêu chí'}
                        {criterion.code ? (
                          <span className="text-xs font-medium text-slate-400"> · {criterion.code}</span>
                        ) : null}
                      </div>
                      {criterion.description ? (
                        <div className="mt-0.5 text-[11px] font-medium leading-snug text-slate-400">
                          {criterion.description}
                        </div>
                      ) : null}
                      {criterion.weight != null ? (
                        <div className="mt-1 text-[11px] font-semibold text-slate-400">
                          Trọng số {criterion.weight}
                        </div>
                      ) : null}
                    </div>
                    {current?.score == null ? (
                      <StatusBadge label="Chưa chấm" tone="neutral" />
                    ) : (
                      <StatusBadge
                        label={
                          criterion.minScore != null && criterion.maxScore != null
                            ? `${formatScore(current.score)} điểm · thang ${formatScore(criterion.minScore)}–${formatScore(criterion.maxScore)}`
                            : `${formatScore(current.score)} điểm`
                        }
                        tone={getResultScoreTone(
                          criterionScorePercentage(
                            current.score,
                            criterion.minScore,
                            criterion.maxScore,
                          ),
                        )}
                      />
                    )}
                  </div>

                  {aiScoreDiffers ? (
                    <div className="mt-1.5 text-[11.5px] font-semibold tabular-nums text-violet-600">
                      AI chấm {formatScore(ai?.score)}
                    </div>
                  ) : null}

                  {current?.rationale ? (
                    <p className="mt-2 text-[12.5px] leading-relaxed text-slate-600">
                      {current.rationale}
                    </p>
                  ) : null}

                  {aiRationaleDiffers ? (
                    <div className="mt-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-violet-700">
                        <Bot className="size-3.5" />
                        Nhận xét của AI
                      </div>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-violet-900">
                        {ai?.rationale}
                      </p>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      {item.currentFeedbackSummary ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <ClipboardList className="size-4 text-cyan-700" />
            Nhận xét của bản chấm hiện tại
          </div>
          <p className="mt-2.5 text-[13px] leading-relaxed text-slate-700">
            {item.currentFeedbackSummary}
          </p>
        </div>
      ) : null}
    </div>
  )
}
