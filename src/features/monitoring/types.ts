
export type StreamType = 'camera' | 'screen'

export type StreamTokenRequest = {
  examId: string
  scheduleIds: string[]
}

export type AlertType =
  | 'FACE_NOT_VISIBLE'
  | 'MULTIPLE_PERSONS'
  | 'PHONE_DETECTED'
  | 'RECONNECT_LOOP'
  | 'STREAM_DROPPED'
  | 'SUSPICIOUS_GAZE'
  | 'TRACK_ENDED'

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
  participantId: string
  sessionId: string
  streamId: string
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

export type AlertSeverity = 'critical' | 'info' | 'warning'

export type AlertTypeDisplay = {
  className: string
  label: string
  severity: AlertSeverity
}

export function getAlertTypeDisplay(
  alertType?: string | null,
): AlertTypeDisplay {
  switch (alertType) {
    case 'PHONE_DETECTED':
      return {
        className: 'border-red-200 bg-red-50 text-red-700',
        label: 'Phát hiện điện thoại',
        severity: 'critical',
      }
    case 'MULTIPLE_PERSONS':
      return {
        className: 'border-red-200 bg-red-50 text-red-700',
        label: 'Nhiều người trong khung hình',
        severity: 'critical',
      }
    case 'FACE_NOT_VISIBLE':
      return {
        className: 'border-amber-200 bg-amber-50 text-amber-700',
        label: 'Không thấy mặt học sinh',
        severity: 'warning',
      }
    case 'SUSPICIOUS_GAZE':
      return {
        className: 'border-amber-200 bg-amber-50 text-amber-700',
        label: 'Hướng nhìn đáng ngờ',
        severity: 'warning',
      }
    case 'RECONNECT_LOOP':
      return {
        className: 'border-amber-200 bg-amber-50 text-amber-700',
        label: 'Reconnect liên tục',
        severity: 'warning',
      }
    case 'STREAM_DROPPED':
      return {
        className: 'border-slate-300 bg-slate-100 text-slate-700',
        label: 'Mất kết nối stream',
        severity: 'warning',
      }
    case 'TRACK_ENDED':
      return {
        className: 'border-slate-300 bg-slate-100 text-slate-700',
        label: 'Luồng media kết thúc',
        severity: 'warning',
      }
    default:
      return {
        className: 'border-slate-200 bg-slate-50 text-slate-600',
        label: alertType?.trim() || 'Cảnh báo',
        severity: 'info',
      }
  }
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
