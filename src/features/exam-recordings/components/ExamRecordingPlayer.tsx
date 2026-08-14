import { useMemo, useState, type ReactNode } from 'react'
import { Monitor, Video, VideoOff } from 'lucide-react'
import { isForbiddenApiError } from '@/shared/api'
import { useExamRecordingPlaybackQuery } from '../api/useExamRecordingPlaybackQuery'
import type { ExamRecordingPlaybackDto, ExamRecordingStreamType } from '../types'

const STREAMS: { icon: typeof Video; label: string; type: ExamRecordingStreamType }[] = [
  { icon: Video, label: 'Camera thí sinh', type: 'CAMERA' },
  { icon: Monitor, label: 'Màn hình', type: 'SCREEN' },
]

const SOURCE_LABELS: Record<string, string> = {
  DESKTOP_SEGMENT_UPLOAD: 'Máy thí sinh',
  SERVER_WEBRTC: 'Máy chủ',
}

function sourceLabel(source: string | null) {
  if (!source) return 'Không rõ nguồn'
  return SOURCE_LABELS[source] ?? source
}

function formatDuration(seconds: number | null) {
  if (seconds == null || seconds < 0) return null
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

/**
 * Vì sao trạng thái này KHÔNG phải lỗi: bản ghi được tạo ngay khi ca thi bắt đầu, còn file thì
 * chỉ có sau khi ghép xong. Mở màn chấm sớm là gặp PROCESSING -- nói rõ "đang xử lý" thay vì
 * hiện khung vỡ.
 */
function unavailableReason(recording: ExamRecordingPlaybackDto | undefined) {
  if (!recording) return 'Ca thi này không có bản ghi.'
  if (recording.status === 'PROCESSING') return 'Bản ghi đang được xử lý, quay lại sau ít phút.'
  if (recording.status === 'FAILED') return 'Bản ghi lỗi trong lúc tải lên.'
  if (recording.status === 'ABANDONED') return 'Bản ghi bị bỏ dở giữa chừng.'
  return 'Chưa có tệp để phát.'
}

function StreamPanel({
  label,
  icon: Icon,
  recordings,
}: {
  icon: typeof Video
  label: string
  recordings: ExamRecordingPlaybackDto[]
}) {
  // Mặc định mở bản canonical. Backend đã xếp hạng theo RecordingPrecedence nên đừng đoán lại
  // ở client -- hai nơi cùng quyết định "bản nào tốt hơn" là hai nơi sẽ trôi lệch.
  const defaultId = useMemo(
    () => recordings.find((item) => item.canonical)?.id ?? recordings[0]?.id ?? null,
    [recordings],
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const active = recordings.find((item) => item.id === (selectedId ?? defaultId))
  const duration = formatDuration(active?.durationSeconds ?? null)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <Icon size={16} />
          {label}
          {duration ? <span className="font-normal text-slate-400">· {duration}</span> : null}
        </span>

        {/* Chỉ hiện nút đổi nguồn khi THẬT SỰ có nhiều hơn một -- ca thi chỉ ghi được một
            đường thì thanh chọn một nút là nhiễu. */}
        {recordings.length > 1 ? (
          <div className="flex gap-1">
            {recordings.map((item) => {
              const isActive = item.id === (selectedId ?? defaultId)
              return (
                <button
                  className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                    isActive
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  type="button"
                >
                  {sourceLabel(item.source)}
                </button>
              )
            })}
          </div>
        ) : null}
      </div>

      {active?.playbackUrl ? (
        <video
          // aspect-video + object-contain: camera thường gần 4:3 còn màn hình là 16:9, để mỗi
          // thẻ tự lấy tỉ lệ gốc thì hai khung cao thấp khác nhau và đáy lệch hẳn. Ép chung một
          // khung 16:9 rồi thu vừa bên trong -- camera bị viền đen hai bên, đổi lại hai ô thẳng
          // hàng. object-cover sẽ cắt mất mép hình, mà đây là chứng cứ giám sát nên không cắt.
          className="aspect-video w-full rounded-lg border border-slate-200 bg-black object-contain"
          controls
          // Không preload cả file: một trang chấm mở nhiều video cùng lúc sẽ ngốn băng thông
          // cho thứ người chấm có thể không bấm tới.
          preload="metadata"
          src={active.playbackUrl}
        />
      ) : (
        // Cùng aspect-video với thẻ video: một luồng sẵn sàng còn luồng kia đang xử lý là
        // chuyện thường, và hai ô cao thấp khác nhau lúc đó lại lệch y như cũ.
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 text-center">
          <VideoOff className="text-slate-400" size={22} />
          <span className="text-xs text-slate-500">{unavailableReason(active)}</span>
        </div>
      )}
    </div>
  )
}

function RecordingSection({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-bold text-slate-800">Bản ghi ca thi</h3>
      {children}
    </section>
  )
}

function Notice({ children, onRetry }: { children: ReactNode; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
      <VideoOff className="text-slate-400" size={22} />
      <span className="text-xs text-slate-500">{children}</span>
      {onRetry ? (
        <button
          className="mt-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
          onClick={onRetry}
          type="button"
        >
          Thử lại
        </button>
      ) : null}
    </div>
  )
}

/**
 * Hai video của một ca thi: camera thí sinh và màn hình.
 *
 * Dùng chung cho trang chấm bài (kỳ thi tập trung + bài kiểm tra lớp) và trang kết quả phía
 * giáo viên. KHÔNG dành cho học sinh: query `examRecordingPlayback` chặn vai STUDENT ở backend,
 * nên nơi gọi phải tự giấu component này đi với học sinh thay vì để nó hiện ra rồi báo lỗi.
 *
 * Bốn trạng thái được nói ra RIÊNG chứ không gộp. Bản trước gộp hết vào một dòng
 * `if (isError || !data || data.length === 0) return null` -- lý do là "khối phụ trợ, đừng làm
 * người chấm phân tâm", nhưng cái giá là một sự cố phân quyền thật (người được giao chấm không
 * phải giám thị thì backend trả 403) trông y hệt "ca thi không có bản ghi", nên nó sống suốt mà
 * không ai báo. Im lặng chỉ đúng khi thật sự không có gì để nói.
 */
export function ExamRecordingPlayer({ sessionId }: { sessionId: string | null }) {
  const { data, error, isError, isLoading, refetch } = useExamRecordingPlaybackQuery(sessionId)

  // Không có ca thi thì không có gì để nói -- đây là ca duy nhất còn im lặng.
  if (!sessionId) return null

  if (isLoading) {
    return (
      <RecordingSection>
        <div className="grid gap-4 lg:grid-cols-2">
          {STREAMS.map(({ type }) => (
            <div className="aspect-video w-full animate-pulse rounded-lg bg-slate-100" key={type} />
          ))}
        </div>
      </RecordingSection>
    )
  }

  if (isError) {
    return (
      <RecordingSection>
        {isForbiddenApiError(error) ? (
          <Notice>
            Bạn không có quyền xem bản ghi của ca thi này. Liên hệ nhà trường nếu bạn cần bản ghi
            để chấm bài.
          </Notice>
        ) : (
          // retry: false ở query nên lỗi mạng phải có nút bấm tay, nếu không thì người chấm chỉ
          // còn cách tải lại cả trang.
          <Notice onRetry={() => void refetch()}>Không tải được bản ghi ca thi.</Notice>
        )}
      </RecordingSection>
    )
  }

  if (!data || data.length === 0) {
    return (
      <RecordingSection>
        <Notice>Ca thi này chưa có bản ghi nào.</Notice>
      </RecordingSection>
    )
  }

  return (
    <RecordingSection>
      <div className="grid gap-4 lg:grid-cols-2">
        {STREAMS.map(({ icon, label, type }) => {
          const forStream = data.filter((item) => item.streamType === type)
          if (forStream.length === 0) return null
          return <StreamPanel icon={icon} key={type} label={label} recordings={forStream} />
        })}
      </div>
    </RecordingSection>
  )
}
