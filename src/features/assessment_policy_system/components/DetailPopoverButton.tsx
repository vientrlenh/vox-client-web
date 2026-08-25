// src/features/assessment_policy_system/components/DetailPopoverButton.tsx

import type { ReactNode } from 'react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type PopoverPosition = {
  left: number;
  top: number;
};

type DetailPopoverButtonProps = {
  label: string;
  ariaLabel: string;
  badgeClassName?: string;
  children: ReactNode;
};

const DEFAULT_BADGE_CLASS = 'bg-blue-50 text-blue-700 ring-blue-700/10 hover:bg-blue-100';

function getPopoverPosition(trigger: HTMLButtonElement): PopoverPosition {
  const rect = trigger.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.bottom + 8,
  };
}

export function DetailPopoverButton({ label, ariaLabel, badgeClassName, children }: DetailPopoverButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<PopoverPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const popoverId = `${useId()}-popover`;

  const closePopover = useCallback(() => {
    setIsOpen(false);
  }, []);

  function handleTriggerClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();

    const trigger = triggerRef.current;
    if (!trigger) return;

    if (isOpen) {
      closePopover();
      return;
    }

    setPosition(getPopoverPosition(trigger));
    setIsOpen(true);
  }

  useEffect(() => {
    if (!isOpen) return undefined;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (target && (triggerRef.current?.contains(target) || popoverRef.current?.contains(target))) {
        return;
      }
      closePopover();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closePopover();
    }

    window.addEventListener('resize', closePopover);
    window.addEventListener('scroll', closePopover, true);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', closePopover);
      window.removeEventListener('scroll', closePopover, true);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closePopover, isOpen]);

  const popover = isOpen && position
    ? createPortal(
        <div
          className="z-50 w-72 rounded-lg border border-slate-200 bg-white p-4 text-left text-sm text-slate-700 shadow-lg shadow-slate-950/10"
          id={popoverId}
          ref={popoverRef}
          role="dialog"
          style={{ left: position.left, position: 'fixed', top: position.top }}
        >
          {children}
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        aria-controls={isOpen ? popoverId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset transition ${badgeClassName ?? DEFAULT_BADGE_CLASS}`}
        onClick={handleTriggerClick}
        ref={triggerRef}
        type="button"
      >
        {label}
      </button>
      {popover}
    </>
  );
}
