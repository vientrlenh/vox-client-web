import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { useAppSelector } from '@/app/store/hooks'
import { notificationQueryKeys } from '../api/useMyNotificationsQuery'
import {
  ensurePushDeviceRegistered,
  getPushPermissionSnapshot,
  isPushSupported,
  requestPushPermission,
  subscribeToForegroundMessages,
  subscribeToPushPermission,
} from '../lib/pushDevice'

export function usePushPermission() {
  const permission = useSyncExternalStore(
    subscribeToPushPermission,
    getPushPermissionSnapshot,
  )

  const enablePush = useCallback(async () => {
    await requestPushPermission()
  }, [])

  return { enablePush, isSupported: isPushSupported(), permission }
}

/**
 * Vòng đồng bộ thông báo đẩy, mount đúng một lần cùng với chuông.
 *
 * <p>Đặt ở chuông chứ không ở `RoleLayout`: chuông có mặt trong cả bốn layout theo vai
 * trò, mà tại một thời điểm chỉ một layout được render -- nên vẫn đúng một bản, đồng thời
 * không phải sửa `RoleLayout` chỉ để treo một hiệu ứng vào đó.
 */
export function useNotificationPushSync() {
  const queryClient = useQueryClient()
  const status = useAppSelector((state) => state.auth.status)
  const userId = useAppSelector((state) => state.auth.user?.userId)
  const { permission } = usePushPermission()

  const isActive =
    status === 'authenticated' && Boolean(userId) && permission === 'granted'

  useEffect(() => {
    if (!isActive || !userId) {
      return
    }

    void ensurePushDeviceRegistered(userId)
  }, [isActive, userId])

  useEffect(() => {
    if (!isActive) {
      return
    }

    let unsubscribe: (() => void) | null = null
    let isCancelled = false

    void subscribeToForegroundMessages(() => {
      // `resetQueries` chứ không `invalidateQueries` cho danh sách: invalidate sẽ nạp lại
      // từng trang bằng cursor đã lưu, mà cursor trỏ vào một id cụ thể -- thông báo mới
      // chen lên đầu sẽ đẩy mục cuối trang một ra khỏi trang một, trong khi trang hai vẫn
      // bắt đầu sau nó. Kết quả là một mục biến mất khỏi danh sách. Reset đưa về đúng
      // trang đầu, không tạo lỗ hổng.
      void queryClient.resetQueries({
        queryKey: notificationQueryKeys.cursorRoot(),
      })
      void queryClient.invalidateQueries({
        queryKey: notificationQueryKeys.unreadCount(),
      })
    }).then((cleanup) => {
      if (isCancelled) {
        cleanup()
        return
      }

      unsubscribe = cleanup
    })

    return () => {
      isCancelled = true
      unsubscribe?.()
    }
  }, [isActive, queryClient])
}
