import { formatNotificationTime } from '../lib/formatNotificationTime'
import type { AppNotification } from '../types'

type NotificationItemProps = {
  notification: AppNotification
  onSelect: (notification: AppNotification) => void
}

export function NotificationItem({
  notification,
  onSelect,
}: NotificationItemProps) {
  const isUnread = !notification.readAt

  return (
    <li>
      <button
        className={[
          'flex w-full gap-3 px-4 py-3 text-left transition hover:bg-slate-50',
          isUnread ? 'bg-cyan-50/60' : 'bg-white',
        ].join(' ')}
        onClick={() => onSelect(notification)}
        type="button"
      >
        <span
          aria-hidden="true"
          className={[
            'mt-1.5 size-2 shrink-0 rounded-full',
            isUnread ? 'bg-cyan-600' : 'bg-transparent',
          ].join(' ')}
        />

        <span className="min-w-0 flex-1">
          <span
            className={[
              'block text-sm text-slate-950',
              isUnread ? 'font-bold' : 'font-semibold',
            ].join(' ')}
          >
            {notification.title ?? 'Thông báo'}
          </span>

          {notification.body ? (
            <span className="mt-1 block text-sm leading-5 text-slate-600">
              {notification.body}
            </span>
          ) : null}

          <span className="mt-1 block text-xs font-medium text-slate-500">
            {formatNotificationTime(notification.createdAt)}
            {isUnread ? <span className="sr-only"> — chưa đọc</span> : null}
          </span>
        </span>
      </button>
    </li>
  )
}
