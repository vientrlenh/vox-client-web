// src/features/rubric_system/components/RubricVersionStatusMenu.tsx

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, RefreshCw } from 'lucide-react';

type Props = {
  status: string;
  onPublish: () => void;
  isPending?: boolean;
};

const STATUS_BADGE_CLASSNAMES: Record<string, string> = {
  DRAFT: 'bg-yellow-50 text-yellow-800 ring-yellow-600/20',
  PUBLISHED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  ARCHIVED: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};

// Hiện tại chỉ hỗ trợ chuyển DRAFT -> PUBLISHED thủ công từ FE.
// PUBLISHED -> ARCHIVED do Worker nền tự xử lý khi phiên bản hết hạn (effectiveTo).
export function RubricVersionStatusMenu({ status, onPublish, isPending = false }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canChangeStatus = status === 'DRAFT';

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen]);

  const badgeClassName = STATUS_BADGE_CLASSNAMES[status] ?? 'bg-slate-100 text-slate-600 ring-slate-500/20';

  function handlePublishClick() {
    setIsOpen(false);
    const isConfirm = window.confirm(
      'Bạn có chắc chắn muốn chuyển trạng thái Phiên bản này sang PUBLISHED? Sau khi Published, phiên bản sẽ được áp dụng chính thức.'
    );
    if (!isConfirm) return;
    onPublish();
  }

  if (!canChangeStatus) {
    return (
      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${badgeClassName}`}>
        {status}
      </span>
    );
  }

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60 ${badgeClassName}`}
        disabled={isPending}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        {isPending ? <RefreshCw className="size-3 animate-spin" /> : null}
        {status}
        <ChevronDown className="size-3" />
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-full z-20 mt-1 w-52 rounded-lg border border-slate-200 bg-white p-1 shadow-lg shadow-slate-950/10">
          <button
            className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
            onClick={handlePublishClick}
            type="button"
          >
            Chuyển sang PUBLISHED
          </button>
        </div>
      ) : null}
    </div>
  );
}
