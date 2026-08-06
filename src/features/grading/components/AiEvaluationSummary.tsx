import { AlertTriangle, Bot, FileText, Gauge, Mic2 } from 'lucide-react'
import {
  formatConfidencePercent,
  getAudioGateLabel,
  getAudioGateTone,
  getAudioReasonLabel,
  getConfidenceModeLabel,
  getEvidenceReasonLabel,
  getReviewReasonLabel,
} from '@/shared/lib/aiEvaluation'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import type { GradingTaskItem } from '../types'

/**
 * Bằng chứng AI ở đầu thẻ bản ghi: giáo viên cần biết bản chấm AI mình đang đối chiếu
 * đáng tin tới đâu TRƯỚC khi nghe, chứ không phải sau khi đã nhập điểm.
 *
 * Mọi số ở đây đến từ BẢN AI nên vẫn còn nguyên ở vòng phúc khảo, kể cả khi bản đang
 * có hiệu lực là bản chấm tay.
 */
export function AiEvaluationSummary({ item }: { item: GradingTaskItem }) {
  const signals = item.aiSignals
  const insufficientEvidence = signals?.evidenceStatus === 'INSUFFICIENT_EVIDENCE'
  const confidenceMode = getConfidenceModeLabel(signals?.confidenceMode)
  const reviewReason = getReviewReasonLabel(item.aiReviewReasonCode)
  const hasConfidence = item.aiOverallConfidence != null || signals != null

  // Chưa có bản AI (bài chấm tay từ đầu, hoặc AI chưa chạy): không dựng khung rỗng.
  if (!hasConfidence && !item.aiFeedbackSummary && !item.aiRequiresHumanReview) {
    return null
  }

  return (
    <div className="mt-3.5 grid gap-2.5">
      <div className="grid gap-2.5 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <Gauge className="size-3.5" />
            Độ tin cậy của AI
          </div>
          <p className="mt-1.5 text-lg font-extrabold leading-none tabular-nums text-slate-900">
            {formatConfidencePercent(item.aiOverallConfidence)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <Mic2 className="size-3.5" />
            Chất lượng bản ghi
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <p className="text-lg font-extrabold leading-none tabular-nums text-slate-900">
              {formatConfidencePercent(signals?.audioQuality)}
            </p>
            <StatusBadge
              label={getAudioGateLabel(signals?.audioGateStatus)}
              tone={getAudioGateTone(signals?.audioGateStatus)}
            />
          </div>
          {signals?.audioGateReasonCodes?.length ? (
            <p className="mt-1.5 text-[11px] font-medium leading-snug text-slate-400">
              {signals.audioGateReasonCodes.map(getAudioReasonLabel).join(' · ')}
            </p>
          ) : null}
        </div>
      </div>

      {item.aiRequiresHumanReview
      || item.aiRequiresRetake
      || item.aiMarkedInvalid
      || insufficientEvidence
      || confidenceMode ? (
        <div className="flex flex-wrap items-center gap-2">
          {item.aiRequiresHumanReview ? (
            <StatusBadge label="AI đề nghị giáo viên duyệt lại" tone="warning" />
          ) : null}
          {item.aiRequiresRetake ? <StatusBadge label="Cần thi lại" tone="danger" /> : null}
          {item.aiMarkedInvalid ? <StatusBadge label="AI đánh dấu không hợp lệ" tone="danger" /> : null}
          {insufficientEvidence ? (
            <StatusBadge label="Chưa đủ bằng chứng chấm điểm" tone="info" />
          ) : null}
          {confidenceMode ? <StatusBadge label={confidenceMode} tone="neutral" /> : null}
        </div>
      ) : null}

      {insufficientEvidence ? (
        <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2.5">
          <FileText className="mt-0.5 size-4 shrink-0 text-sky-600" />
          <div className="text-[12.5px] leading-relaxed text-sky-900">
            <span className="font-bold">Điểm thấp ở đây có thể là hợp lệ.</span> Bài chưa đủ bằng
            chứng để chấm chắc chắn
            {signals?.evidenceReasonCodes?.length
              ? `: ${signals.evidenceReasonCodes.map(getEvidenceReasonLabel).join(' · ')}`
              : '.'}
          </div>
        </div>
      ) : null}

      {item.aiRequiresHumanReview || reviewReason ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <p className="text-[12.5px] leading-relaxed text-amber-800">
            {reviewReason ?? 'AI chưa đủ chắc chắn với bài này — cần giáo viên nghe và quyết.'}
          </p>
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
