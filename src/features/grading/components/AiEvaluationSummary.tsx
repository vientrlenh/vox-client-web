import { Bot, Gauge } from 'lucide-react'
import { formatConfidencePercent, getReviewReasonLabel } from '@/shared/lib/aiEvaluation'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import type { GradingTaskItem } from '../types'

/**
 * Bằng chứng AI ở đầu thẻ bản ghi — rút gọn 2026-08-08, dựng lại một phần 2026-08-09.
 *
 * Trước đây khối này dựng 6 tầng: hai ô số đo (độ tin cậy AI, chất lượng bản ghi), một hàng nhãn
 * trạng thái, một dải "chưa đủ bằng chứng", một dải cảnh báo duyệt lại, rồi mới tới nhận xét của
 * AI. Người chấm phải cuộn qua tất cả để tới thứ họ thật sự dùng. Bản rút gọn bỏ hết số đo và chỉ
 * giữ các KẾT LUẬN đổi được việc phải làm.
 *
 * Người chấm sau đó yêu cầu có lại độ tin cậy, nên nó quay lại — nhưng dưới dạng MỘT DÒNG cạnh
 * nhãn trạng thái, không phải ô số đo chiếm nửa thẻ: biết "83%" không đổi được thao tác (vẫn nghe
 * rồi tự cho điểm), nhưng nó trả lời được câu "vì sao bài này bị đẩy sang cho tôi". Đúng vai trò
 * đó thì `aiReviewReasonCode` đi kèm mới có nghĩa — số một mình không nói được lý do.
 *
 * VẪN cố ý không dựng lại: chất lượng bản ghi (`audioQuality`), audio gate, trạng thái đủ/thiếu
 * bằng chứng, profile chấm. Dữ liệu còn nguyên trong `item.aiSignals`; cần soi thì dựng một trang
 * chẩn đoán riêng cho người vận hành, đừng trộn vào màn chấm.
 */
export function AiEvaluationSummary({ item }: { item: GradingTaskItem }) {
  const hasBadge = item.aiRequiresHumanReview || item.aiRequiresRetake || item.aiMarkedInvalid
  const hasConfidence = typeof item.aiOverallConfidence === 'number'
  const reviewReason = getReviewReasonLabel(item.aiReviewReasonCode)

  // Chưa có bản AI (bài chấm tay từ đầu, hoặc AI chưa chạy): không dựng khung rỗng.
  if (!hasBadge && !hasConfidence && !item.aiFeedbackSummary) {
    return null
  }

  return (
    <div className="mt-3.5 grid gap-2.5">
      {hasBadge || hasConfidence ? (
        <div className="flex flex-wrap items-center gap-2">
          {item.aiRequiresHumanReview ? (
            <StatusBadge label="AI đề nghị giáo viên duyệt lại" tone="warning" />
          ) : null}
          {item.aiRequiresRetake ? <StatusBadge label="Cần thi lại" tone="danger" /> : null}
          {item.aiMarkedInvalid ? (
            <StatusBadge label="AI đánh dấu không hợp lệ" tone="danger" />
          ) : null}
          {hasConfidence ? (
            <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-500">
              <Gauge className="size-3.5 text-slate-400" />
              Độ tin cậy AI
              <b className="font-extrabold tabular-nums text-slate-900">
                {formatConfidencePercent(item.aiOverallConfidence)}
              </b>
              {/* Lý do đi kèm số: "40%" một mình không nói được vì sao bài rơi vào tay giáo viên. */}
              {reviewReason ? (
                <>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="font-medium">{reviewReason}</span>
                </>
              ) : null}
            </span>
          ) : null}
        </div>
      ) : null}

      {item.aiFeedbackSummary ? (
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-3.5 py-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-violet-700">
            <Bot className="size-3.5" />
            Nhận xét tổng của AI
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-violet-900">
            {item.aiFeedbackSummary}
          </p>
        </div>
      ) : null}
    </div>
  )
}
