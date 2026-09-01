import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { QuotaType } from '@/features/subscription_school/types'

export type AiCostGranularity = 'DAY' | 'WEEK' | 'MONTH'

export type AiCostPoint = {
  /** ISO-8601, đầu mốc theo giờ Việt Nam. */
  bucket: string
  quotaType: QuotaType
  /** Chuỗi thập phân nguyên vẹn — đổi sang số bằng toNumber, chỉ ở bước hiển thị. */
  costVnd: string
}

export type SchoolAiCostTimeseries = {
  granularity: AiCostGranularity
  totalCostVnd: string
  points: AiCostPoint[]
  /** null = trường chưa từng tiêu đồng nào. Khoảng trước mốc này chưa được ghi sổ (xem V10). */
  recordedFrom: string | null
}

const SCHOOL_AI_COST_TIMESERIES = `
  query SchoolAiCostTimeseries($dateFrom: String, $dateTo: String, $granularity: AiCostGranularity!) {
    schoolAiCostTimeseries(dateFrom: $dateFrom, dateTo: $dateTo, granularity: $granularity) {
      granularity
      totalCostVnd
      points {
        bucket
        quotaType
        costVnd
      }
      recordedFrom
    }
  }
`

export type AiCostWindow = {
  dateFrom: string | null
  dateTo: string | null
  granularity: AiCostGranularity
}

export const schoolAiCostKeys = {
  all: ['school-ai-cost'] as const,
  spend: (window: AiCostWindow, quotaType: QuotaType | null, page: number) =>
    ['school-ai-cost', 'by-user', window, quotaType, page] as const,
  timeseries: (window: AiCostWindow) => ['school-ai-cost', 'timeseries', window] as const,
}

export function useSchoolAiCostTimeseriesQuery(window: AiCostWindow) {
  return useQuery({
    queryFn: async () => {
      const data = await graphQLRequest<{ schoolAiCostTimeseries: SchoolAiCostTimeseries }>(
        SCHOOL_AI_COST_TIMESERIES,
        window,
      )
      return data.schoolAiCostTimeseries
    },
    queryKey: schoolAiCostKeys.timeseries(window),
  })
}

export type UserAiSpend = {
  userId: string
  fullName: string | null
  quotaType: QuotaType
  spentVnd: string
  /** null = nhà trường chưa chia trần chi cho người này. Vẫn tiêu được, chỉ không có mức để so. */
  allocatedAmountVnd: string | null
}

export type SchoolAiSpendByUserPage = {
  content: UserAiSpend[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  /** Phần chi của kỳ thi tập trung — không thuộc trần chi của ai, nên đứng ngoài bảng xếp hạng. */
  schoolWideCostVnd: string
}

const SCHOOL_AI_SPEND_BY_USER = `
  query SchoolAiSpendByUser($dateFrom: String, $dateTo: String, $quotaType: QuotaType, $page: Int, $size: Int) {
    schoolAiSpendByUser(dateFrom: $dateFrom, dateTo: $dateTo, quotaType: $quotaType, page: $page, size: $size) {
      content {
        userId
        fullName
        quotaType
        spentVnd
        allocatedAmountVnd
      }
      page
      size
      totalElements
      totalPages
      schoolWideCostVnd
    }
  }
`

const SPEND_PAGE_SIZE = 10

export function useSchoolAiSpendByUserQuery(
  window: AiCostWindow,
  quotaType: QuotaType | null,
  page: number,
) {
  return useQuery({
    queryFn: async () => {
      const data = await graphQLRequest<{ schoolAiSpendByUser: SchoolAiSpendByUserPage }>(
        SCHOOL_AI_SPEND_BY_USER,
        {
          dateFrom: window.dateFrom,
          dateTo: window.dateTo,
          page,
          quotaType,
          size: SPEND_PAGE_SIZE,
        },
      )
      return data.schoolAiSpendByUser
    },
    queryKey: schoolAiCostKeys.spend(window, quotaType, page),
  })
}
