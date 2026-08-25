import { useQuery } from '@tanstack/react-query'
import { graphQLRequest, requireSchoolId } from '@/shared/api'
import type { InvoicePage } from '../types'

export const invoiceQueryKeys = {
  all: ['my-invoices'] as const,
  list: (page: number, size: number) => [...invoiceQueryKeys.all, 'list', page, size] as const,
}

const INVOICES_QUERY = `
  query MyInvoices($schoolId: ID!, $page: Int, $size: Int) {
    invoices(schoolId: $schoolId, page: $page, size: $size) {
      content {
        id
        invoiceNumber
        subscriptionId
        sourceType
        sourceId
        issueDate
        amount
        status
        paymentLinkId
        checkoutUrl
        paidAt
        resolvedPlanId
        quotaItems {
          quotaType
          amount
        }
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

async function fetchInvoices(page: number, size: number): Promise<InvoicePage> {
  const schoolId = requireSchoolId()
  const data = await graphQLRequest<{ invoices: InvoicePage }>(INVOICES_QUERY, {
    page: page - 1,
    schoolId,
    size,
  })

  const response = data.invoices
  return {
    ...response,
    page: response.page + 1,
  }
}

type UseInvoicesQueryOptions = {
  enabled?: boolean
  // Dùng khi cần tự bám theo trạng thái mới nhất từ BE (vd trang kết quả thanh toán chờ webhook/job
  // đối soát chốt hóa đơn) thay vì chỉ tải một lần. false/undefined nghĩa là không poll.
  refetchInterval?: number | false
}

export function useInvoicesQuery(page: number, size: number, options?: UseInvoicesQueryOptions) {
  return useQuery({
    enabled: options?.enabled ?? true,
    placeholderData: (previousData) => previousData,
    queryFn: () => fetchInvoices(page, size),
    queryKey: invoiceQueryKeys.list(page, size),
    refetchInterval: options?.refetchInterval ?? false,
  })
}
