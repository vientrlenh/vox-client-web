import type { ComponentType, MouseEvent as ReactMouseEvent } from 'react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Ellipsis } from 'lucide-react'

export type ActionMenuItemTone = 'danger' | 'default' | 'primary' | 'success'

export type ActionMenuItem = {
  disabled?: boolean
  disabledReason?: string
  icon?: ComponentType<{ 'aria-hidden'?: boolean; className?: string }>
  id: string
  label: string
  onSelect: () => void
  tone?: ActionMenuItemTone
}

type MenuPosition = {
  left?: number
  right?: number
  top: number
}

type ActionMenuButtonProps = {
  align?: 'left' | 'right'
  ariaLabel: string
  className?: string
  disabled?: boolean
  items: ActionMenuItem[]
}

const menuItemToneClassNames: Record<ActionMenuItemTone, string> = {
  danger: 'text-red-700 hover:bg-red-50',
  default: 'text-slate-700 hover:bg-slate-50',
  primary: 'text-indigo-700 hover:bg-indigo-50',
  success: 'text-emerald-700 hover:bg-emerald-50',
}

function getMenuPosition(
  trigger: HTMLButtonElement,
  align: 'left' | 'right',
): MenuPosition {
  const rect = trigger.getBoundingClientRect()
  const top = rect.bottom + 8

  if (align === 'left') {
    return {
      left: rect.left,
      top,
    }
  }

  return {
    right: window.innerWidth - rect.right,
    top,
  }
}

export function ActionMenuButton({
  align = 'right',
  ariaLabel,
  className = '',
  disabled = false,
  items,
}: ActionMenuButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const menuId = `${useId()}-menu`

  const closeMenu = useCallback(() => {
    setIsOpen(false)
  }, [])

  function handleTriggerClick(event: ReactMouseEvent<HTMLButtonElement>) {
    event.stopPropagation()

    const trigger = triggerRef.current

    if (!trigger) {
      return
    }

    if (isOpen) {
      closeMenu()
      return
    }

    setMenuPosition(getMenuPosition(trigger, align))
    setIsOpen(true)
  }

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node | null

      if (
        target &&
        (triggerRef.current?.contains(target) || menuRef.current?.contains(target))
      ) {
        return
      }

      closeMenu()
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeMenu()
      }
    }

    window.addEventListener('resize', closeMenu)
    window.addEventListener('scroll', closeMenu, true)
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('resize', closeMenu)
      window.removeEventListener('scroll', closeMenu, true)
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [closeMenu, isOpen])

  const menu = isOpen && menuPosition
    ? createPortal(
        <div
          className="z-50 w-60 rounded-lg border border-slate-200 bg-white p-1 shadow-lg shadow-slate-950/10"
          id={menuId}
          ref={menuRef}
          role="menu"
          style={{
            left: menuPosition.left,
            right: menuPosition.right,
            top: menuPosition.top,
            position: 'fixed',
          }}
        >
          {items.map((item) => {
            const Icon = item.icon
            const tone = item.tone ?? 'default'
            const toneClassName = menuItemToneClassNames[tone]

            return (
              <button
                className={[
                  'flex w-full items-start gap-3 rounded-md px-3 py-2 text-left text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60',
                  toneClassName,
                ].join(' ')}
                disabled={item.disabled}
                key={item.id}
                onClick={() => {
                  if (item.disabled) {
                    return
                  }

                  closeMenu()
                  item.onSelect()
                }}
                role="menuitem"
                title={item.disabled ? item.disabledReason : undefined}
                type="button"
              >
                {Icon ? (
                  <Icon aria-hidden={true} className="mt-0.5 size-4 shrink-0" />
                ) : null}
                <span className="min-w-0">
                  <span className="block">{item.label}</span>
                  {item.disabled && item.disabledReason ? (
                    <span className="mt-0.5 block text-xs font-semibold leading-4 text-slate-500">
                      {item.disabledReason}
                    </span>
                  ) : null}
                </span>
              </button>
            )
          })}
        </div>,
        document.body,
      )
    : null

  return (
    <>
      <button
        aria-controls={isOpen ? menuId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={ariaLabel}
        className={[
          'inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-blue-950 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60',
          className,
        ].join(' ')}
        disabled={disabled || items.length === 0}
        onClick={handleTriggerClick}
        ref={triggerRef}
        type="button"
      >
        <Ellipsis aria-hidden="true" className="size-5" />
      </button>
      {menu}
    </>
  )
}
