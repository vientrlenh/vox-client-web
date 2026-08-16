/**
 * Cảnh báo giám sát thi, dùng chung cho hai màn: giám sát trực tiếp và chấm bài sau thi.
 *
 * <p>Đặt ở feature riêng thay vì trong `monitoring` vì màn chấm bài cũng đọc chúng, và kéo cả feature
 * `monitoring` vào bundle của màn chấm chỉ để lấy vài hàm nhãn là cái giá không đáng.
 */

export type AlertType =
  | 'MULTIPLE_PERSONS'
  | 'PERSON_MISSING'
  | 'PHONE_DETECTED'
  | 'PROHIBITED_OBJECT'
  | 'RECONNECT_LOOP'
  | 'RECORDING_INCOMPLETE'
  | 'RECORDING_TRUNCATED'
  | 'STREAM_DROPPED'
  | 'TRACK_ENDED'
  | 'UNCOOPERATIVE_CANDIDATE'
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

/**
 * Mức độ của một cảnh báo, LẤY TỪ `level` đã lưu chứ không suy lại từ loại.
 *
 * <p>vox-streaming đóng dấu mức này lúc phát (`DefaultAlertLevel`) và gửi kèm trên cả nhánh trực
 * tiếp lẫn nhánh lưu vào DB. Trước đây màn hình bỏ qua nó và tự suy severity từ `alertType`, tức là
 * có hai bảng mức song song trong hệ -- và chúng đã lệch nhau: mọi cảnh báo backend chưa biết tên
 * rơi về INFO trong DB nhưng vẫn hiện màu theo bảng phía này.
 *
 * <p>Rơi về bảng theo loại chỉ khi `level` trống (bản ghi cũ, hoặc bản vox-streaming cũ hơn không
 * gửi trường này) -- vẫn tốt hơn là hiện mọi thứ thành INFO.
 */
export function getAlertSeverity(
  alertType?: string | null,
  level?: string | null,
): AlertSeverity {
  switch (level?.trim().toUpperCase()) {
    case 'CRITICAL':
      return 'critical'
    case 'WARNING':
      return 'warning'
    case 'INFO':
      return 'info'
    default:
      return getAlertTypeDisplay(alertType).severity
  }
}

/**
 * Nhãn + màu theo LOẠI cảnh báo. `severity` trả về ở đây chỉ là mức mặc định của loại đó, dùng khi
 * bản ghi không mang `level`; nơi nào có bản ghi thật thì gọi `getAlertSeverity` để lấy mức đã lưu.
 *
 * <p>Màu (`className`) cố ý KHÔNG đi theo mức mà đi theo BẢN CHẤT sự việc, vì đó là hai trục khác
 * nhau: đỏ cho nghi vấn gian lận, hổ phách cho hành vi thi, xám cho sự cố kỹ thuật. Một luồng rớt
 * và một chiếc điện thoại đều đáng chú ý, nhưng chúng đòi hai loại phản ứng khác hẳn nhau.
 */
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
    case 'PERSON_MISSING':
      return {
        className: 'border-amber-200 bg-amber-50 text-amber-700',
        label: 'Không thấy người trong camera',
        severity: 'warning',
      }
    case 'UNCOOPERATIVE_CANDIDATE':
      return {
        className: 'border-amber-200 bg-amber-50 text-amber-700',
        label: 'Không hợp tác khi trả lời',
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
    // Khác RECORDING_INCOMPLETE ở chỗ bản ghi VẪN xem được: chỉ vài giây cuối là đáng ngờ. Nhãn
    // phải nói rõ điều đó, nếu không người chấm sẽ tưởng cả bản ghi hỏng và bỏ qua bằng chứng.
    case 'RECORDING_TRUNCATED':
      return {
        className: 'border-slate-300 bg-slate-100 text-slate-700',
        label: 'Bản ghi cụt đoạn cuối',
        severity: 'info',
      }

    // Tên cũ, chỉ còn trong dữ liệu lịch sử -- không nguồn nào phát chúng nữa. Giữ lại vì sổ bằng
    // chứng thì KHÔNG đổi tên bản ghi đã lưu: tên là thứ hệ thống thật sự đã ghi lúc đó, và sửa nó
    // là viết lại lịch sử. Chỉ mức độ được nâng lại bằng migration, vì INFO ở đó là lỗi ghi chép
    // (nhánh "không nhận ra loại này") chứ không phải một đánh giá có chủ ý.
    case 'CRITICAL_VIOLATION':
      return {
        className: 'border-amber-200 bg-amber-50 text-amber-700',
        label: 'Không hợp tác khi trả lời',
        severity: 'warning',
      }
    case 'OBJECT_DETECTED':
      return {
        className: 'border-amber-200 bg-amber-50 text-amber-700',
        label: 'Phát hiện vật thể trong khung',
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
