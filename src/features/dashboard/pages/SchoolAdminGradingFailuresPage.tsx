import { useState } from 'react'
import { AlertTriangle, ArrowLeft, ArrowUpRight, RefreshCw, Users } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import {
  useHandOffGradingToHumanMutation,
  useRetryGradingExamSessionMutation,
} from '@/features/exam-results/api/useExamResultQueries'
import { vnDateTime } from '@/shared/lib/vnDateRange'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { useConfirmationDialog } from '@/shared/ui/useConfirmationDialog'
import {
  useSchoolGradingFailuresQuery,
  type SchoolGradingFailure,
} from '../api/useSchoolGradingFailuresQuery'

const PAGE_SIZE = 20

/**
 * Ba lựa chọn lọc, không phải cờ bật/tắt.
 *
 * `null` là "không lọc" và khác hẳn "chỉ lấy bài hết lượt" — gộp hai cái vào một boolean sẽ mất một
 * trong ba trạng thái. Cùng lý do như bộ chọn nhóm trên màn phiên chấm lỗi của quản trị hệ thống.
 */
const ALLOWANCE_TABS = [
  { key: 'all', label: 'Tất cả', value: null },
  { key: 'retry-left', label: 'Còn lượt AI', value: true },
  { key: 'no-retry', label: 'Chỉ còn chấm tay', value: false },
] as const

type AllowanceKey = (typeof ALLOWANCE_TABS)[number]['key']

function parseAllowance(raw: string | null): AllowanceKey {
  return ALLOWANCE_TABS.some((tab) => tab.key === raw) ? (raw as AllowanceKey) : 'all'
}

function allowanceValue(key: AllowanceKey) {
  return ALLOWANCE_TABS.find((tab) => tab.key === key)?.value ?? null
}

function ErrorCell({ error }: { error: string | null }) {
  if (!error) {
    // Phiên bị đánh dấu hỏng qua nhánh DLT không mang thông điệp nào. Đó là dữ liệu THẬT, không phải
    // ô trống — nói rõ ra để không ai đi tìm một lỗi hiển thị.
    return <span className="text-[13px] italic text-slate-400">Không rõ nguyên nhân</span>
  }
  return (
    <span className="line-clamp-2 font-mono text-[12px] leading-4 text-slate-600" title={error}>
      {error}
    </span>
  )
}

function FailureRow({
  busy,
  onHandOff,
  onRetry,
  row,
}: {
  busy: boolean
  onHandOff: (row: SchoolGradingFailure) => void
  onRetry: (row: SchoolGradingFailure) => void
  row: SchoolGradingFailure
}) {
  return (
    <tr className="border-t border-slate-100 align-top">
      <td className="px-4 py-3.5">
        <div className="text-sm font-bold text-slate-900">{row.candidateName ?? '—'}</div>
        <div className="mt-0.5 text-[12.5px] text-slate-500">{row.className ?? 'Chưa xếp lớp'}</div>
      </td>
      <td className="px-4 py-3.5">
        <div className="text-[13.5px] font-semibold text-slate-800">{row.examName}</div>
        <div className="mt-0.5 text-[12.5px] text-slate-500">{row.examCode}</div>
      </td>
      <td className="px-4 py-3.5 text-[13px] text-slate-600 tabular-nums">{vnDateTime(row.failedAt)}</td>
      <td className="max-w-70 px-4 py-3.5">
        <ErrorCell error={row.error} />
        {row.aiRetryCount !== null ? (
          <div className="mt-1 text-[11.5px] text-slate-400 tabular-nums">
            Dịch vụ chấm đã tự thử {row.aiRetryCount} lần
          </div>
        ) : null}
      </td>
      <td className="px-4 py-3.5">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {row.schoolRetryLeft ? (
            <button
              className="inline-flex h-9 items-center rounded-full bg-indigo-600 px-3.5 text-[13px] font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
              disabled={busy}
              onClick={() => onRetry(row)}
              type="button"
            >
              Nhờ AI chấm lại
            </button>
          ) : (
            <span
              className="rounded-full bg-amber-50 px-3 py-1.5 text-[12px] font-bold text-amber-700"
              title="Đã dùng lượt nhờ AI chấm lại cho phiên này"
            >
              Hết lượt AI
            </span>
          )}
          <button
            className="inline-flex h-9 items-center rounded-full border border-indigo-200 bg-white px-3.5 text-[13px] font-bold text-indigo-600 transition hover:bg-indigo-50 disabled:opacity-50"
            disabled={busy}
            onClick={() => onHandOff(row)}
            type="button"
          >
            Chuyển người chấm
          </button>
          <Link
            className="text-[13px] font-bold text-slate-500 underline underline-offset-2 hover:text-slate-700"
            to={`/school-admin/exam-results/${row.sessionId}`}
          >
            Chi tiết
          </Link>
        </div>
      </td>
    </tr>
  )
}

export function SchoolAdminGradingFailuresPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const allowanceKey = parseAllowance(searchParams.get('allowance'))
  const examId = searchParams.get('examId')
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)

  const [message, setMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [busySessionId, setBusySessionId] = useState<string | null>(null)
  const { confirm, dialog } = useConfirmationDialog()

  const filters = { examId, page, retryLeft: allowanceValue(allowanceKey), size: PAGE_SIZE }
  const { data, isError, isLoading, refetch } = useSchoolGradingFailuresQuery(filters)
  const retryMutation = useRetryGradingExamSessionMutation()
  const handOffMutation = useHandOffGradingToHumanMutation()

  function updateParams(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(next)) {
      if (value === null) {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    }
    setSearchParams(params)
  }

  async function handleRetry(row: SchoolGradingFailure) {
    if (
      !(await confirm({
        message:
          `Nhờ AI chấm lại bài của ${row.candidateName ?? 'học sinh này'}? Mỗi bài chỉ được một lượt — `
          + 'nếu lượt này vẫn hỏng thì phải chuyển sang chấm tay.',
        title: 'Xác nhận chấm lại bằng AI',
      }))
    ) {
      return
    }

    setBusySessionId(row.sessionId)
    try {
      await retryMutation.mutateAsync(row.sessionId)
      await refetch()
      setMessage('Đã gửi yêu cầu chấm lại.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể chấm lại phiên thi.')
    } finally {
      setBusySessionId(null)
    }
  }

  /**
   * KHÔNG chuyển màn sau khi giao bài, khác với nút cùng tên ở màn chi tiết phiên.
   *
   * Người mở màn này đang xử lý một loạt bài; đá họ sang màn phân công sau mỗi bài là bắt quay lại
   * và tìm lại chỗ cũ. Việc phân công vẫn phải làm, nên toast mang sẵn đường dẫn tới đó.
   */
  async function handleHandOff(row: SchoolGradingFailure) {
    if (
      !(await confirm({
        message:
          `Đưa bài của ${row.candidateName ?? 'học sinh này'} vào hàng đợi cho người chấm? Bài vào hàng đợi `
          + 'ở dạng chưa phân công — nhớ quay lại bảng điều phối để chọn giáo viên.',
        title: 'Xác nhận chuyển sang chấm tay',
      }))
    ) {
      return
    }

    setBusySessionId(row.sessionId)
    try {
      await handOffMutation.mutateAsync(row.sessionId)
      await refetch()
      setMessage('Đã đưa bài vào hàng đợi chấm tay. Vào bảng điều phối để phân công giáo viên.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể chuyển bài sang chấm tay.')
    } finally {
      setBusySessionId(null)
    }
  }

  const rows = data?.content ?? []

  return (
    <section className="grid gap-5">
      <FeedbackToast message={message} onClose={() => setMessage(null)} tone="success" />
      <FeedbackToast message={errorMessage} onClose={() => setErrorMessage(null)} tone="error" />
      {dialog}

      <div>
        <Link
          className="inline-flex items-center gap-1.5 text-[13.5px] font-bold text-slate-500 hover:text-slate-700"
          to="/school-admin/dashboard"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Tổng quan trường
        </Link>
        <h1 className="mt-2.5 text-3xl font-extrabold tracking-tight text-slate-900">AI chấm lỗi, chưa ai xử lý</h1>
        <p className="mt-1.5 max-w-180 text-[15px] text-slate-500">
          Những bài AI không chấm được và chưa ai chọn lối ra. Mỗi bài có đúng một lượt nhờ AI chấm lại; hết lượt thì
          phải xếp giáo viên chấm tay.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {ALLOWANCE_TABS.map((tab) => {
          const count =
            tab.key === 'retry-left'
              ? data?.retryLeftCount
              : tab.key === 'no-retry'
                ? data?.noRetryLeftCount
                : (data?.retryLeftCount ?? 0) + (data?.noRetryLeftCount ?? 0)
          return (
            <button
              aria-pressed={tab.key === allowanceKey}
              className={
                tab.key === allowanceKey
                  ? 'inline-flex h-10 items-center gap-2 rounded-full bg-indigo-600 px-4.5 text-sm font-bold text-white'
                  : 'inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50'
              }
              key={tab.key}
              onClick={() => updateParams({ allowance: tab.key === 'all' ? null : tab.key, page: null })}
              type="button"
            >
              {tab.label}
              {count === undefined ? null : (
                <span
                  className={
                    tab.key === allowanceKey
                      ? 'rounded-full bg-white/20 px-2 py-0.5 text-[12px] tabular-nums'
                      : 'rounded-full bg-slate-100 px-2 py-0.5 text-[12px] tabular-nums'
                  }
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
        {examId ? (
          <button
            className="inline-flex h-10 items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4.5 text-sm font-bold text-indigo-700"
            onClick={() => updateParams({ examId: null, page: null })}
            type="button"
          >
            Đang lọc theo một kỳ thi · bỏ lọc
          </button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {isLoading ? (
          <div className="flex items-center justify-center gap-3 px-4 py-16 text-slate-500">
            <RefreshCw className="size-5 animate-spin text-indigo-600" />
            Đang tải danh sách...
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3.5 px-4 py-16 text-center">
            <AlertTriangle className="size-10 text-red-500" />
            <p className="text-slate-600">Không tải được danh sách bài AI chấm lỗi.</p>
            <button
              className="rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-700"
              onClick={() => void refetch()}
              type="button"
            >
              Thử lại
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
            <Users className="size-10 text-slate-300" />
            <p className="text-slate-600">Không còn bài nào AI chấm lỗi mà chưa ai xử lý.</p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 text-left text-[12.5px] font-bold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Học sinh</th>
                <th className="px-4 py-3">Kỳ thi</th>
                <th className="px-4 py-3">Nộp lúc</th>
                <th className="px-4 py-3">Nguyên nhân</th>
                <th className="px-4 py-3 text-right">Xử lý</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <FailureRow
                  busy={busySessionId === row.sessionId}
                  key={row.sessionId}
                  onHandOff={handleHandOff}
                  onRetry={handleRetry}
                  row={row}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data && data.totalPages > 1 ? (
        <div className="flex items-center justify-between text-[13.5px] text-slate-600">
          <span className="tabular-nums">
            Trang {data.page} / {data.totalPages} · {data.totalElements} bài
          </span>
          <div className="flex gap-2">
            <button
              className="rounded-full border border-slate-200 bg-white px-4 py-2 font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
              disabled={data.page <= 1}
              onClick={() => updateParams({ page: String(data.page - 1) })}
              type="button"
            >
              Trước
            </button>
            <button
              className="rounded-full border border-slate-200 bg-white px-4 py-2 font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
              disabled={data.page >= data.totalPages}
              onClick={() => updateParams({ page: String(data.page + 1) })}
              type="button"
            >
              Sau
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-end">
        <Link
          className="inline-flex items-center gap-1.5 text-[13.5px] font-bold text-indigo-600 hover:text-indigo-700"
          to="/school-admin/grading"
        >
          Bảng điều phối chấm bài
          <ArrowUpRight aria-hidden="true" className="size-3.5" />
        </Link>
      </div>
    </section>
  )
}
