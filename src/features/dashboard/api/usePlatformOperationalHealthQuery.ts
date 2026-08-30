import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api/graphqlClient'

export type GradingOutcomeBucket = {
  /** yyyy-mm-dd theo lịch giờ Việt Nam — BE đã cắt ngày sẵn, client không quy đổi lại. */
  day: string
  graded: number
  failed: number
}

/**
 * Trộn hai loại thời gian CÓ CHỦ Ý — hiển thị phải giữ đúng như vậy:
 * `sessionsInProgress` / `examsInProgress` / `gradingQueueDepth` là ảnh chụp NGAY LÚC GỌI và không
 * đổi theo khoảng thời gian đang chọn; phần còn lại thuộc khoảng đó.
 */
export type PlatformOperationalHealth = {
  sessionsInProgress: number
  examsInProgress: number
  gradingQueueDepth: number
  graded: number
  gradingFailed: number
  /** null = trong khoảng chưa có phiên nào chấm xong lẫn chấm lỗi. Khác hẳn 0%. */
  successRatePercent: number | null
  /** Liên tục theo ngày, cũ -> mới, ngày không có phiên đã được BE trả về 0. */
  daily: GradingOutcomeBucket[]
}

const PLATFORM_OPERATIONAL_HEALTH_QUERY = `
  query PlatformOperationalHealth($dateFrom: String, $dateTo: String) {
    platformOperationalHealth(dateFrom: $dateFrom, dateTo: $dateTo) {
      sessionsInProgress
      examsInProgress
      gradingQueueDepth
      graded
      gradingFailed
      successRatePercent
      daily {
        day
        graded
        failed
      }
    }
  }
`

async function fetchPlatformOperationalHealth(
  dateFrom: string | null,
  dateTo: string | null,
): Promise<PlatformOperationalHealth> {
  const data = await graphQLRequest<{ platformOperationalHealth: PlatformOperationalHealth }>(
    PLATFORM_OPERATIONAL_HEALTH_QUERY,
    { dateFrom, dateTo },
  )
  return data.platformOperationalHealth
}

export const platformOperationalHealthQueryKeys = {
  all: ['platform-operational-health'] as const,
  range: (dateFrom: string | null, dateTo: string | null) =>
    [...platformOperationalHealthQueryKeys.all, dateFrom, dateTo] as const,
}

export function usePlatformOperationalHealthQuery(dateFrom: string | null, dateTo: string | null) {
  return useQuery({
    queryFn: () => fetchPlatformOperationalHealth(dateFrom, dateTo),
    queryKey: platformOperationalHealthQueryKeys.range(dateFrom, dateTo),
  })
}
