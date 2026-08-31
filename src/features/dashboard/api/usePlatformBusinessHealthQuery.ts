import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api/graphqlClient'

/**
 * Mọi số đếm phân loại theo TRƯỜNG chứ không theo dòng thuê bao. "Còn hiệu lực" gồm cả gói đã hủy
 * gia hạn (CANCELLED) vì trường vẫn dùng được tới hết hạn — chỉ đình chỉ (SUSPENDED) mới mất quyền
 * dùng ngay.
 *
 * ĐỪNG CỘNG CÁC SỐ ĐẾM: `subscribed` / `lapsed` / `suspended` loại trừ nhau, nhưng `expiringSoon` là
 * TẬP CON của `subscribed`, còn `schoolsInDebt` đọc từ ví nên cắt ngang cả ba. Trường chưa từng mua
 * gói nào không nằm trong nhóm nào cả.
 *
 * Số đếm trường là ảnh chụp NGAY LÚC GỌI, không đổi theo khoảng thời gian; các con số tiền thì theo
 * khoảng đang chọn.
 */
export type PlatformBusinessHealth = {
  subscribedSchools: number
  /** Tập con của `subscribedSchools`, không phải một nhóm riêng. */
  expiringSoonSchools: number
  lapsedSchools: number
  suspendedSchools: number
  /** Cắt ngang ba nhóm trên: đọc từ số dư ví, không từ trạng thái thuê bao. */
  schoolsInDebt: number
  revenueVnd: number
  /** Cùng độ dài, ngay TRƯỚC khoảng đang xem — không phải tháng lịch trước. */
  previousRevenueVnd: number
  aiCostVnd: number
  /** null = khoảng này chưa thu được đồng nào. Biên của doanh thu 0 không tồn tại, không phải 0%. */
  grossMarginPercent: number | null
  /** Biên của kỳ so sánh. null = kỳ trước chưa thu được đồng nào, tức không có mức chênh để vẽ. */
  previousGrossMarginPercent: number | null
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
      previousGrossMarginPercent
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
