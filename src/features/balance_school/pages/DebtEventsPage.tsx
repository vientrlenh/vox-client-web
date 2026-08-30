import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { QUOTA_LABELS } from '@/features/subscription_school/model'
import { useDebtEventsQuery } from '../api/useBalanceQueries'
import {
  DEBT_EVENT_LABELS,
  formatDateTime,
  formatVnd,
  shortId,
  type DebtEventType,
  type SchoolDebtEvent,
} from '../model'

const PAGE_SIZE = 20

type EventVisual = {
  badge: string
  body: string
  card: string
  dot: string
  figureLabel: string
  figureValue: string
}

const EVENT_VISUALS: Record<DebtEventType, EventVisual> = {
  CAP_EXCEEDED: {
    badge: 'border-amber-300 bg-white text-amber-700',
    body: 'text-amber-800',
    card: 'border-amber-200 bg-amber-50',
    dot: 'bg-amber-500',
    figureLabel: 'text-amber-700',
    figureValue: 'text-amber-800',
  },
  CLEARED: {
    badge: 'border-emerald-300 bg-white text-emerald-700',
    body: 'text-emerald-800',
    card: 'border-emerald-200 bg-emerald-50',
    dot: 'bg-emerald-500',
    figureLabel: 'text-emerald-700',
    figureValue: 'text-emerald-800',
  },
  LOCKED: {
    badge: 'border-red-300 bg-white text-red-700',
    body: 'text-red-800',
    card: 'border-red-200 bg-red-50',
    dot: 'bg-red-500',
    figureLabel: 'text-red-700',
    figureValue: 'text-red-800',
  },
}

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return undefined
}

/** Nguồn của sự kiện. CLEARED không có -- hết nợ không do một khoản trừ nào gây ra. */
function triggerLabel(event: SchoolDebtEvent) {
  if (event.triggerExamSessionId) {
    return `Ca thi ${shortId(event.triggerExamSessionId)}`
  }
  if (event.triggerPracticeSessionId) {
    return `Phiên ôn luyện ${shortId(event.triggerPracticeSessionId)}`
  }
  return null
}

