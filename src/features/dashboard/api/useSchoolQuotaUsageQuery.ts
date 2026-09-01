import { useQuery } from '@tanstack/react-query'
import { graphQLRequest, requireSchoolId } from '@/shared/api'
import type { QuotaType } from '@/features/subscription_school/types'

export type { QuotaType }

export type SchoolQuotaUsage = {
  id: string
  quotaType: QuotaType
  totalAllocatedAmountVnd: number
  usedAmountVnd: number
}

/**
 * Hai túi hạn mức kèm gói — cùng dữ liệu với "Mức sử dụng" ở trang gói dịch vụ.
 *
 * Trước đây hai ô này ăn chung truy vấn với biểu đồ, mà truy vấn đó không tồn tại trong schema, nên
 * chúng đứng ở 0 ₫ / 0 ₫ với MỌI trường. `subscriptionUsage` thì có thật và vẫn chạy — file này đã
 * nằm sẵn trong repo từ lâu mà không màn nào import.
 */
const SCHOOL_QUOTA_USAGE_QUERY = `
  query SchoolQuotaUsage($schoolId: ID!) {
    subscriptionUsage(schoolId: $schoolId) {
      id
      quotaType
      totalAllocatedAmountVnd
      usedAmountVnd
    }
  }
`

export const schoolQuotaUsageKeys = {
  all: ['school-quota-usage'] as const,
}

export function useSchoolQuotaUsageQuery() {
  return useQuery({
    queryFn: async () => {
      const data = await graphQLRequest<{ subscriptionUsage: SchoolQuotaUsage[] }>(
        SCHOOL_QUOTA_USAGE_QUERY,
        { schoolId: requireSchoolId() },
      )
      return data.subscriptionUsage
    },
    queryKey: schoolQuotaUsageKeys.all,
  })
}
