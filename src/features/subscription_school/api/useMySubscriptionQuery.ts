import { useQuery } from '@tanstack/react-query'
import { graphQLRequest, requireSchoolId } from '@/shared/api'
import type { MySubscription } from '../model'

export const mySubscriptionQueryKeys = {
  all: ['my-subscription'] as const,
}

// Bộ field theo mô hình HIỆN TẠI (xem ../model). Bản trước hỏi planId, pricePerYear, validityDays,
// popular, serviceFeeRatio, includedQuantity, tokenUnitPrice -- không field nào còn trong schema,
// và GraphQL từ chối CẢ query khi có field lạ chứ không bỏ qua từng field, nên màn hình không nhận
// được gì thay vì nhận thiếu.
const MY_SUBSCRIPTION_QUERY = `
  query MySubscription($schoolId: ID!) {
    schoolSubscription(schoolId: $schoolId) {
      id
      schoolId
      subscriptionPlanId
      startDate
      endDate
      status
      pricePaidSnapshot
      cancelledAt
      suspendedAt
      suspendedReason
      plan {
        id
        name
        tagline
        priceVnd
        periodType
        periodCount
        maxTimePerAttemptMin
        quotas {
          id
          quotaType
          includedAmountVnd
        }
      }
    }
  }
`

export async function fetchMySubscription(): Promise<MySubscription | null> {
  const schoolId = requireSchoolId()
  const data = await graphQLRequest<{ schoolSubscription: MySubscription | null }>(MY_SUBSCRIPTION_QUERY, {
    schoolId,
  })

  return data.schoolSubscription
}

export function useMySubscriptionQuery() {
  return useQuery({
    queryFn: fetchMySubscription,
    queryKey: mySubscriptionQueryKeys.all,
  })
}
