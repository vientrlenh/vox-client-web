
export type StreamType = 'camera' | 'screen'

export type StreamTokenRequest = {
  examId: string
  scheduleIds: string[]
}

// Bảng nhãn cảnh báo chuyển sang feature `proctoring-alerts` khi màn CHẤM BÀI cũng cần đọc chúng:
// hai màn nói khác nhau về cùng một loại vi phạm là chuyện giáo viên sẽ phát hiện trước ai hết. Vẫn
// export lại từ đây để nơi gọi trong `monitoring` không phải đổi đường import.
import type { AlertType } from '@/features/proctoring-alerts/types'

export {
  getAlertSeverity,
  getAlertTypeDisplay,
  type AlertSeverity,
  type AlertType,
  type AlertTypeDisplay,
} from '@/features/proctoring-alerts/types'

/**
 * `disconnected`/`reconnected` báo TRANSPORT rớt và nối lại trong khi luồng vẫn còn mở.
 *
 * <p>Chúng tồn tại vì `left` tới quá muộn để làm tín hiệu duy nhất: nó được phát khi peer đóng hẳn,
 * tức sau 30 giây grace kể từ lúc ICE nhận ra vấn đề. Cả quãng đó giám thị chỉ thấy một ô đứng hình
 * không kèm lời giải thích nào.
 */
export type ParticipantEventType = 'disconnected' | 'joined' | 'left' | 'reconnected'

/** An active stream returned by a monitor snapshot or `/schedules/active`. */
export type StreamSnapshot = {
  participantId: string
  /**
   * Phiên thi mà stream này thuộc về. Đây là khoá để gọi các API phía Java trên phiên thi
   * (đánh dấu nghi vấn, buộc kết thúc) - `participantId` là id của thí sinh, không dùng được
   * cho những endpoint đó.
   *
   * <p>Optional vì `snapshot` và `/schedules/active` có mang, còn `frame` thì không: một frame về
   * trước snapshot sẽ tạo ô tạm chưa có trường này, và nó được điền khi snapshot tới. Chỗ nào cần
   * gọi API theo phiên thi thì phải xử lý trường hợp chưa có.
   */
  sessionId?: string
  startedAt: string
  streamId: string
  streamType: StreamType
  latestFrameUrl?: string | null
}
/**
 * Một luồng ca thi đã từng có, đọc từ `/schedules/{id}/streams`.
 *
 * <p>Cùng hình dạng với `StreamSnapshot` cộng đúng một trường mà snapshot không mang nổi: lúc nào
 * luồng dừng. Nhờ trùng tên trường mà cả hai nguồn đổ chung vào một reducer được.
 */
export type ScheduleStreamRecord = {
  /** ISO. Vắng mặt nghĩa là luồng còn đang chạy. */
  endedAt?: string
  participantId: string
  sessionId?: string
  startedAt: string
  streamId: string
  streamType: StreamType
}

export type FrameNotification = {
  frameUrl: string
  sequenceNo: number
  streamId: string
  streamType: StreamType
  participantId?: string
}

export type ParticipantEvent = {
  at: string
  participantId: string
  streamId: string
  streamType: StreamType
  type: ParticipantEventType
}

export type AlertEvent = {
  alertType: AlertType | string
  capturedAt: string
  confidence: number
  /**
   * Định danh sự kiện, dùng để khử trùng khi gộp luồng trực tiếp với lịch sử đọc từ DB.
   *
   * <p>Optional vì đây là dữ liệu từ dây: một bản vox-streaming cũ hơn không gửi trường này. Thiếu
   * nó thì phải rơi về khoá tổ hợp, kém chắc chắn hơn nhưng không được phép làm hỏng màn hình.
   */
  eventId?: string
  /**
   * Mức độ do vox-streaming đóng dấu lúc phát (`DefaultAlertLevel`), cùng một giá trị với bản ghi
   * lưu vào DB -- nhờ vậy màn trực tiếp và màn chấm bài không thể nói khác nhau về cùng một cảnh
   * báo. Dùng qua `getAlertSeverity`, đừng suy lại từ `alertType`.
   *
   * <p>Optional vì bản vox-streaming cũ hơn không gửi trường này; thiếu thì rơi về bảng theo loại.
   */
  level?: string
  participantId: string
  sessionId: string
  streamId: string
  /**
   * Loại luồng đã sinh ra cảnh báo, để bấm vào nó mở đúng khung hình.
   *
   * <p>Optional vì hai nguồn khác nhau: bản ghi lịch sử từ DB có mang, còn sự kiện realtime qua
   * WebSocket thì chưa. Thiếu thì rơi về luồng đầu tiên của học viên -- kém chính xác nhưng không
   * được phép làm hỏng việc điều hướng.
   */
  streamType?: StreamType
}

export type MonitorMessage =
  // streams là optional vì đây là dữ liệu đến từ dây, không phải từ code ta kiểm soát:
  // một server cũ (hoặc bất kỳ phiên bản nào bỏ sót trường khi rỗng) sẽ gửi thiếu nó.
  | { streams?: StreamSnapshot[]; type: 'snapshot' }
  | { frame: FrameNotification; type: 'frame' }
  | { event: ParticipantEvent; type: 'participant' }
  | { alert: AlertEvent; type: 'alert' }


export type ActiveSchedule = {
  /**
   * Số **stream**, không phải số học viên: một học viên bật cả camera lẫn màn hình được đếm 2 lần.
   * Muốn biết có bao nhiêu người đang lên sóng thì đếm `participantId` không trùng trong `streams`
   * - xem `countLiveParticipants`.
   */
  activeCount: number
  scheduleId: string
  streams: StreamSnapshot[]
}

/**
 * Số học viên đang thực sự lên sóng trong một ca thi.
 *
 * <p>Tách khỏi `activeCount` vì hai con số trả lời hai câu hỏi khác nhau, và câu mà giám thị cần là
 * "bao nhiêu người", không phải "bao nhiêu luồng".
 */
export function countLiveParticipants(schedule?: ActiveSchedule | null): number {
  if (!schedule) {
    return 0
  }
  return new Set(schedule.streams.map((stream) => stream.participantId)).size
}

export type MonitorConnectionState =
  | 'closed'
  | 'connected'
  | 'connecting'
  | 'error'
  | 'idle'
  | 'reconnecting'


export type MonitorToken = {
  expiresAt: string
  scheduleIds: string[]
  token: string
}

export function getStreamTypeLabel(
  streamType?: StreamType | string | null,
): string {
  if (streamType === 'camera') {
    return 'Camera'
  }

  if (streamType === 'screen') {
    return 'Màn hình'
  }

  return '—'
}

export function getStreamKey(
  streamType: StreamType | string,
  streamId: string,
): string {
  return `${streamType}:${streamId}`
}
