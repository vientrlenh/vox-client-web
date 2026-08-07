import { useMemo, useState } from 'react'
import { Monitor, Video, VideoOff } from 'lucide-react'
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

/**
 * Hai video của một ca thi: camera thí sinh và màn hình.
 *
 * Dùng chung cho trang chấm bài (kỳ thi tập trung + bài kiểm tra lớp) và trang kết quả phía
 * giáo viên. KHÔNG dành cho học sinh: query `examRecordingPlayback` chặn vai STUDENT ở backend,
 * nên nơi gọi phải tự giấu component này đi với học sinh thay vì để nó hiện ra rồi báo lỗi.
 */
export function ExamRecordingPlayer({ sessionId }: { sessionId: string | null }) {
  const { data, isError, isLoading } = useExamRecordingPlaybackQuery(sessionId)

  if (!sessionId || isLoading) return null

  // Không có quyền hoặc phiên thi không tồn tại: im lặng. Đây là khối phụ trợ trong trang chấm,
  // dựng một hộp lỗi đỏ ở đây chỉ làm người chấm phân tâm khỏi việc chính.
  if (isError || !data || data.length === 0) return null

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-bold text-slate-800">Bản ghi ca thi</h3>
      <div className="grid gap-4 lg:grid-cols-2">
        {STREAMS.map(({ icon, label, type }) => {
          const forStream = data.filter((item) => item.streamType === type)
          if (forStream.length === 0) return null
          return <StreamPanel icon={icon} key={type} label={label} recordings={forStream} />
        })}
      </div>
    </section>
  )
}
