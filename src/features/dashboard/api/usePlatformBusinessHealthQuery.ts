import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api/graphqlClient'

/**
 * Bốn nhóm trường LOẠI TRỪ NHAU, phân loại theo TRƯỜNG chứ không theo dòng thuê bao. "Còn hiệu lực"
 * gồm cả gói đã hủy gia hạn (CANCELLED) vì trường vẫn dùng được tới hết hạn — chỉ đình chỉ
 * (SUSPENDED) mới mất quyền dùng ngay.
 *
 * Số đếm trường là ảnh chụp NGAY LÚC GỌI, không đổi theo khoảng thời gian; các con số tiền thì theo
 * khoảng đang chọn.
 */
export type PlatformBusinessHealth = {
  subscribedSchools: number
  expiringSoonSchools: number
  lapsedSchools: number
  suspendedSchools: number
  schoolsInDebt: number
  revenueVnd: number
  /** Cùng độ dài, ngay TRƯỚC khoảng đang xem — không phải tháng lịch trước. */
  previousRevenueVnd: number
  aiCostVnd: number
  /** null = khoảng này chưa thu được đồng nào. Biên của doanh thu 0 không tồn tại, không phải 0%. */
  grossMarginPercent: number | null
}

const PLATFORM_BUSINESS_HEALTH_QUERY = `
  query PlatformBusinessHealth($dateFrom: String, $dateTo: String) {
    platformBusinessHealth(dateFrom: $dateFrom, dateTo: $dateTo) {
      subscribedSchools
      expiringSoonSchools
      lapsedSchools
      suspendedSchools
      schoolsInDebt
      revenueVnd
      previousRevenueVnd
      aiCostVnd
      grossMarginPercent
    }
  }
`

async function fetchPlatformBusinessHealth(
  dateFrom: string | null,
  dateTo: string | null,
): Promise<PlatformBusinessHealth> {
  const data = await graphQLRequest<{ platformBusinessHealth: PlatformBusinessHealth }>(
    PLATFORM_BUSINESS_HEALTH_QUERY,
    { dateFrom, dateTo },
  )
  return data.platformBusinessHealth
}

export const platformBusinessHealthQueryKeys = {
  all: ['platform-business-health'] as const,
  range: (dateFrom: string | null, dateTo: string | null) =>
    [...platformBusinessHealthQueryKeys.all, dateFrom, dateTo] as const,
}

export function usePlatformBusinessHealthQuery(dateFrom: string | null, dateTo: string | null) {
  return useQuery({
    queryFn: () => fetchPlatformBusinessHealth(dateFrom, dateTo),
    queryKey: platformBusinessHealthQueryKeys.range(dateFrom, dateTo),
  })
}
