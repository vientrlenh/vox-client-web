import { useQuery } from '@tanstack/react-query'

import { graphQLRequest } from '@/shared/api'

import type { ProctoringAlertDto } from '../types'

const ALERT_FIELDS = `
      id
      eventId
      examSessionId
      candidateId
      streamId
      streamType
      alertType
      level
      source
      detail
      confidence
      capturedAt
      raisedAt
`

const EXAM_SESSION_PROCTORING_ALERTS_QUERY = `
  query ExamSessionProctoringAlerts($examSessionId: ID!) {
    examSessionProctoringAlerts(examSessionId: $examSessionId) {${ALERT_FIELDS}    }
  }
`

const SCHEDULE_PROCTORING_ALERTS_QUERY = `
  query ScheduleProctoringAlerts($scheduleId: ID!) {
    scheduleProctoringAlerts(scheduleId: $scheduleId) {${ALERT_FIELDS}    }
  }
`

export const proctoringAlertQueryKeys = {
  all: ['proctoring-alerts'] as const,
  bySchedule: (scheduleId: string | null) =>
    [...proctoringAlertQueryKeys.all, 'schedule', scheduleId] as const,
  bySession: (examSessionId: string | null) =>
    [...proctoringAlertQueryKeys.all, 'session', examSessionId] as const,
}

async function fetchExamSessionProctoringAlerts(examSessionId: string) {
  const data = await graphQLRequest<{ examSessionProctoringAlerts: ProctoringAlertDto[] }>(
    EXAM_SESSION_PROCTORING_ALERTS_QUERY,
    { examSessionId },
  )
  return data.examSessionProctoringAlerts
}

async function fetchScheduleProctoringAlerts(scheduleId: string) {
  const data = await graphQLRequest<{ scheduleProctoringAlerts: ProctoringAlertDto[] }>(
    SCHEDULE_PROCTORING_ALERTS_QUERY,
    { scheduleId },
  )
  return data.scheduleProctoringAlerts
}

/**
 * Cảnh báo giám sát của MỘT phiên thi -- cho màn chấm bài.
 *
 * `retry: false` cùng lý do với `useExamRecordingPlaybackQuery`: hai lỗi hay gặp nhất là không có
 * quyền và phiên thi không tồn tại, cả hai đều không tự khỏi khi thử lại.
 */
export function useExamSessionProctoringAlertsQuery(examSessionId: string | null) {
  return useQuery({
    enabled: Boolean(examSessionId),
    queryFn: () => fetchExamSessionProctoringAlerts(examSessionId as string),
    queryKey: proctoringAlertQueryKeys.bySession(examSessionId),
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Cảnh báo giám sát của CẢ ca thi -- cho màn giám sát trực tiếp.
 *
 * <p>`refetchInterval` không phải để hiển thị nhanh: cảnh báo mới đã về theo WebSocket rồi. Nó là
 * lưới an toàn cho khoảng thời gian WebSocket đứt -- pub/sub không phát lại, nên cảnh báo rơi vào
 * đúng lúc đó sẽ mất vĩnh viễn nếu không có ai đi hỏi lại. Một phút một lần là đủ để khoảng trống
 * tự lấp mà không biến thành gánh nặng cho server.
 */
export function useScheduleProctoringAlertsQuery(scheduleId: string | null) {
  return useQuery({
    enabled: Boolean(scheduleId),
    queryFn: () => fetchScheduleProctoringAlerts(scheduleId as string),
    queryKey: proctoringAlertQueryKeys.bySchedule(scheduleId),
    refetchInterval: 60_000,
    retry: false,
  })
}
