// src/shared/components/Pagination.tsx
import { ChevronLeft, ChevronRight } from "lucide-react";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  totalElements: number;
  itemName?: string; // Ví dụ: "trường", "người dùng", "lớp học"
  onPageChange: (page: number) => void;
};

export function Pagination({ currentPage, totalPages, totalElements, itemName = "mục", onPageChange }: PaginationProps) {
  if (totalElements === 0) return null;

  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
      <p className="text-xs font-medium text-slate-500">
        Tổng <span className="font-bold text-blue-950">{totalElements}</span> {itemName}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          aria-label="Trang trước"
          className="inline-flex size-9 items-center justify-center rounded-lg border disabled:opacity-40 hover:bg-slate-50"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-xs font-bold text-blue-950">
          Trang {currentPage} / {totalPages || 1}
        </span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages || totalPages === 0}
          aria-label="Trang tiếp theo"
          className="inline-flex size-9 items-center justify-center rounded-lg border disabled:opacity-40 hover:bg-slate-50"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}