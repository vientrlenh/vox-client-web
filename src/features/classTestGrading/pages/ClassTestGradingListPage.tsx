import { useState } from 'react'
import { useNavigate } from 'react-router'
import { ClipboardList, Search } from 'lucide-react'
import { useClassTestsQuery } from '@/features/classTest/api/useClassTestQueries'
import { getClassTestStatusDisplay } from '@/features/classTest/types'
import type { ExamStatus } from '@/features/examCore/types'
import { Pagination } from '@/shared/components/Pagination'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { StatusBadge } from '@/shared/ui/StatusBadge'

const PAGE_SIZE = 20

/**
 * Điểm vào của mục menu “Chấm bài kiểm tra trên lớp”.
 *
 * Cần màn này vì mục menu không biết `examId` — khác mục “Chấm bài kỳ thi” vốn có một
 * hàng đợi phẳng cho cả trường. Bài trên lớp thì việc chấm luôn gắn với MỘT bài cụ thể.
 *
 * Chỉ liệt kê bài đã bắt đầu trở đi: trước khi mở cho học sinh làm thì không có bài nộp
 * nào để chấm.
 */
const GRADABLE_STATUSES: ExamStatus[] = ['IN_PROGRESS', 'CLOSED', 'RESULTS_PUBLISHED']

export function ClassTestGradingListPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<'' | ExamStatus>('')
  const debouncedKeyword = useDebouncedValue(keyword, 350)

  const listQuery = useClassTestsQuery({
    keyword: debouncedKeyword,
    page,
    size: PAGE_SIZE,
    status,
  })
  const pageData = listQuery.data
  // BE chưa lọc nhiều trạng thái một lần, nên lọc nốt ở client khi người dùng để
  // "Mọi trạng thái" — bài DRAFT/SCHEDULED chưa có gì để chấm.
  const rows = (pageData?.content ?? []).filter(
    (exam) => status !== '' || GRADABLE_STATUSES.includes(exam.status as ExamStatus),
  )

  return (
    <section className="mx-auto grid max-w-300 gap-5">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-700">Chấm điểm</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">
          Chấm bài kiểm tra trên lớp
        </h1>
        <p className="mt-1.5 text-xs font-medium text-slate-500">
          Chọn một bài kiểm tra bạn đã tạo để chấm. Khác kỳ thi tập trung, bài trên lớp do chính bạn
          chấm toàn bộ và bạn thấy được tên học sinh.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-3">
        <div className="relative flex-1 min-w-56">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400"
          />
          <input
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-medium text-slate-700 outline-none focus:border-cyan-400"
            onChange={(event) => {
              setKeyword(event.target.value)
              setPage(1)
            }}
            placeholder="Tìm theo tên hoặc mã bài kiểm tra…"
            type="search"
            value={keyword}
          />
        </div>
        <select
          aria-label="Trạng thái bài kiểm tra"
          className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 outline-none focus:border-cyan-400"
          onChange={(event) => {
            setStatus(event.target.value as '' | ExamStatus)
            setPage(1)
          }}
          value={status}
        >
          <option value="">Đang mở &amp; đã đóng</option>
          <option value="IN_PROGRESS">Đang mở</option>
          <option value="CLOSED">Đã đóng</option>
          <option value="RESULTS_PUBLISHED">Đã công bố</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-160 text-left">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-2.5">Bài kiểm tra</th>
                <th className="px-4 py-2.5">Trạng thái</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {listQuery.isLoading ? (
                <tr>
                  <td className="px-5 py-12 text-center text-[13px] text-slate-400" colSpan={3}>
                    Đang tải…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-5 py-12 text-center text-[13px] text-slate-400" colSpan={3}>
                    Chưa có bài kiểm tra trên lớp nào đang mở hoặc đã đóng.
                  </td>
                </tr>
              ) : (
                rows.map((exam) => {
                  const display = getClassTestStatusDisplay(exam.status)
                  return (
                    <tr
                      className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
                      key={exam.id}
                    >
                      <td className="px-4 py-3">
                        <div className="text-[13px] font-bold text-slate-800">{exam.name}</div>
                        <div className="text-[11px] font-medium text-slate-500">{exam.code}</div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge label={display.label} tone={display.tone} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-cyan-600 px-3.5 text-xs font-bold text-white transition hover:bg-cyan-700"
                          onClick={() => navigate(`/teacher/class-tests/${exam.id}/grading`)}
                          type="button"
                        >
                          <ClipboardList className="size-4" />
                          Chấm bài
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-200 px-4 py-2.5">
          <Pagination
            currentPage={page}
            itemName="bài kiểm tra"
            onPageChange={setPage}
            totalElements={pageData?.totalElements ?? 0}
            totalPages={pageData?.totalPages ?? 0}
          />
        </div>
      </div>
    </section>
  )
}
