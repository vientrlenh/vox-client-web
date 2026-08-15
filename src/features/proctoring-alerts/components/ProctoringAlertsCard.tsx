import { ShieldAlert } from 'lucide-react'

import { StatusBadge, type StatusTone } from '@/shared/ui/StatusBadge'

import { useExamSessionProctoringAlertsQuery } from '../api/useProctoringAlertsQuery'
import {
  getAlertSeverity,
  getAlertSourceLabel,
  getAlertTypeDisplay,
  getProctoringStreamTypeLabel,
  type AlertSeverity,
  type ProctoringAlertDto,
} from '../types'

const SEVERITY_TONE: Record<AlertSeverity, StatusTone> = {
  critical: 'danger',
  info: 'neutral',
  warning: 'warning',
}

function formatClock(value: string): string {
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) {
    return value
  }
  return new Date(parsed).toLocaleString('vi-VN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    second: '2-digit',
  })
}

/**
 * Gom các cảnh báo cùng loại lại để đếm, giữ lần xảy ra SỚM NHẤT làm mốc.
 *
 * <p>Một điều kiện kéo dài sẽ phát lại theo chu kỳ cooldown ở phía AI, nên liệt kê thô sẽ thành mười
 * dòng "không thấy mặt" giống hệt nhau và đẩy những cảnh báo khác ra khỏi tầm mắt. Người chấm cần
 * biết "chuyện gì, mấy lần, bắt đầu từ lúc nào" -- không phải từng lần một.
 */
type AlertGroup = {
  alertType: string
  count: number
  details: string[]
  firstAt: string
  lastAt: string
  /**
   * Mức của cả nhóm, lấy từ bản ghi ĐẦU TIÊN gặp.
   *
   * <p>Cùng một loại thì cùng một mức, vì mức được suy ra từ loại ở nơi phát. Trường hợp duy nhất
   * lệch là bản ghi cũ hơn lần đổi thang mức gần nhất -- và mức cũ đã được migration nâng lại, nên
   * không có nhóm nào trộn hai mức trong thực tế.
   */
  level: string | null
  sources: string[]
  streamTypes: string[]
}

function groupAlerts(alerts: ProctoringAlertDto[]): AlertGroup[] {
  const groups = new Map<string, AlertGroup>()
  for (const alert of alerts) {
    const existing = groups.get(alert.alertType)
    if (!existing) {
      groups.set(alert.alertType, {
        alertType: alert.alertType,
        count: 1,
        details: alert.detail ? [alert.detail] : [],
        firstAt: alert.capturedAt,
        lastAt: alert.capturedAt,
        level: alert.level,
        sources: alert.source ? [alert.source] : [],
        streamTypes: alert.streamType ? [alert.streamType] : [],
      })
      continue
    }
    existing.count += 1
    existing.lastAt = alert.capturedAt
    if (alert.detail && !existing.details.includes(alert.detail)) {
      existing.details.push(alert.detail)
    }
    if (alert.source && !existing.sources.includes(alert.source)) {
      existing.sources.push(alert.source)
    }
    if (alert.streamType && !existing.streamTypes.includes(alert.streamType)) {
      existing.streamTypes.push(alert.streamType)
    }
  }
  // Nặng trước, rồi nhiều lần trước: người chấm đọc từ trên xuống và thường dừng sớm.
  const severityRank = (group: AlertGroup) => {
    const severity = getAlertSeverity(group.alertType, group.level)
    return severity === 'critical' ? 0 : severity === 'warning' ? 1 : 2
  }
  return [...groups.values()].sort((left, right) => {
    const bySeverity = severityRank(left) - severityRank(right)
    return bySeverity !== 0 ? bySeverity : right.count - left.count
  })
}

/**
 * Bằng chứng giám sát của một phiên thi, cho màn chấm bài.
 *
 * <p>Là thứ để người chấm TỰ phán đoán, không phải một con số tham gia tính điểm -- xem chú thích
 * trên `ExamProctoringAlert` phía backend. Vì thế thẻ này cố ý không đưa ra kết luận, không đề xuất
 * trừ điểm, và nói rõ nguồn nào có thể sai.
 */
export function ProctoringAlertsCard({ sessionId }: { sessionId: string | null }) {
  const { data, error, isPending } = useExamSessionProctoringAlertsQuery(sessionId)

  // Không có phiên thi thì ẩn hẳn: bài chấm không gắn ca thi nào (class test) vốn không có giám sát,
  // và một thẻ trống ở đó chỉ làm người chấm tưởng dữ liệu bị mất.
  if (!sessionId) {
    return null
  }

  // Lỗi quyền/tải: im lặng thay vì dựng một khối đỏ. Cảnh báo giám sát là thông tin BỔ SUNG cho việc
  // chấm; hỏng đường đọc của nó không được phép trông như thể bài thi có vấn đề.
  if (error || isPending || !data || data.length === 0) {
    return null
  }

  const groups = groupAlerts(data)

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <div className="flex items-center gap-2 text-sm font-bold text-amber-900">
        <ShieldAlert className="size-4 text-amber-600" />
        Cảnh báo giám sát ({data.length})
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-amber-700">
        Ghi nhận trong lúc thi, để bạn xem lại video và tự đánh giá. Đây không phải kết luận gian lận
        và không tự trừ điểm — cảnh báo từ AI có thể sai. Nếu thấy cần, hãy dùng quyết định giữ
        nguyên / chấm lại / hủy bài thay vì hạ điểm tiêu chí.
      </p>

      <div className="mt-3 grid gap-2">
        {groups.map((group) => {
          const display = getAlertTypeDisplay(group.alertType)
          const severity = getAlertSeverity(group.alertType, group.level)
          return (
            <div className="rounded-xl border border-amber-200 bg-white px-3.5 py-2.5" key={group.alertType}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12.5px] font-bold text-slate-900">{display.label}</span>
                <StatusBadge label={SEVERITY_LABEL[severity]} tone={SEVERITY_TONE[severity]} />
                {group.count > 1 ? <StatusBadge label={`${group.count} lượt`} tone="warning" /> : null}
              </div>

              {group.details.length > 0 ? (
                <p className="mt-1 text-[12.5px] leading-relaxed text-slate-600">
                  {group.details.join(' · ')}
                </p>
              ) : null}

              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] font-medium text-slate-400">
                <span>Lần đầu: {formatClock(group.firstAt)}</span>
                {group.count > 1 ? <span>Gần nhất: {formatClock(group.lastAt)}</span> : null}
                {group.streamTypes.length > 0 ? (
                  <span>
                    Luồng: {group.streamTypes.map(getProctoringStreamTypeLabel).join(', ')}
                  </span>
                ) : null}
                {group.sources.length > 0 ? (
                  <span>Nguồn: {group.sources.map(getAlertSourceLabel).join(', ')}</span>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  critical: 'Nghiêm trọng',
  info: 'Thông tin',
  warning: 'Cần lưu ý',
}
