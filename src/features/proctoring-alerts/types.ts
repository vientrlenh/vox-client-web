/**
 * Cảnh báo giám sát thi, dùng chung cho hai màn: giám sát trực tiếp và chấm bài sau thi.
 *
 * <p>Đặt ở feature riêng thay vì trong `monitoring` vì màn chấm bài cũng đọc chúng, và kéo cả feature
 * `monitoring` vào bundle của màn chấm chỉ để lấy vài hàm nhãn là cái giá không đáng.
 */

export type AlertType =
  | 'FACE_NOT_VISIBLE'
  | 'MULTIPLE_PERSONS'
  | 'PHONE_DETECTED'
  | 'PROHIBITED_OBJECT'
  | 'RECONNECT_LOOP'
  | 'RECORDING_INCOMPLETE'
  | 'STREAM_DROPPED'
  | 'SUSPICIOUS_GAZE'
  | 'TRACK_ENDED'
  | 'WINDOW_FOCUS_LOST'

export type AlertSeverity = 'critical' | 'info' | 'warning'

export type AlertTypeDisplay = {
  className: string
  label: string
  severity: AlertSeverity
}

/**
 * Một cảnh báo đã được lưu, đọc từ `examSessionProctoringAlerts` / `scheduleProctoringAlerts`.
 *
 * <p>Khác với cảnh báo trên WebSocket ở hai chỗ: nó luôn có `eventId` (khoá khử trùng khi gộp hai
 * nguồn), và `candidateId` có thể null vì nguồn phát không phải lúc nào cũng biết thí sinh nào.
 */
export type ProctoringAlertDto = {
  id: string
  eventId: string
  examSessionId: string
  candidateId: string | null
  streamId: string | null
  streamType: string | null
  alertType: string
  level: string | null
  source: string | null
  detail: string | null
  confidence: number | null
  /** ISO-8601 tuyệt đối, KHÔNG phải mốc tua trong video. */
  capturedAt: string
  raisedAt: string
}

export function getAlertTypeDisplay(alertType?: string | null): AlertTypeDisplay {
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
    case 'PROHIBITED_OBJECT':
      return {
        className: 'border-red-200 bg-red-50 text-red-700',
        label: 'Phát hiện vật thể cấm',
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
    case 'WINDOW_FOCUS_LOST':
      return {
        className: 'border-amber-200 bg-amber-50 text-amber-700',
        label: 'Rời khỏi cửa sổ bài thi',
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
    case 'RECORDING_INCOMPLETE':
      return {
        className: 'border-slate-300 bg-slate-100 text-slate-700',
        label: 'Bản ghi không trọn vẹn',
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

/**
 * Nhãn loại luồng, KHÔNG phân biệt hoa thường.
 *
 * <p>Cùng một giá trị tới đây dưới hai dạng: cảnh báo trực tiếp mang `camera`/`screen` chữ thường
 * đúng như vox-streaming phát, còn cảnh báo đọc từ DB đã được chuẩn hoá thành chữ hoa lúc ghi.
 */
export function getProctoringStreamTypeLabel(streamType?: string | null): string {
  const normalized = streamType?.trim().toUpperCase()
  if (normalized === 'CAMERA') {
    return 'Camera'
  }
  if (normalized === 'SCREEN') {
    return 'Màn hình'
  }
  return '—'
}

/**
 * Nguồn phát hiện, diễn giải cho người đọc.
 *
 * <p>Người chấm cần phân biệt được: `AI` là mô hình thị giác đoán từ khung hình (có dương tính giả),
 * còn `STREAMING` là sự kiện hạ tầng đo được (mất luồng, ghi hỏng) và gần như không sai.
 */
export function getAlertSourceLabel(source?: string | null): string {
  const normalized = source?.trim().toUpperCase()
  if (normalized === 'AI') {
    return 'AI phát hiện'
  }
  if (normalized === 'STREAMING') {
    return 'Hệ thống ghi hình'
  }
  return source?.trim() || '—'
}
