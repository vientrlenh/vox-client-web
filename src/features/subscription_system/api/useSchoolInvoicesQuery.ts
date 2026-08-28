import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { InvoicePage } from '../types'

export const schoolInvoicesQueryKeys = {
  all: ['school-invoices'] as const,
  list: (schoolId: string, page: number, size: number) =>
    [...schoolInvoicesQueryKeys.all, schoolId, page, size] as const,
}

const SCHOOL_INVOICES_QUERY = `
  query SchoolInvoices($schoolId: ID!, $page: Int, $size: Int) {
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
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

async function fetchSchoolInvoices(schoolId: string, page: number, size: number): Promise<InvoicePage> {
  const data = await graphQLRequest<{ invoices: InvoicePage }>(SCHOOL_INVOICES_QUERY, {
    page,
    schoolId,
    size,
  })

  const response = data.invoices
  return response
}

export function useSchoolInvoicesQuery(schoolId: string | null, page: number, size: number) {
  return useQuery({
    enabled: Boolean(schoolId),
    placeholderData: (previousData) => previousData,
    queryFn: () => fetchSchoolInvoices(schoolId as string, page, size),
    queryKey: schoolInvoicesQueryKeys.list(schoolId ?? '', page, size),
  })
}
