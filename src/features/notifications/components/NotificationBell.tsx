import { Bell } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useUnreadNotificationCountQuery } from '../api/useMyNotificationsQuery'
import { useNotificationPushSync } from '../hooks/useNotificationPush'
import { NotificationPanel } from './NotificationPanel'

type NotificationBellProps = {
  /** Màu chữ của nút, để khớp với header của từng layout. */
  className?: string
}

export function NotificationBell({
  className = 'text-slate-950',
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const unreadCountQuery = useUnreadNotificationCountQuery()
  const unreadCount = unreadCountQuery.data ?? 0

  useNotificationPushSync()

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={
          unreadCount > 0
            ? `Thông báo, ${unreadCount} chưa đọc`
            : 'Thông báo'
        }
        className={[
          'relative inline-flex size-11 items-center justify-center rounded-lg border border-transparent transition hover:border-slate-200 hover:bg-slate-50',
          className,
        ].join(' ')}
        onClick={() => setIsOpen((isPanelOpen) => !isPanelOpen)}
        type="button"
      >
        <Bell aria-hidden="true" className="size-5" />

        {unreadCount > 0 ? (
          <span className="absolute right-1 top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? <NotificationPanel onClose={() => setIsOpen(false)} /> : null}
    </div>
  )
}
