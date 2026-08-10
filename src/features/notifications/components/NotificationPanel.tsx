import { useNavigate } from 'react-router'
import { useAppSelector } from '@/app/store/hooks'
import { useMyNotificationsQuery } from '../api/useMyNotificationsQuery'
import {
  useMarkAllNotificationsAsReadMutation,
  useMarkNotificationAsReadMutation,
} from '../api/useNotificationMutations'
import { usePushPermission } from '../hooks/useNotificationPush'
import { resolveNotificationLink } from '../lib/notificationLink'
import type { AppNotification } from '../types'
import { NotificationItem } from './NotificationItem'

type NotificationPanelProps = {
  onClose: () => void
}

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const navigate = useNavigate()
  const roles = useAppSelector((state) => state.auth.user?.roles)
  const notificationsQuery = useMyNotificationsQuery()
  const markAsRead = useMarkNotificationAsReadMutation()
  const markAllAsRead = useMarkAllNotificationsAsReadMutation()
  const { enablePush, isSupported, permission } = usePushPermission()

  const notifications =
    notificationsQuery.data?.pages.flatMap((page) => page.content) ?? []
  const hasUnread = notifications.some((notification) => !notification.readAt)

  function handleSelect(notification: AppNotification) {
    if (!notification.readAt) {
      markAsRead.mutate(notification.id)
    }

    const link = resolveNotificationLink(notification, roles ?? [])

    if (link) {
      navigate(link)
    }

    onClose()
  }

  return (
    <div className="absolute right-0 z-40 mt-2 w-88 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg shadow-slate-950/10 sm:w-96">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <p className="text-sm font-bold text-slate-950">Thông báo</p>

        <button
          className="text-xs font-bold text-cyan-700 transition hover:text-cyan-800 disabled:cursor-not-allowed disabled:text-slate-400"
          disabled={!hasUnread || markAllAsRead.isPending}
          onClick={() => markAllAsRead.mutate()}
          type="button"
        >
          Đánh dấu tất cả đã đọc
        </button>
      </div>

      {isSupported && permission === 'default' ? (
        <div className="border-b border-slate-200 bg-cyan-50/70 px-4 py-3">
          <p className="text-xs font-medium leading-5 text-slate-700">
            Bật thông báo của trình duyệt để nhận tin ngay cả khi bạn không mở trang
            này.
          </p>
          <button
            className="mt-2 text-xs font-bold text-cyan-700 transition hover:text-cyan-800"
            onClick={() => void enablePush()}
            type="button"
          >
            Bật thông báo
          </button>
        </div>
      ) : null}

      {isSupported && permission === 'denied' ? (
        <p className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium leading-5 text-slate-600">
          Trình duyệt đang chặn thông báo của trang này. Bạn có thể mở lại trong phần
          cài đặt quyền của trình duyệt.
        </p>
      ) : null}

      <div className="max-h-96 overflow-y-auto">
        {notificationsQuery.isPending ? (
          <p className="px-4 py-6 text-center text-sm font-medium text-slate-500">
            Đang tải thông báo...
          </p>
        ) : null}

        {notificationsQuery.isError ? (
          <div className="px-4 py-6 text-center">
            <p className="text-sm font-medium text-red-600">
              Không tải được thông báo.
            </p>
            <button
              className="mt-2 text-xs font-bold text-cyan-700 transition hover:text-cyan-800"
              onClick={() => void notificationsQuery.refetch()}
              type="button"
            >
              Thử lại
            </button>
          </div>
        ) : null}

        {notificationsQuery.isSuccess && notifications.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm font-medium text-slate-500">
            Bạn chưa có thông báo nào.
          </p>
        ) : null}

        {notifications.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onSelect={handleSelect}
              />
            ))}
          </ul>
        ) : null}
      </div>

      {notificationsQuery.hasNextPage ? (
        <div className="border-t border-slate-200 px-4 py-2">
          <button
            className="w-full py-1 text-xs font-bold text-cyan-700 transition hover:text-cyan-800 disabled:cursor-not-allowed disabled:text-slate-400"
            disabled={notificationsQuery.isFetchingNextPage}
            onClick={() => void notificationsQuery.fetchNextPage()}
            type="button"
          >
            {notificationsQuery.isFetchingNextPage ? 'Đang tải...' : 'Xem thêm'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
