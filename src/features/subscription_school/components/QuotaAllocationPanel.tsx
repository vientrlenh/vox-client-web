import { useState } from 'react'
import { Percent, Search, Shuffle } from 'lucide-react'
import { useConfirmationDialog } from '@/shared/ui/useConfirmationDialog'
import { UsageProgressBar } from '@/shared/ui/UsageProgressBar'
import { AllocateQuotaDialog } from './AllocateQuotaDialog'
import { SetQuotaCapDialog } from './SetQuotaCapDialog'
import { formatVnd, type AllocateQuotaPayload, type QuotaUserAllocation, type QuotaUserAllocationPage } from '../types'

type QuotaAllocationPanelProps = {
  errorMessage?: string
  isError: boolean
  isFetching: boolean
  isLoading: boolean
  isSubmitting: boolean
  onPageChange: (page: number) => void
  onSearchChange: (search: string) => void
  onSetCap: (percent: number) => void
  onSubmit: (payload: AllocateQuotaPayload) => void
  page: number
  search: string
  summary: QuotaUserAllocationPage | undefined
  userLabel: string
}

export function QuotaAllocationPanel({
  errorMessage,
  isError,
  isFetching,
  isLoading,
  isSubmitting,
  onPageChange,
  onSearchChange,
  onSetCap,
  onSubmit,
  page,
  search,
  summary,
  userLabel,
}: QuotaAllocationPanelProps) {
  const [editing, setEditing] = useState<QuotaUserAllocation | null>(null)
  const [isEditingCap, setEditingCap] = useState(false)
  const { confirm, dialog: confirmDialog } = useConfirmationDialog()

  const allocations = summary?.content ?? []
  const poolTotalVnd = summary?.pool?.totalAllocatedAmountVnd ?? 0
  const distributedVnd = summary?.distributedAmountVnd ?? 0
  const totalPages = summary?.totalPages ?? 0

  // Trần phân phối: phần ví trường CHO PHÉP chia ra. Phần còn lại là dự phòng, để dành cấp thêm
  // giữa kỳ. Lấy con số đã tính sẵn từ backend chứ không nhân lại -- đó là con số dùng để từ chối.
  const capPercent = Math.round((summary?.distributableRatio ?? 1) * 100)
  const distributableVnd = summary?.distributableAmountVnd ?? poolTotalVnd
  const remainingVnd = Math.max(0, distributableVnd - distributedVnd)
  // Hạ trần xuống dưới mức ĐÃ chia là hợp lệ -- phần đã chia là chuyện đã rồi. Hiện phần vượt để
  // quản trị viên biết cần thu bớt của ai, thay vì từ chối và để họ mắc kẹt không siết lại được.
  const overCapVnd = Math.max(0, distributedVnd - distributableVnd)

  async function handleAutoSplit() {
    const confirmed = await confirm({
      confirmLabel: 'Chia đều',
      message: `Toàn bộ hạn mức của trường sẽ được chia đều lại cho tất cả ${userLabel}, ghi đè mọi phân bổ hiện tại. Bạn có chắc chắn muốn tiếp tục?`,
      title: 'Xác nhận chia đều tự động',
    })

    if (!confirmed) {
      return
    }

    onSubmit({ allocations: [], mode: 'AUTO' })
  }

  function handleSaveOne(amountVnd: number) {
    if (!editing) {
      return
    }
    // Gửi ĐÚNG một người. Backend tự cộng thêm phần của những người không có trong yêu cầu khi kiểm
    // tổng, nên phân bổ từng phần là hợp lệ -- xem computeManualAmounts.
    onSubmit({ allocations: [{ amountVnd, userId: editing.userId }], mode: 'MANUAL' })
    setEditing(null)
  }

  if (isLoading) {
    return <p className="text-sm font-semibold text-slate-500">Đang tải dữ liệu phân bổ...</p>
  }

  if (isError) {
    return <p className="text-sm font-semibold text-red-600">{errorMessage ?? 'Không thể tải dữ liệu phân bổ.'}</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-[11.5px] font-semibold text-slate-500">Ví hạn mức của trường</p>
          <p className="mt-1 text-[17px] font-extrabold tracking-tight text-blue-950 tabular-nums">
            {formatVnd(poolTotalVnd)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-[11.5px] font-semibold text-slate-500">Đã chia cho {userLabel}</p>
          <p className="mt-1 text-[17px] font-extrabold tracking-tight text-indigo-700 tabular-nums">
            {formatVnd(distributedVnd)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-[11.5px] font-semibold text-slate-500">Còn chia được</p>
          <p className="mt-1 text-[17px] font-extrabold tracking-tight text-emerald-700 tabular-nums">
            {formatVnd(remainingVnd)}
          </p>
        </div>
      </div>

      {/* Thước đo theo phần ĐƯỢC PHÉP chia, không theo cả ví: chia hết phần cho phép là đã đầy. */}
      <UsageProgressBar total={distributableVnd} used={distributedVnd} />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Percent aria-hidden="true" className="size-4 shrink-0 text-slate-400" />
          <p className="text-[12.5px] leading-relaxed text-slate-600">
            Trần phân phối: <strong className="font-bold text-blue-950">{capPercent}%</strong> ví hạn mức
            {capPercent < 100 ? (
              <>
                {' '}— giữ lại <strong className="font-bold text-blue-950">{formatVnd(poolTotalVnd - distributableVnd)}</strong> làm dự phòng
              </>
            ) : null}
          </p>
        </div>
        <button
          className="shrink-0 text-[13px] font-semibold text-indigo-600 transition hover:text-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          onClick={() => setEditingCap(true)}
          type="button"
        >
          Đổi trần
        </button>
      </div>

      {overCapVnd > 0 ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
          <strong className="font-bold">Đã chia vượt trần {formatVnd(overCapVnd)}.</strong> Phần đã chia vẫn giữ
          nguyên — hạ trần không thu hồi hạn mức của ai. Nhưng mọi lần chia tiếp theo sẽ bị từ chối cho tới khi tổng
          đã chia về dưới trần.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex h-11 min-w-64 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 transition focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-50">
          <Search aria-hidden="true" className="size-4 shrink-0 text-slate-400" />
          <span className="sr-only">Tìm theo tên</span>
          <input
            className="min-w-0 flex-1 bg-transparent text-sm text-blue-950 outline-none"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={`Tìm ${userLabel} theo tên`}
            value={search}
          />
        </label>
        <button
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-indigo-200 bg-white px-4 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isSubmitting}
          onClick={() => void handleAutoSplit()}
          type="button"
        >
          <Shuffle aria-hidden="true" className="size-4" />
          Chia đều tự động
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-160 table-fixed border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-500">
                <th className="px-5 py-3" scope="col">Họ tên</th>
                <th className="w-44 px-4 py-3 text-right" scope="col">Hạn mức được cấp</th>
                <th className="w-40 px-4 py-3 text-right" scope="col">Đã dùng</th>
                <th className="w-28 px-5 py-3 text-right" scope="col">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {allocations.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-center text-sm text-slate-500" colSpan={4}>
                    {search.trim() ? `Không tìm thấy ${userLabel} nào khớp từ khoá.` : `Trường chưa có ${userLabel} nào.`}
                  </td>
                </tr>
              ) : (
                allocations.map((allocation) => (
                  <tr className="border-b border-slate-100 last:border-b-0" key={allocation.userId}>
                    <td className="px-5 py-3.5">
                      <div className="truncate text-[13.5px] font-semibold text-blue-950">
                        {allocation.user?.fullName?.trim() || (
                          <span className="italic text-slate-400">Tài khoản đã bị xoá</span>
                        )}
                      </div>
                      {allocation.user?.email ? (
                        <div className="mt-0.5 truncate text-[11.5px] text-slate-400">{allocation.user.email}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3.5 text-right text-[13.5px] font-bold text-blue-950 tabular-nums">
                      {formatVnd(allocation.allocatedAmountVnd)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-[13px] text-slate-600 tabular-nums">
                      {formatVnd(allocation.usedAmountVnd)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        className="text-[13px] font-semibold text-indigo-600 transition hover:text-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                        onClick={() => setEditing(allocation)}
                        type="button"
                      >
                        Sửa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-slate-200 bg-white px-5 py-3">
            <p className="text-xs font-medium text-slate-500">
              Trang <span className="font-bold text-blue-950 tabular-nums">{page}</span> / {totalPages} ·{' '}
              <span className="tabular-nums">{summary?.totalElements ?? 0}</span> {userLabel}
            </p>
            <div className="flex items-center gap-2">
              <button
                className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={page <= 1 || isFetching}
                onClick={() => onPageChange(Math.max(1, page - 1))}
                type="button"
              >
                Trước
              </button>
              <button
                className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={page >= totalPages || isFetching}
                onClick={() => onPageChange(page + 1)}
                type="button"
              >
                Sau
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {isEditingCap ? (
        <SetQuotaCapDialog
          currentPercent={capPercent}
          distributedVnd={distributedVnd}
          isSubmitting={isSubmitting}
          onClose={() => setEditingCap(false)}
          onSubmit={(percent) => {
            onSetCap(percent)
            setEditingCap(false)
          }}
          poolTotalVnd={poolTotalVnd}
          userLabel={userLabel}
        />
      ) : null}

      {editing ? (
        <AllocateQuotaDialog
          allocation={editing}
          distributedVnd={distributedVnd}
          isSubmitting={isSubmitting}
          onClose={() => setEditing(null)}
          onSubmit={handleSaveOne}
          poolTotalVnd={distributableVnd}
        />
      ) : null}

      {confirmDialog}
    </div>
  )
}
