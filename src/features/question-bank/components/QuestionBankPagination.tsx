import { ChevronLeft, ChevronRight } from 'lucide-react'

type QuestionBankPaginationProps = {
  isDisabled: boolean
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  page: number
  pageSize: number
  totalElements: number
  totalPages: number
}

const pageSizeOptions = [10, 20, 50]

export function QuestionBankPagination({
  isDisabled,
  onPageChange,
  onPageSizeChange,
  page,
  pageSize,
  totalElements,
  totalPages,
}: QuestionBankPaginationProps) {
  const safeTotalPages = Math.max(totalPages, 1)
  const isPreviousDisabled = isDisabled || page <= 1
  const isNextDisabled = isDisabled || page >= safeTotalPages || totalPages <= 0

  return (
    <div className="flex flex-col gap-4 border-t border-slate-200 px-6 py-5 text-sm text-blue-950 md:flex-row md:items-center md:justify-between">
      <p>Tổng {totalElements} ngân hàng câu hỏi</p>

      <div className="flex flex-wrap items-center gap-3">
        <select
          aria-label="Số ngân hàng mỗi trang"
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-blue-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          disabled={isDisabled}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          value={pageSize}
        >
          {pageSizeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <span>/ trang</span>

        <button
          aria-label="Trang trước"
          className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-blue-950 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isPreviousDisabled}
          onClick={() => onPageChange(page - 1)}
          type="button"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
        </button>

        <span className="inline-flex size-10 items-center justify-center rounded-lg border border-indigo-400 bg-white text-sm font-bold text-indigo-700">
          {page}
        </span>

        <button
          aria-label="Trang sau"
          className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-blue-950 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isNextDisabled}
          onClick={() => onPageChange(page + 1)}
          type="button"
        >
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>

        <span>
          Trang {page} / {safeTotalPages}
        </span>
      </div>
    </div>
  )
}
