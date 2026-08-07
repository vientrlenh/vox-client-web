import { useEffect, useState } from 'react'
import { CalendarRange, Check, ListFilter, Search, X } from 'lucide-react'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { useExamPickerOptionsQuery } from '../api/queries'
import {
  formatDate,
  getExamStatusDisplay,
  type ExamKind,
  type ExamPickerOption,
  type ExamStatus,
} from '../types'

type ExamPickerModalProps = {
  /** Cho phép chọn "Tất cả kỳ thi" để bỏ lọc. Mặc định bật. */
  allowClear?: boolean
  /**
   * Loại bài được phép chọn. Bỏ trống là BE trả cả hai loại — màn nào cũng nên truyền,
   * vì chọn nhầm bài kiểm tra trên lớp ở màn phân công của nhà trường thì gán không được.
   */
  kind?: ExamKind
  onClear?: () => void
  onClose: () => void
  onSelect: (exam: ExamPickerOption) => void
  selectedExamId?: string | null
}

const PAGE_SIZE = 8
const SEARCH_DEBOUNCE_MS = 350

const STATUS_FILTERS: Array<{ label: string; value: '' | ExamStatus }> = [
  { label: 'Tất cả trạng thái', value: '' },
  { label: 'Bản nháp', value: 'DRAFT' },
  { label: 'Đã lên lịch', value: 'SCHEDULED' },
  { label: 'Đang diễn ra', value: 'IN_PROGRESS' },
  { label: 'Đã đóng', value: 'CLOSED' },
  { label: 'Đã công bố kết quả', value: 'RESULTS_PUBLISHED' },
  { label: 'Đã hủy', value: 'CANCELLED' },
]

function examPeriod(exam: ExamPickerOption): string {
  if (!exam.openAt && !exam.closeAt) {
    return 'Chưa đặt lịch'
  }
  return `${formatDate(exam.openAt)} → ${formatDate(exam.closeAt)}`
}

/**
 * Chọn kỳ thi bằng tìm kiếm + phân trang phía server.
 *
 * <p>Thay cho dropdown kéo sẵn vài trăm kỳ thi: quá ngưỡng đó thì dropdown thiếu dữ liệu
 * mà không báo gì. BE (`exams`) lọc `keyword` theo cả mã lẫn tên, và đã giới hạn phạm vi
 * theo trường của người đăng nhập ngay trong query.
 */
export function ExamPickerModal({
  allowClear = true,
  kind,
  onClear,
  onClose,
  onSelect,
  selectedExamId,
}: ExamPickerModalProps) {
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<'' | ExamStatus>('')
  const [page, setPage] = useState(1)
  // Gõ tới đâu bắn request tới đó thì mỗi ký tự là một round-trip; queryKey chứa từ khoá
  // nên phải chặn ở đây chứ không chặn được ở tầng query.
  const debouncedKeyword = useDebouncedValue(keyword, SEARCH_DEBOUNCE_MS)

  const examsQuery = useExamPickerOptionsQuery({
    keyword: debouncedKeyword,
    kind,
    page,
    size: PAGE_SIZE,
    status,
  })
  const exams = examsQuery.data?.content ?? []
  const totalPages = examsQuery.data?.totalPages ?? 0
  const totalElements = examsQuery.data?.totalElements ?? 0

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6"
      onClick={onClose}
      role="presentation"
    >
      <section
        aria-labelledby="exam-picker-title"
        aria-modal="true"
        className="flex max-h-[86vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-black text-slate-900" id="exam-picker-title">
              Chọn kỳ thi
            </h2>
            <p className="mt-0.5 text-[12.5px] font-medium text-slate-500">
              Tìm theo tên hoặc mã kỳ thi.
            </p>
          </div>
          <button
            aria-label="Đóng hộp thoại"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="grid gap-3 border-b border-slate-200 px-6 py-3.5 sm:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            />
            <input
              aria-label="Tìm kỳ thi"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3.5 text-[13.5px] font-medium text-slate-700 outline-none focus:border-cyan-400"
              onChange={(event) => {
                setKeyword(event.target.value)
                setPage(1)
              }}
              placeholder="Tên hoặc mã kỳ thi…"
              type="search"
              value={keyword}
            />
          </div>
          <div className="relative">
            <ListFilter
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            />
            <select
              aria-label="Lọc theo trạng thái kỳ thi"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-[13.5px] font-medium text-slate-700 outline-none focus:border-cyan-400 sm:w-52"
              onChange={(event) => {
                setStatus(event.target.value as '' | ExamStatus)
                setPage(1)
              }}
              value={status}
            >
              {STATUS_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-3">
          {allowClear ? (
            <button
              className={[
                'mb-2.5 flex w-full items-center justify-between gap-3 rounded-xl border p-3.5 text-left transition',
                selectedExamId
                  ? 'border-slate-200 hover:border-cyan-300 hover:bg-cyan-50/40'
                  : 'border-cyan-500 bg-cyan-50',
              ].join(' ')}
              onClick={() => {
                onClear?.()
                onClose()
              }}
              type="button"
            >
              <span className="text-sm font-bold text-slate-900">Tất cả kỳ thi</span>
              {selectedExamId ? null : <Check aria-hidden="true" className="size-4 text-cyan-600" />}
            </button>
          ) : null}

          {examsQuery.isLoading ? (
            <p className="py-10 text-center text-sm text-slate-400">Đang tải…</p>
          ) : exams.length ? (
            <div className="grid gap-2.5 pb-2">
              {exams.map((exam) => {
                const statusDisplay = getExamStatusDisplay(exam.status)
                const selected = exam.id === selectedExamId
                return (
                  <button
                    className={[
                      'flex items-center justify-between gap-3 rounded-xl border p-3.5 text-left transition',
                      selected
                        ? 'border-cyan-500 bg-cyan-50'
                        : 'border-slate-200 hover:border-cyan-300 hover:bg-cyan-50/40',
                    ].join(' ')}
                    key={exam.id}
                    onClick={() => {
                      onSelect(exam)
                      onClose()
                    }}
                    type="button"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-slate-900">{exam.name}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] font-semibold text-slate-400">
                        <span>{exam.code}</span>
                        <span className="inline-flex items-center gap-1">
                          <CalendarRange aria-hidden="true" className="size-3" />
                          {examPeriod(exam)}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge label={statusDisplay.label} tone={statusDisplay.tone} />
                      {selected ? <Check aria-hidden="true" className="size-4 text-cyan-600" /> : null}
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-slate-400">Không tìm thấy kỳ thi phù hợp.</p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-6 py-3.5">
          <span className="text-xs font-medium text-slate-500">
            <b className="font-extrabold tabular-nums text-slate-900">{totalElements}</b> kỳ thi ·
            trang {totalPages ? page : 0}/{totalPages}
          </span>
          <div className="flex gap-2">
            <button
              className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
              disabled={examsQuery.isFetching || page <= 1}
              onClick={() => setPage((current) => current - 1)}
              type="button"
            >
              Trước
            </button>
            <button
              className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
              disabled={examsQuery.isFetching || page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              type="button"
            >
              Sau
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
