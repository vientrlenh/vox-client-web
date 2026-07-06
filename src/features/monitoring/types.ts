
export type StreamType = 'camera' | 'screen'

export type AlertType =
  | 'FACE_NOT_VISIBLE'
  | 'MULTIPLE_PERSONS'
  | 'PHONE_DETECTED'
  | 'RECONNECT_LOOP'
  | 'STREAM_DROPPED'
  | 'SUSPICIOUS_GAZE'
  | 'TRACK_ENDED'

export type ParticipantEventType = 'joined' | 'left'

/** Một stream đang hoạt động — phần tử trong `snapshot` và `/rooms/active`. */
export type StreamSnapshot = {
  participantId: string
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
  roomId: string
  streamId: string
}

export type MonitorMessage =
  | { streams: StreamSnapshot[]; type: 'snapshot' }
  | { frame: FrameNotification; type: 'frame' }
  | { event: ParticipantEvent; type: 'participant' }
  | { alert: AlertEvent; type: 'alert' }


export type ActiveRoom = {
  activeCount: number
  roomId: string
  streams: StreamSnapshot[]
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
  roomIds: string[]
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
