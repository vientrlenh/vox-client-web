import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
// OrderPage nằm ở miền order_school, KHÔNG phải subscription_school: main đã tách đơn hàng
// (orders/order_items/payment_records) ra khỏi miền gói đăng ký. File này còn trỏ vào `../types` cũ.
import type { OrderPage } from '@/features/order_school/types'

export const myOrdersQueryKeys = {
  all: ['my-orders'] as const,
  list: (page: number, size: number) => [...myOrdersQueryKeys.all, 'list', page, size] as const,
}

// Lịch sử đơn của chính trường đang đăng nhập -- KHÔNG có query "invoices" riêng: hóa đơn chỉ là
// một trường phụ thuộc của Order (invoice != null nghĩa là đơn đã thu được tiền), xem order.graphqls
// / invoice.graphqls ở BE.
const MY_ORDERS_QUERY = `
  query MyOrders($page: Int, $size: Int) {
    myOrders(page: $page, size: $size) {
      content {
        id
        schoolId
        type
        description
        subtotalAmountVnd
        totalAmountVnd
        chargedFeeVnd
        discountAmountVnd
        status
        createdAt
        updatedAt
        expiresAt
        items {
          id
          orderId
          type
          itemId
          unitPriceVnd
          amountVnd
          quantity
        }
        invoice {
          invoiceNumber
          issueDate
        }
        payments {
          id
          orderId
          amountVnd
          method
          provider
          status
          providerOrderRef
          checkoutUrl
          paidAt
          createdAt
        }
      }
      page
      size
      totalElements
      totalPages
    }
  }
`

async function fetchMyOrders(page: number, size: number): Promise<OrderPage> {
  const data = await graphQLRequest<{ myOrders: OrderPage }>(MY_ORDERS_QUERY, { page, size })
  return data.myOrders
}

type UseMyOrdersQueryOptions = {
  enabled?: boolean
  // Dùng khi cần tự bám theo trạng thái mới nhất từ BE (vd trang kết quả thanh toán chờ webhook/job
  // đối soát chốt đơn) thay vì chỉ tải một lần. false/undefined nghĩa là không poll.
  refetchInterval?: number | false
}

export function useMyOrdersQuery(page: number, size: number, options?: UseMyOrdersQueryOptions) {
  return useQuery({
    enabled: options?.enabled ?? true,
    placeholderData: (previousData) => previousData,
    queryFn: () => fetchMyOrders(page, size),
    queryKey: myOrdersQueryKeys.list(page, size),
    refetchInterval: options?.refetchInterval ?? false,
  })
}
