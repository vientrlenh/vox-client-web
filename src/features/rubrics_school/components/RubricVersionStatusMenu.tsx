// src/features/rubrics/components/RubricVersionStatusMenu.tsx

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, RefreshCw } from 'lucide-react';
import { publishStatusLabel } from '@/shared/lib/publishStatusLabel';

type Props = {
  status: string;
  onPublish: () => void;
  onArchive: () => void;
  isPending?: boolean;
};

const STATUS_BADGE_CLASSNAMES: Record<string, string> = {
  DRAFT: 'bg-yellow-50 text-yellow-800 ring-yellow-600/20',
  PUBLISHED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  ARCHIVED: 'bg-amber-50 text-amber-700 ring-amber-700/10',
};

// DRAFT -> PUBLISHED và PUBLISHED -> ARCHIVED đều là thao tác thủ công của Admin qua 2 API riêng biệt.
export function RubricVersionStatusMenu({ status, onPublish, onArchive, isPending = false }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canChangeStatus = status === 'DRAFT' || status === 'PUBLISHED';

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

  // Không tự confirm bằng dialog text chung ở đây: bên gọi (trang chi tiết Version) mở hẳn dialog
  // liệt kê Version + các Chính Sách Đánh Giá liên quan để xác nhận -- cho cả Publish
  // (PublishRubricVersionDialog) lẫn Archive (ArchiveRubricVersionDialog). Dialog đó đã là bước
  // xác nhận, hỏi lại lần nữa ở đây chỉ dư thừa.
  function handlePublishClick() {
    setIsOpen(false);
    onPublish();
  }

  function handleArchiveClick() {
    setIsOpen(false);
    onArchive();
  }

  if (!canChangeStatus) {
    return (
      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${badgeClassName}`}>
        {publishStatusLabel(status)}
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
        {publishStatusLabel(status)}
        <ChevronDown className="size-3" />
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-full z-20 mt-1 w-52 rounded-lg border border-slate-200 bg-white p-1 shadow-lg shadow-slate-950/10">
          {status === 'DRAFT' ? (
            <button
              className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
              onClick={handlePublishClick}
              type="button"
            >
              Chuyển sang Đã xuất bản
            </button>
          ) : (
            <button
              className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm font-bold text-amber-700 transition hover:bg-amber-50"
              onClick={handleArchiveClick}
              type="button"
            >
              Lưu Trữ
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
