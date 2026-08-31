import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api/graphqlClient'

/**
 * Bốn nhóm "trường cần chú ý". KHÔNG phải một phép chia nhóm — đừng cộng bốn số lại: `EXPIRING_SOON`
 * là tập con của nhóm còn gói, `LAPSED`/`SUSPENDED` loại trừ nhau, còn `IN_DEBT` cắt ngang cả ba vì
 * nó đọc từ số dư ví chứ không từ trạng thái thuê bao.
 */
export const SCHOOL_RISK_BUCKETS = ['EXPIRING_SOON', 'LAPSED', 'SUSPENDED', 'IN_DEBT'] as const

export type SchoolRiskBucket = (typeof SCHOOL_RISK_BUCKETS)[number]

export function isSchoolRiskBucket(value: string | null): value is SchoolRiskBucket {
  return value !== null && (SCHOOL_RISK_BUCKETS as readonly string[]).includes(value)
}

export type SchoolAtRisk = {
  schoolId: string
  schoolName: string
  schoolCode: string
  /** Gói của kỳ LIÊN QUAN tới nhóm; null khi gói đã bị xoá khỏi danh mục. */
  planName: string | null
  relevantEndDate: string | null
  /** Chỉ có nghĩa ở nhóm SUSPENDED — và là thông tin đáng giá nhất của nhóm đó. */
  suspendedReason: string | null
  /** Âm nghĩa là trường đang bị chặn mở ca thi. Không bao giờ null. */
  balanceVnd: number
}

export type SchoolAtRiskPage = {
  content: SchoolAtRisk[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type SchoolRiskBucketCounts = {
  expiringSoon: number
  lapsed: number
  suspended: number
  inDebt: number
}

export type SchoolsAtRisk = {
  bucket: SchoolRiskBucket
  counts: SchoolRiskBucketCounts
  schools: SchoolAtRiskPage
}

const SCHOOLS_AT_RISK_QUERY = `
  query SchoolsAtRisk($bucket: SchoolRiskBucket!, $keyword: String, $page: Int, $size: Int) {
    schoolsAtRisk(bucket: $bucket, keyword: $keyword, page: $page, size: $size) {
      bucket
      counts {
        expiringSoon
        lapsed
        suspended
        inDebt
      }
      schools {
        page
        size
        totalElements
        totalPages
        content {
          schoolId
          schoolName
          schoolCode
          planName
          relevantEndDate
          suspendedReason
          balanceVnd
        }
      }
    }
  }
`

const SCHOOLS_AT_RISK_PAGE_SIZE = 10

export const schoolsAtRiskQueryKeys = {
  all: ['schools-at-risk'] as const,
  bucket: (bucket: SchoolRiskBucket, keyword: string, page: number) =>
    [...schoolsAtRiskQueryKeys.all, bucket, keyword, page] as const,
}

export function useSchoolsAtRiskQuery({
  bucket,
  keyword,
  page,
}: {
  bucket: SchoolRiskBucket
  keyword: string
  page: number
}) {
  return useQuery({
    // Giữ trang cũ trong lúc tải trang mới: bốn thẻ đếm ở trên không nhấp nháy về rỗng mỗi lần đổi
    // nhóm hay gõ tìm kiếm.
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const data = await graphQLRequest<{ schoolsAtRisk: SchoolsAtRisk }>(SCHOOLS_AT_RISK_QUERY, {
        bucket,
        keyword: keyword.trim() || null,
        page,
        size: SCHOOLS_AT_RISK_PAGE_SIZE,
      })
      return data.schoolsAtRisk
    },
    queryKey: schoolsAtRiskQueryKeys.bucket(bucket, keyword.trim(), page),
  })
}
