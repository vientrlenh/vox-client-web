import { useState } from 'react'
import { ChevronDown, ChevronRight, Paperclip } from 'lucide-react'
import { QuestionAssetPreview } from './QuestionAssetPreview'
import type { QuestionAssetType } from '../types'

type QuestionAssetPanelProps = {
  altText?: string | null
  /** Bản gọn cho cột chấm bài (chỉ ~55% bề ngang). */
  compact?: boolean
  description?: string | null
  durationSeconds?: number | null
  title?: string | null
  transcript?: string | null
  type: QuestionAssetType
  url?: string | null
}

const TYPE_LABEL: Record<QuestionAssetType, string> = {
  AUDIO: 'Đoạn nghe',
  IMAGE: 'Hình ảnh',
  TEXT_PASSAGE: 'Đoạn văn',
  VIDEO: 'Đoạn phim',
}

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) {
    return null
  }
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

/**
 * Tài nguyên câu hỏi hiển thị cho NGƯỜI CHẤM và trong trang kết quả.
 *
 * Đặt ngay dưới đề bài và trên danh sách lượt nói: giáo viên phải thấy thí sinh đã nhìn/nghe gì
 * TRƯỚC khi đọc transcript, nếu không thì đọc transcript trong chân không.
 *
 * `description`/`transcript` hiện kèm có chủ ý — đó chính là TOÀN BỘ những gì AI biết về tài
 * nguyên này (nó không hề nhìn thấy tấm ảnh), nên giáo viên cần đọc mới đánh giá được điểm AI có
 * công bằng không, và mới phát hiện được ca người soạn để trống hoặc mô tả sai.
 *
 * Đoạn văn mặc định THU lại: giáo viên chấm nhiều câu liên tiếp, để bung hết thì mỗi câu dài gấp
 * đôi. Ảnh và media thì bung vì nhìn phát là thấy.
 */
export function QuestionAssetPanel({
  altText,
  compact = false,
  description,
  durationSeconds,
  title,
  transcript,
  type,
  url,
}: QuestionAssetPanelProps) {
  const [expanded, setExpanded] = useState(type !== 'TEXT_PASSAGE')

  const duration = formatDuration(durationSeconds)
  const grounding = type === 'IMAGE' ? description : transcript || description
  const headline = [TYPE_LABEL[type], title?.trim(), duration].filter(Boolean).join(' · ')

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
      <button
        className="flex w-full items-center gap-2 text-left text-[12.5px] font-bold text-slate-700"
        onClick={() => setExpanded((current) => !current)}
        type="button"
      >
        {expanded ? (
          <ChevronDown className="size-4 shrink-0 text-slate-400" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-slate-400" />
        )}
        <Paperclip className="size-4 shrink-0 text-cyan-700" />
        <span className="flex-1">{headline}</span>
      </button>

      {expanded ? (
        <div className="mt-3 grid gap-2">
          <QuestionAssetPreview
            altText={altText}
            compact={compact}
            title={title}
            transcript={transcript}
            type={type}
            url={url}
          />

          {grounding?.trim() ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-amber-700">
                Nội dung AI dựa vào để chấm
              </p>
              <p className="mt-1 whitespace-pre-wrap text-[12.5px] leading-relaxed text-amber-900">
                {grounding.trim()}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] font-medium text-rose-700">
              Câu hỏi này không có mô tả tài nguyên, nghĩa là AI chấm mà{' '}
              <span className="font-bold">không biết gì về nội dung</span> của nó. Cân nhắc khi đọc
              điểm và nhận xét của AI.
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
