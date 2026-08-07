import { useState } from 'react'
import type { QuestionAssetType } from '../types'

type QuestionAssetPreviewProps = {
  altText?: string | null
  title?: string | null
  transcript?: string | null
  type: QuestionAssetType
  url?: string | null
}

function getAssetName(type: QuestionAssetType) {
  switch (type) {
    case 'IMAGE':
      return 'ảnh'
    case 'AUDIO':
      return 'âm thanh'
    case 'VIDEO':
      return 'video'
    case 'TEXT_PASSAGE':
      return 'đoạn văn'
    default:
      return 'tài nguyên'
  }
}

export function QuestionAssetPreview({
  altText,
  title,
  transcript,
  type,
  url,
}: QuestionAssetPreviewProps) {
  const [loadFailed, setLoadFailed] = useState(false)
  const [trackedSource, setTrackedSource] = useState({ type, url })

  // reset the failed-load flag when switching to a different asset, without a
  // dedicated effect: this is the "adjust state while rendering" pattern React
  // recommends for resetting state in response to a prop change
  if (trackedSource.type !== type || trackedSource.url !== url) {
    setTrackedSource({ type, url })
    setLoadFailed(false)
  }

  if (type === 'TEXT_PASSAGE') {
    return (
      <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
          Xem trước đoạn văn
        </p>
        <p className="whitespace-pre-wrap text-sm font-medium text-slate-700">
          {transcript?.trim() || 'Chưa có nội dung đoạn văn để xem trước.'}
        </p>
      </div>
    )
  }

  if (!url?.trim()) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm font-medium text-slate-500">
        Chưa có {getAssetName(type)} để xem trước.
      </div>
    )
  }

  if (loadFailed) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm font-medium text-amber-800">
        Không thể tải {getAssetName(type)} xem trước. Vui lòng kiểm tra lại tệp đã chọn hoặc đã lưu.
      </div>
    )
  }

  if (type === 'IMAGE') {
    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950/5">
        <img
          alt={altText?.trim() || title?.trim() || 'Xem trước ảnh'}
          className="max-h-80 w-full object-contain"
          onError={() => setLoadFailed(true)}
          src={url}
        />
      </div>
    )
  }

  if (type === 'AUDIO') {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <audio
          className="w-full"
          controls
          onError={() => setLoadFailed(true)}
          preload="metadata"
          src={url}
        >
          Trình duyệt không hỗ trợ phát âm thanh.
        </audio>
      </div>
    )
  }

  if (type === 'VIDEO') {
    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
        <video
          className="max-h-80 w-full"
          controls
          onError={() => setLoadFailed(true)}
          preload="metadata"
          src={url}
        >
          Trình duyệt không hỗ trợ phát video.
        </video>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm font-medium text-slate-500">
      Chưa hỗ trợ xem trước cho loại tài nguyên này.
    </div>
  )
}
