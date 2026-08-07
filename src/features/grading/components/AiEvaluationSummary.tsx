import { Bot } from 'lucide-react'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import type { GradingTaskItem } from '../types'

/**
 * Bằng chứng AI ở đầu thẻ bản ghi — rút gọn 2026-08-08.
 *
 * Trước đây khối này dựng 6 tầng: hai ô số đo (độ tin cậy AI, chất lượng bản ghi), một hàng nhãn
 * trạng thái, một dải "chưa đủ bằng chứng", một dải cảnh báo duyệt lại, rồi mới tới nhận xét của
 * AI. Người chấm phải cuộn qua tất cả để tới thứ họ thật sự dùng.
 *
 * Bỏ hết phần số đo NỘI BỘ của bộ chấm. Lý do không phải vì chúng sai, mà vì chúng không đổi
 * được việc gì: biết "độ tin cậy 0%" hay "chưa đủ bằng chứng" thì hành động vẫn y hệt — nghe lại
 * rồi tự cho điểm. Thứ thật sự cần hành động chỉ có một câu: bài này có cần giáo viên duyệt lại
 * không.
 *
 * Giữ lại `aiRequiresRetake` và `aiMarkedInvalid` dù người dùng chỉ nhắc "cần giáo viên chấm
 * lại": hai cái đó không phải số đo mà là KẾT LUẬN đổi việc phải làm — bài cần thi lại hoặc bị
 * đánh dấu không hợp lệ thì người chấm xử lý khác hẳn. Chúng cũng hiếm nên không gây rối.
 *
 * Dữ liệu số đo vẫn còn nguyên trong `item.aiSignals`; cần soi thì dựng một trang chẩn đoán
 * riêng cho người vận hành, đừng trộn vào màn chấm.
 */
export function AiEvaluationSummary({ item }: { item: GradingTaskItem }) {
  const hasBadge = item.aiRequiresHumanReview || item.aiRequiresRetake || item.aiMarkedInvalid

  // Chưa có bản AI (bài chấm tay từ đầu, hoặc AI chưa chạy): không dựng khung rỗng.
  if (!hasBadge && !item.aiFeedbackSummary) {
    return null
  }

  return (
    <div className="mt-3.5 grid gap-2.5">
      {hasBadge ? (
        <div className="flex flex-wrap items-center gap-2">
          {item.aiRequiresHumanReview ? (
            <StatusBadge label="AI đề nghị giáo viên duyệt lại" tone="warning" />
          ) : null}
          {item.aiRequiresRetake ? <StatusBadge label="Cần thi lại" tone="danger" /> : null}
          {item.aiMarkedInvalid ? (
            <StatusBadge label="AI đánh dấu không hợp lệ" tone="danger" />
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