export function DebtEventsPage() {
  const [page, setPage] = useState(1)
  const eventsQuery = useDebtEventsQuery(page, PAGE_SIZE)

  const events = eventsQuery.data?.content ?? []
  const totalPages = eventsQuery.data?.totalPages ?? 0

  return (
    <section aria-labelledby="debt-events-title" className="grid gap-6">
      <div>
        <h1 className="text-2xl font-black text-blue-950 sm:text-3xl" id="debt-events-title">
          Nhật ký nợ hạn mức
        </h1>
        <p className="mt-2 max-w-4xl text-[15px] leading-6 text-slate-500">
          Sổ này trả lời <strong className="font-semibold text-slate-600">“vì sao trường bị khoá”</strong>, không phải
          “tiền đi đâu”. Nó chỉ ghi lúc trạng thái nợ{' '}
          <strong className="font-semibold text-slate-600">thay đổi</strong> — nên khoảng trống giữa hai mốc không có
          nghĩa là nợ đã dừng lại.
        </p>
      </div>

      <ErrorBanner
        message={eventsQuery.isError ? getErrorMessage(eventsQuery.error) ?? 'Không tải được nhật ký nợ.' : null}
      />

      {eventsQuery.isLoading ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-sm font-semibold text-slate-500">
          Đang tải nhật ký...
        </p>
      ) : events.length === 0 ? (
        <div className="grid gap-4">
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-11 text-center">
            <ShieldCheck aria-hidden="true" className="mx-auto size-9 text-emerald-200" />
            <p className="mt-3 text-[15px] font-bold text-slate-700">Trường chưa từng bị khoá</p>
            <p className="mx-auto mt-1.5 max-w-[60ch] text-[13px] leading-relaxed text-slate-500">
              Chưa có sự kiện nợ nào trong toàn bộ lịch sử của trường. Đây là trạng thái bình thường — kể cả với
              trường thường xuyên tiêu vượt hạn mức, miễn là ví luôn còn dương.
            </p>
          </div>
          <p className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-xs leading-relaxed text-slate-600">
            <strong className="font-bold text-blue-950">Sổ trống không có nghĩa là chưa tiêu vượt hạn mức.</strong>{' '}
            Tiêu vượt hạn mức là chuyện hằng ngày và được ghi ở Sao kê ví. Sổ này chỉ lên tiếng khi số dư thật sự âm —
            tức là ví đã hết tiền để gánh.
          </p>
        </div>
      ) : (
        <>
          <ol className="flex flex-col gap-4">
            {events.map((event) => {
              const visual = EVENT_VISUALS[event.eventType]
              const trigger = triggerLabel(event)
              const isCleared = event.eventType === 'CLEARED'

              return (
                <li className="grid grid-cols-[26px_minmax(0,1fr)] gap-x-4" key={event.id}>
                  <div className="flex justify-center pt-5">
                    <span aria-hidden="true" className={`size-3 rounded-full ring-4 ring-white ${visual.dot}`} />
                  </div>
                  <div className={`rounded-2xl border px-5 py-4 ${visual.card}`}>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold ${visual.badge}`}
                      >
                        {DEBT_EVENT_LABELS[event.eventType]}
                      </span>
                      {event.quotaType ? (
                        <span className="inline-flex items-center rounded-full border border-indigo-200 bg-white px-2.5 py-0.5 text-[11.5px] font-semibold text-indigo-700">
                          {QUOTA_LABELS[event.quotaType]}
                        </span>
                      ) : null}
                      <span className={`text-[12.5px] tabular-nums ${visual.figureLabel}`}>
                        {formatDateTime(event.occurredAt)}
                      </span>
                      {trigger ? (
                        <span className="ml-auto font-mono text-[11.5px] text-slate-500">{trigger}</span>
                      ) : null}
                    </div>

                    {isCleared ? (
                      <p className={`mt-3 max-w-[92ch] text-[12.5px] leading-relaxed ${visual.body}`}>
                        Số dư đã về không âm nên khoá tự mở ngay — không ai phải duyệt, không có bước đối soát nào ở
                        giữa. Dòng này không gắn với ví hạn mức nào: hết nợ là sự kiện cấp trường, và số dư là một con
                        số dùng chung cho cả hai ví.
                      </p>
                    ) : (
                      <dl className="mt-3.5 grid grid-cols-2 gap-3 border-t pt-3.5 sm:grid-cols-4"
                        style={{ borderColor: 'rgb(0 0 0 / 0.06)' }}
                      >
                        <div>
                          <dt className={`text-[10.5px] font-semibold ${visual.figureLabel}`}>Khoản vừa trừ</dt>
                          <dd className={`mt-0.5 text-[15px] font-bold tabular-nums ${visual.figureValue}`}>
                            {formatVnd(event.triggerAmountVnd)}
                          </dd>
                        </div>
                        <div>
                          <dt className={`text-[10.5px] font-semibold ${visual.figureLabel}`}>Hạn mức của ví</dt>
                          <dd className={`mt-0.5 text-[15px] font-bold tabular-nums ${visual.figureValue}`}>
                            {formatVnd(event.totalAllocatedVnd)}
                          </dd>
                        </div>
                        <div>
                          <dt className={`text-[10.5px] font-semibold ${visual.figureLabel}`}>
                            Đã dùng <span className="font-medium">(dựng lại)</span>
                          </dt>
                          <dd className={`mt-0.5 text-[15px] font-bold tabular-nums ${visual.figureValue}`}>
                            {formatVnd(event.usedAmountVnd)}
                          </dd>
                        </div>
                        <div>
                          <dt className={`text-[10.5px] font-semibold ${visual.figureLabel}`}>Nợ tại thời điểm đó</dt>
                          <dd className="mt-0.5 text-[15px] font-bold text-red-700 tabular-nums">
                            {formatVnd(event.overageVnd)}
                          </dd>
                        </div>
                      </dl>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>

          <div className="grid gap-3 lg:grid-cols-2">
            <p className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-xs leading-relaxed text-slate-600">
              <strong className="font-bold text-blue-950">“Đã dùng” ở đây là con số dựng lại</strong>, bằng hạn mức +
              nợ — không phải giá trị đọc từ bản ghi hạn mức. Bản ghi thật luôn bị kẹp tại đúng hạn mức (phần vượt được
              đẩy sang ví), nên chép thẳng nó vào đây thì mọi dòng đều hiện “đã dùng = hạn mức, nợ = 0”.
            </p>
            <p className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-xs leading-relaxed text-slate-600">
              <strong className="font-bold text-blue-950">Trần cảnh báo không giữ tiền lại.</strong> Vượt trần chỉ
              khiến hệ thống báo cho quản trị hệ thống rằng pipeline đo chi phí AI có thể đang có bug — nó không phải
              hạn mức nợ tối đa, và không thêm hậu quả nào cho trường ngoài việc đã bị khoá sẵn từ đồng nợ đầu tiên.
            </p>
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-6 py-4">
              <p className="text-xs font-medium text-slate-500">
                Trang <span className="font-bold text-blue-950 tabular-nums">{page}</span> / {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={page <= 1 || eventsQuery.isFetching}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  type="button"
                >
                  Trước
                </button>
                <button
                  className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={page >= totalPages || eventsQuery.isFetching}
                  onClick={() => setPage((current) => current + 1)}
                  type="button"
                >
                  Sau
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}
