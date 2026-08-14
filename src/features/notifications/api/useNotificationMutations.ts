import {
  type InfiniteData,
  type QueryClient,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { type ApiResponse, apiClient } from '@/shared/api'
import type { AppNotification, NotificationCursorPage } from '../types'
import { notificationQueryKeys } from './useMyNotificationsQuery'

type NotificationPages = InfiniteData<NotificationCursorPage, string | null>

export async function markNotificationAsRead(id: string) {
  const response = await apiClient.patch<ApiResponse<string>>(
    `/v1/notifications/${id}/read`,
  )

  return response.data
}

export async function markAllNotificationsAsRead() {
  const response = await apiClient.patch<ApiResponse<null>>(
    '/v1/notifications/read-all',
  )

  return response.data
}

/**
 * Vá thẳng cache thay vì `invalidateQueries` danh sách: đây là infinite query, nên một
 * lần invalidate sẽ kéo lại *toàn bộ* các trang người dùng đã cuộn qua chỉ để đổi một
 * dấu "đã đọc". Số chưa đọc thì ngược lại — một query lẻ, rất rẻ — nên cứ để server chốt.
 */
function patchLoadedNotifications(
  queryClient: QueryClient,
  patch: (notification: AppNotification) => AppNotification,
) {
  queryClient.setQueriesData<NotificationPages>(
    { queryKey: notificationQueryKeys.cursorRoot() },
    (current) =>
      current
        ? {
            ...current,
            pages: current.pages.map((page) => ({
              ...page,
              content: page.content.map(patch),
            })),
          }
        : current,
  )
}

export function useMarkNotificationAsReadMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: (_result, id) => {
      const readAt = new Date().toISOString()

      patchLoadedNotifications(queryClient, (notification) =>
        notification.id === id && !notification.readAt
          ? { ...notification, readAt }
          : notification,
      )

      void queryClient.invalidateQueries({
        queryKey: notificationQueryKeys.unreadCount(),
      })
    },
  })
}

export function useMarkAllNotificationsAsReadMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      const readAt = new Date().toISOString()

      patchLoadedNotifications(queryClient, (notification) =>
        notification.readAt ? notification : { ...notification, readAt },
      )

      void queryClient.invalidateQueries({
        queryKey: notificationQueryKeys.unreadCount(),
      })
    },
  })
}
