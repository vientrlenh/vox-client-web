import { type InfiniteData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { graphQLRequest } from '@/shared/api'
import type { NotificationCursorPage } from '../types'

const NOTIFICATION_FIELDS = `
  id
  userId
  eventId
  eventType
  title
  body
  payload
  readAt
  createdAt
`

const MY_NOTIFICATIONS_QUERY = `
  query MyNotifications($cursor: ID, $limit: Int!) {
    myNotifications(cursor: $cursor, limit: $limit) {
      content {
        ${NOTIFICATION_FIELDS}
      }
      nextCursor
      hasNext
    }
  }
`

const MY_UNREAD_NOTIFICATION_COUNT_QUERY = `
  query MyUnreadNotificationCount {
    myUnreadNotificationCount
  }
`

type MyNotificationsQueryData = {
  myNotifications: NotificationCursorPage
}

type MyUnreadNotificationCountQueryData = {
  myUnreadNotificationCount: number
}

type FetchMyNotificationsInput = {
  cursor: string | null
  limit: number
}

export const NOTIFICATION_PAGE_SIZE = 10

/**
 * Chưa có kênh realtime nào ở backend (không SSE, không WebSocket), nên số chưa đọc được
 * hỏi lại theo chu kỳ. Một phút là mức đủ kịp thời cho thông báo nghiệp vụ mà vẫn rẻ:
 * query này chỉ trả về một con số.
 */
export const UNREAD_COUNT_REFETCH_INTERVAL_MS = 60_000

export const notificationQueryKeys = {
  all: ['notifications'] as const,
  cursor: (limit: number) => [...notificationQueryKeys.cursorRoot(), limit] as const,
  /** Tiền tố dùng để vá cache mọi trang đã tải mà không đụng tới `unreadCount`. */
  cursorRoot: () => [...notificationQueryKeys.all, 'cursor'] as const,
  unreadCount: () => [...notificationQueryKeys.all, 'unread-count'] as const,
}

export async function fetchMyNotifications({
  cursor,
  limit,
}: FetchMyNotificationsInput) {
  const data = await graphQLRequest<MyNotificationsQueryData>(
    MY_NOTIFICATIONS_QUERY,
    {
      cursor,
      limit,
    },
  )

  return data.myNotifications
}

export async function fetchMyUnreadNotificationCount() {
  const data = await graphQLRequest<MyUnreadNotificationCountQueryData>(
    MY_UNREAD_NOTIFICATION_COUNT_QUERY,
  )

  return data.myUnreadNotificationCount
}

export function useMyNotificationsQuery(limit: number = NOTIFICATION_PAGE_SIZE) {
  return useInfiniteQuery<
    NotificationCursorPage,
    Error,
    InfiniteData<NotificationCursorPage, string | null>,
    ReturnType<typeof notificationQueryKeys.cursor>,
    string | null
  >({
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? lastPage.nextCursor : undefined,
    initialPageParam: null,
    queryFn: ({ pageParam }) => fetchMyNotifications({ cursor: pageParam, limit }),
    queryKey: notificationQueryKeys.cursor(limit),
  })
}

export function useUnreadNotificationCountQuery(enabled = true) {
  return useQuery({
    enabled,
    queryFn: fetchMyUnreadNotificationCount,
    queryKey: notificationQueryKeys.unreadCount(),
    refetchInterval: UNREAD_COUNT_REFETCH_INTERVAL_MS,
    // Hai dòng dưới cố tình ghi đè mặc định của `createQueryClient` (staleTime 60s,
    // không refetch khi focus): người dùng quay lại tab phải thấy ngay số đúng.
    refetchOnWindowFocus: true,
    staleTime: 0,
  })
}
