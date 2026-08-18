import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { useExamSchedulesQuery } from '@/features/examCore/api/queries'

import { getAlertSeverity } from '../types'
import { fetchScheduleProctoringAlerts, proctoringAlertQueryKeys } from './useProctoringAlertsQuery'

export type AlertSeverityCounts = {
  critical: number
  info: number
  /** critical + warning. INFO cố tình không tính -- xem `ProctoringAlertCountBadge`. */
  needsReview: number
  warning: number
}

function emptyCounts(): AlertSeverityCounts {
  return { critical: 0, info: 0, needsReview: 0, warning: 0 }
}

/**
 * Gộp cảnh báo của mọi ca thi trong kỳ thi lại thành số đếm theo TỪNG PHIÊN THI.
 *
 * <p>Đi qua `scheduleProctoringAlerts` thay vì hỏi từng phiên một: màn điều phối hiển thị hàng chục
 * dòng mỗi trang, và một truy vấn cho mỗi dòng sẽ thành hàng chục request mỗi lần lật trang. Một kỳ
 * thi thường chỉ có vài ca, nên gộp theo ca là ít request hơn hẳn và còn dùng lại được khi đổi trang.
 */
async function fetchAlertCountsBySession(scheduleIds: string[]): Promise<Map<string, AlertSeverityCounts>> {
  // allSettled chứ không all: một ca thi đã huỷ, hoặc một ca mà người đang xem không được phân công
  // vào, sẽ trả lỗi -- và `Promise.all` biến đúng một ca hỏng thành cột trống cho toàn bộ kỳ thi.
  // Thiếu số của một ca vẫn tốt hơn là mất số của tất cả.
  const results = await Promise.allSettled(scheduleIds.map(fetchScheduleProctoringAlerts))

  const counts = new Map<string, AlertSeverityCounts>()
  for (const result of results) {
    if (result.status !== 'fulfilled') {
      continue
    }
    for (const alert of result.value) {
      if (!alert.examSessionId) {
        continue
      }
      const current = counts.get(alert.examSessionId) ?? emptyCounts()
      const severity = getAlertSeverity(alert.alertType, alert.level)
      current[severity] += 1
      if (severity !== 'info') {
        current.needsReview += 1
      }
      counts.set(alert.examSessionId, current)
    }
  }
  return counts
}

/**
 * Số cảnh báo giám sát theo phiên thi cho cả một kỳ thi, dùng cho màn điều phối chấm bài.
 *
 * <p>`retry: false` vì hai lỗi hay gặp nhất -- không có quyền và kỳ thi không có ca nào -- đều không
 * tự khỏi khi thử lại. Hỏng thì cột cảnh báo trống, và đó đúng bằng hiện trạng trước khi có nó, nên
 * không được phép làm hỏng cả bảng điều phối.
 */
export function useExamProctoringAlertCountsQuery(examId: null | string) {
  const schedulesQuery = useExamSchedulesQuery(examId)
  const scheduleIds = useMemo(
    () => (schedulesQuery.data ?? []).map((schedule) => schedule.id).sort(),
    [schedulesQuery.data],
  )

  return useQuery({
    enabled: scheduleIds.length > 0,
    queryFn: () => fetchAlertCountsBySession(scheduleIds),
    queryKey: [...proctoringAlertQueryKeys.all, 'exam-counts', examId, scheduleIds],
    retry: false,
    staleTime: 60_000,
  })
}
