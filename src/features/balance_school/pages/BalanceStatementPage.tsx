import { useState } from 'react'
import { ListFilter } from 'lucide-react'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { QUOTA_LABELS } from '@/features/subscription_school/model'
import { useBalanceEntriesQuery, useBalanceSummaryQuery, useThirtyDaysAgoIso } from '../api/useBalanceQueries'
import { ENTRY_VISUALS, entrySourceLabel } from '../components/EntryLine'
import { BALANCE_ENTRY_LABELS, formatDateTime, formatVnd, toNumber, type BalanceEntryType } from '../model'

const PAGE_SIZE = 20

type EntryFilter = 'ALL' | BalanceEntryType

const ENTRY_FILTERS: Array<{ label: string; value: EntryFilter }> = [
  { label: 'Mọi loại bút toán', value: 'ALL' },
  { label: 'Nạp thêm', value: 'TOP_UP' },
  { label: 'Trừ vượt hạn mức', value: 'OVERAGE_CHARGE' },
  { label: 'Hoàn tiền', value: 'REFUND' },
  { label: 'Điều chỉnh thủ công', value: 'ADJUSTMENT' },
]

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return undefined
}

export function BalanceStatementPage() {
  const [page, setPage] = useState(1)
  const [entryFilter, setEntryFilter] = useState<EntryFilter>('ALL')

  const entriesQuery = useBalanceEntriesQuery(page, PAGE_SIZE, entryFilter === 'ALL' ? null : entryFilter)
  // Ô tổng KHÔNG nhận bộ lọc: nó luôn hiện cả ba nhóm, kể cả khi bảng đang lọc, để người đọc còn
  // thấy mình đang giấu đi cái gì. Và nó cộng trên TOÀN dải chứ không phải trang đang xem -- cộng
  // cột của bảng thì mỗi lần lật trang con số ở đầu trang lại đổi.
  const summaryQuery = useBalanceSummaryQuery(useThirtyDaysAgoIso())

  const entries = entriesQuery.data?.content ?? []
  const totalPages = entriesQuery.data?.totalPages ?? 0
  const totalElements = entriesQuery.data?.totalElements ?? 0

  function changeFilter(value: EntryFilter) {
    setEntryFilter(value)
    // Trang 4 của "mọi loại" gần như chắc chắn không tồn tại khi lọc còn một loại -- ở lại đó là
    // hiện một bảng rỗng trông như không có dữ liệu.
    setPage(1)
  }

  return (
    <section aria-labelledby="balance-statement-title" className="grid gap-6">
      <div>
        <h1 className="text-2xl font-black text-blue-950 sm:text-3xl" id="balance-statement-title">
          Sao kê ví
        </h1>
        <p className="mt-2 max-w-4xl text-[15px] leading-6 text-slate-500">
          Mọi bút toán làm đổi số dư của trường, mới nhất trước. Sổ chỉ ghi thêm, không sửa và không xoá.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5">
          <p className="text-[11.5px] font-semibold text-emerald-700">Nạp và hoàn tiền · 30 ngày</p>
          <p className="mt-1 text-lg font-extrabold tracking-tight text-emerald-700 tabular-nums">
            {formatVnd(summaryQuery.data?.creditedVnd)}
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
          <p className="text-[11.5px] font-semibold text-amber-700">Trừ vượt hạn mức · 30 ngày</p>
          <p className="mt-1 text-lg font-extrabold tracking-tight text-amber-700 tabular-nums">
            {formatVnd(summaryQuery.data?.overageChargedVnd)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5">
          <p className="text-[11.5px] font-semibold text-slate-500">Điều chỉnh thủ công · 30 ngày</p>
          <p className="mt-1 text-lg font-extrabold tracking-tight text-slate-700 tabular-nums">
            {formatVnd(summaryQuery.data?.adjustedVnd)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 transition focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-50">
          <ListFilter aria-hidden="true" className="size-4 shrink-0 text-slate-400" />
          <span className="sr-only">Lọc theo loại bút toán</span>
          <select
            className="bg-transparent text-sm font-medium text-blue-950 outline-none"
            onChange={(event) => changeFilter(event.target.value as EntryFilter)}
            value={entryFilter}
          >
            {ENTRY_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <span className="text-[13px] text-slate-500">
          <strong className="font-bold text-blue-950 tabular-nums">{totalElements}</strong> bút toán
        </span>
      </div>

      <ErrorBanner
        message={entriesQuery.isError ? getErrorMessage(entriesQuery.error) ?? 'Không tải được sao kê.' : null}
      />

      {entriesQuery.isLoading ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-sm font-semibold text-slate-500">
          Đang tải sao kê...
        </p>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm font-bold text-slate-700">Không có bút toán nào</p>
          <p className="mt-1 text-sm text-slate-500">
            {entryFilter === 'ALL'
              ? 'Ví của trường chưa phát sinh giao dịch nào.'
              : 'Không có bút toán nào thuộc loại này. Chọn “Mọi loại bút toán” để xem lại toàn bộ.'}
          </p>
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-240 table-fixed border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-500">
                  <th className="w-40 px-6 py-3.5" scope="col">Thời điểm</th>
                  <th className="px-4 py-3.5" scope="col">Diễn giải</th>
                  <th className="w-36 px-4 py-3.5" scope="col">Loại hạn mức</th>
                  <th className="w-44 px-4 py-3.5 text-right" scope="col">Số tiền</th>
                  <th className="w-44 px-6 py-3.5 text-right" scope="col">Số dư sau</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const visual = ENTRY_VISUALS[entry.entryType]
                  const amount = toNumber(entry.amountVnd)
                  const source = entrySourceLabel(entry)

                  return (
                    <tr className="border-b border-slate-100 align-top last:border-b-0" key={entry.id}>
                      <td className="px-6 py-4 text-[12.5px] text-slate-600 tabular-nums">
                        {formatDateTime(entry.occurredAt)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold ${visual.badge}`}
                        >
                          {BALANCE_ENTRY_LABELS[entry.entryType]}
                        </span>
                        {entry.reason ? (
                          <p className="mt-1.5 text-[13px] font-semibold wrap-break-word text-blue-950">
                            “{entry.reason}”
                          </p>
                        ) : null}
                        {source ? <p className="mt-1 font-mono text-[10.5px] text-slate-400">{source}</p> : null}
                        {/*
                          Đối soát ngược với hoá đơn nhà cung cấp: costUsd × fxRateUsed phải ra đúng
                          amountVnd của chính dòng này. Tỷ giá là bình quân gia quyền của cả phiên,
                          chốt lúc phát sinh -- không phải tỷ giá hôm nay.
                        */}
                        {entry.costUsd && entry.fxRateUsed ? (
                          <p className="mt-1 font-mono text-[10.5px] text-slate-400 tabular-nums">
                            ${entry.costUsd} × {entry.fxRateUsed}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4">
                        {entry.quotaType ? (
                          <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[11.5px] font-semibold text-indigo-700">
                            {QUOTA_LABELS[entry.quotaType]}
                          </span>
                        ) : (
                          <span className="text-[12.5px] text-slate-300">—</span>
                        )}
                      </td>
                      <td className={`px-4 py-4 text-right text-[13.5px] font-bold tabular-nums ${visual.amountClass}`}>
                        {amount >= 0 ? '+' : ''}
                        {formatVnd(entry.amountVnd)}
                      </td>
                      <td className="px-6 py-4 text-right text-[13.5px] font-bold text-blue-950 tabular-nums">
                        {formatVnd(entry.balanceAfterVnd)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
              <p className="text-xs font-medium text-slate-500">
                Trang <span className="font-bold text-blue-950 tabular-nums">{page}</span> / {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={page <= 1 || entriesQuery.isFetching}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  type="button"
                >
                  Trước
                </button>
                <button
                  className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={page >= totalPages || entriesQuery.isFetching}
                  onClick={() => setPage((current) => current + 1)}
                  type="button"
                >
                  Sau
                </button>
              </div>
            </div>
          ) : null}
        </section>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-xs leading-relaxed text-slate-600">
          <strong className="font-bold text-blue-950">Đây không phải tổng chi phí AI của trường.</strong> Sổ này chỉ ghi{' '}
          <strong className="font-semibold">phần vượt</strong> hạn mức. Phần chi tiêu còn nằm trong hạn mức kèm gói đã
          được đếm ở bản ghi hạn mức rồi — ghi thêm ở đây là đếm hai lần cùng một đồng tiền.
        </p>
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-xs leading-relaxed text-slate-600">
          <strong className="font-bold text-blue-950">Số lẻ ở đây là thật.</strong> Bút toán lưu tới 6 chữ số thập phân
          — một lượt ôn luyện có thể chỉ tốn vài phần trăm đồng. Bảng hiển thị 2 số lẻ cho đọc được; cột{' '}
          <strong className="font-semibold">Số dư sau</strong> lấy nguyên giá trị đã lưu, không cộng dồn ở giao diện.
        </p>
      </div>
    </section>
  )
}
