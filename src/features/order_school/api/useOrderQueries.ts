import { useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { Order, OrderPage } from '../types'

export const orderQueryKeys = {
  all: ['my-orders'] as const,
  detail: (orderId: string) => [...orderQueryKeys.all, 'detail', orderId] as const,
  list: (page: number, size: number) => [...orderQueryKeys.all, 'list', page, size] as const,
}

const ORDER_FIELDS = `
  id
  type
  description
  subtotalAmountVnd
  chargedFeeVnd
  discountAmountVnd
  totalAmountVnd
  status
  createdAt
  updatedAt
  expiresAt
  items {
    id
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
`

// myOrders GỒM CẢ đơn PENDING và đó là bắt buộc: đặt đơn đăng ký mới bị từ chối khi trường còn một
// đơn treo, nên giấu đơn treo đi là bảo trường hủy một thứ họ không nhìn thấy.
const MY_ORDERS_QUERY = `
  query MyOrders($page: Int!, $size: Int!) {
    myOrders(page: $page, size: $size) {
      content { ${ORDER_FIELDS} }
      page
      size
      totalElements
      totalPages
    }
  }
`

const ORDER_QUERY = `
  query OrderDetail($id: ID!) {
    order(id: $id) { ${ORDER_FIELDS} }
  }
`

export function useMyOrdersQuery(page: number, size: number) {
  return useQuery({
    placeholderData: (previousData) => previousData,
    queryFn: async () => {
      const data = await graphQLRequest<{ myOrders: OrderPage }>(MY_ORDERS_QUERY, { page, size })
      return data.myOrders
    },
    queryKey: orderQueryKeys.list(page, size),
  })
}

/**
 * Chi tiết một đơn.
 *
 * `refetchIntervalMs` là nhịp hỏi lại khi đơn còn đang chờ tiền. Đây là phép hỏi RẺ — đọc DB của
 * chính mình, không đụng tới cổng — nên chạy nền được thoải mái, và chính nó làm cho việc "tự chuyển
 * sang trạng thái đã thanh toán" hoạt động kể cả khi người dùng không bấm gì. Phép hỏi ĐẮT (hỏi
 * thẳng cổng) nằm ở useForceCheckOrderMutation và chỉ chạy khi người dùng bấm.
 */
export function useOrderQuery(orderId: string | undefined, refetchIntervalMs?: number) {
  return useQuery({
    enabled: Boolean(orderId),
    queryFn: async () => {
      const data = await graphQLRequest<{ order: Order | null }>(ORDER_QUERY, { id: orderId })
      return data.order
    },
    queryKey: orderQueryKeys.detail(orderId ?? ''),
    refetchInterval: refetchIntervalMs ?? false,
  })
}
