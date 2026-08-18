import { useQuery } from '@tanstack/react-query'

import { graphQLRequest } from '@/shared/api'
import type { ExamKind, ExamStatus } from '@/features/examCore/types'

/**
 * Kỳ thi nhìn từ màn giám sát.
 *
 * <p>Cố ý KHÔNG phải `ExamDto`. Hai màn có hai tập người xem: giám thị được phân công một ca cần
 * đúng chừng này để nhận ra phòng của mình, còn `ExamDto` mang theo blueprint, chính sách chấm,
 * ngưỡng AI... Dùng chung một kiểu nghĩa là mỗi trường thêm vào cho màn quản lý về sau đều tự động
 * chảy sang cho giám thị.
 */
export type MonitoredExamSummary = {
  code: null | string
  examId: string
  kind: ExamKind | null
  /**
   * Số ca đang chạy NGAY BÂY GIỜ. 0 nghĩa là kỳ thi có mặt ở đây vì SẮP bắt đầu -- màn hình phải
   * nói vậy thay vì mời bấm vào xem trực tiếp một phòng chưa có ai.
   */
  liveScheduleCount: number
  name: null | string
  status: ExamStatus | null
  /** Mốc bắt đầu sớm nhất trong các ca người xem giám sát được, KHÔNG phải `openAt` của kỳ thi. */
  windowStart: null | string
  windowEnd: null | string
}

const MONITORED_EXAM_FIELDS = `
    examId
    code
    name
    kind
    status
    windowStart
    windowEnd
    liveScheduleCount
`

const MONITORABLE_EXAMS_QUERY = `
  query MonitorableExams {
    monitorableExams {
      ${MONITORED_EXAM_FIELDS}
    }
  }
`

const MONITORABLE_EXAM_QUERY = `
  query MonitorableExam($examId: ID!) {
    monitorableExam(examId: $examId) {
      ${MONITORED_EXAM_FIELDS}
    }
  }
`

export const monitorableExamKeys = {
  detail: (examId: string) => ['monitoring', 'monitorable-exams', examId] as const,
  list: () => ['monitoring', 'monitorable-exams'] as const,
}

/**
 * Nhịp tải lại danh sách.
 *
 * <p>Cần thiết vì phạm vi danh sách giờ do SERVER quyết theo thời gian: một kỳ thi sắp bắt đầu sẽ
 * chuyển thành đang diễn ra mà không có bất kỳ thao tác nào của người dùng. Không có nhịp này thì
 * giám thị ngồi sẵn trên trang chờ tới giờ sẽ chẳng thấy gì đổi.
 */
const MONITORABLE_EXAMS_POLL_MS = 30_000

export function useMonitorableExamsQuery() {
  return useQuery({
    queryFn: async () => {
      const data = await graphQLRequest<{ monitorableExams: MonitoredExamSummary[] }>(
        MONITORABLE_EXAMS_QUERY,
      )
      return data.monitorableExams
    },
    queryKey: monitorableExamKeys.list(),
    refetchInterval: MONITORABLE_EXAMS_POLL_MS,
  })
}

export function useMonitorableExamQuery(examId: null | string) {
  return useQuery({
    enabled: Boolean(examId),
    queryFn: async () => {
      const data = await graphQLRequest<{ monitorableExam: MonitoredExamSummary | null }>(
        MONITORABLE_EXAM_QUERY,
        { examId },
      )
      return data.monitorableExam
    },
    queryKey: monitorableExamKeys.detail(examId ?? ''),
  })
}
