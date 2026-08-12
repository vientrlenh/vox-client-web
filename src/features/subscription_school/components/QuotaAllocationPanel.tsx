import { useMemo, useState } from 'react'
import { RotateCcw, Scale, Search, Shuffle, Users } from 'lucide-react'
import { useConfirmationDialog } from '@/shared/ui/useConfirmationDialog'
import { UsageProgressBar } from '@/shared/ui/UsageProgressBar'
import {
  formatUsd,
  type AllocateQuotaPayload,
  type QuotaUserAllocation,
  type QuotaUserAllocationSummary,
} from '../types'

type QuotaAllocationPanelProps = {
  errorMessage?: string
  isError: boolean
  isLoading: boolean
  isSubmitting: boolean
  onSubmit: (payload: AllocateQuotaPayload) => void
  summary: QuotaUserAllocationSummary | undefined
  userLabel: string
}

function buildEditsFromAllocations(allocations: QuotaUserAllocation[]) {
  return Object.fromEntries(allocations.map((allocation) => [allocation.userId, allocation.allocatedQuantity]))
}

export function QuotaAllocationPanel({
  errorMessage,
  isError,
  isLoading,
  isSubmitting,
  onSubmit,
  summary,
  userLabel,
}: QuotaAllocationPanelProps) {
  const [edits, setEdits] = useState<Record<string, number>>({})
  const [search, setSearch] = useState('')
  const [syncedSummary, setSyncedSummary] = useState(summary)
  const { confirm, dialog: confirmDialog } = useConfirmationDialog()

  if (summary !== syncedSummary) {
    setSyncedSummary(summary)
    setEdits(buildEditsFromAllocations(summary?.allocations ?? []))
  }

  const allocations = useMemo(() => summary?.allocations ?? [], [summary])
  const originalEdits = useMemo(() => buildEditsFromAllocations(allocations), [allocations])
  const isDirty = allocations.some((allocation) => (edits[allocation.userId] ?? 0) !== (originalEdits[allocation.userId] ?? 0))
  const filteredAllocations = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) {
      return allocations
    }
    return allocations.filter((allocation) => (allocation.fullName ?? '').toLowerCase().includes(term))
  }, [allocations, search])

  const pool = summary?.pool
  const poolTotalUsd = pool?.totalAllocated ?? 0
  const editedTotalUsd = allocations.reduce((sum, allocation) => sum + (edits[allocation.userId] ?? 0), 0)
  const overAllocated = editedTotalUsd > poolTotalUsd

  function maxAllowedFor(userId: string) {
    const otherUsersTotal = editedTotalUsd - (edits[userId] ?? 0)
    return Math.max(0, poolTotalUsd - otherUsersTotal)
  }

  function updateAmount(userId: string, amount: number) {
    setEdits((current) => {
      const otherUsersTotal = allocations.reduce(
        (sum, allocation) => (allocation.userId === userId ? sum : sum + (current[allocation.userId] ?? 0)),
        0,
      )
      const maxAllowed = Math.max(0, poolTotalUsd - otherUsersTotal)
      return { ...current, [userId]: Math.min(Math.max(0, amount), maxAllowed) }
    })
  }

  function handleReset() {
    setEdits(Object.fromEntries(allocations.map((allocation) => [allocation.userId, 0])))
  }

  async function handleAutoSplit() {
    const confirmed = await confirm({
      confirmLabel: 'Chia đều',
      message: `Toàn bộ hạn mức của trường sẽ được chia đều lại cho tất cả ${userLabel}, ghi đè mọi phân bổ hiện tại (kể cả thay đổi chưa lưu). Bạn có chắc chắn muốn tiếp tục?`,
      title: 'Xác nhận chia đều tự động',
    })

    if (!confirmed) {
      return
    }

    onSubmit({ allocations: [], mode: 'AUTO' })
  }

  async function handleManualSave() {
    const confirmed = await confirm({
      confirmLabel: 'Lưu phân bổ',
      message: `Xác nhận lưu hạn mức đã chỉnh sửa cho ${allocations.length} ${userLabel}?`,
      title: 'Xác nhận phân bổ hạn mức',
    })

    if (!confirmed) {
      return
    }

    onSubmit({
      allocations: allocations.map((allocation) => ({
        amount: edits[allocation.userId] ?? 0,
        userId: allocation.userId,
      })),
      mode: 'MANUAL',
    })
  }

  if (isLoading) {
    return <p className="text-sm font-semibold text-slate-500">Đang tải dữ liệu phân bổ...</p>
  }

  if (isError) {
    return <p className="text-sm font-semibold text-red-600">{errorMessage ?? 'Không thể tải dữ liệu phân bổ.'}</p>
  }

  return (
    <div className="grid gap-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-[10px] bg-indigo-50 text-indigo-600">
            <Scale aria-hidden="true" className="size-4.5" />
          </span>
          <span className="text-sm font-bold text-slate-900">Hạn mức của trường</span>
        </div>
        <UsageProgressBar total={poolTotalUsd} used={editedTotalUsd} />
        {overAllocated ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-xs leading-4 text-red-700">
            Tổng hạn mức phân bổ đang vượt quá hạn mức của trường ({formatUsd(pool?.totalAllocated)}).
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Tìm ${userLabel} theo tên...`}
            type="text"
            value={search}
          />
        </div>
        <button
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting || !isDirty}
          onClick={handleReset}
          type="button"
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          Đặt lại
        </button>
        <button
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting || allocations.length === 0}
          onClick={() => void handleAutoSplit()}
          type="button"
        >
          <Shuffle aria-hidden="true" className="size-4" />
          Chia đều tự động
        </button>
        <button
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-black text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting || allocations.length === 0}
          onClick={() => void handleManualSave()}
          type="button"
        >
          Lưu phân bổ
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-extrabold text-blue-950">
                <th className="px-6 py-3.5">Họ tên</th>
                <th className="px-4 py-3.5">Đã sử dụng</th>
                <th className="px-4 py-3.5">Hạn mức hiện tại</th>
                <th className="px-4 py-3.5">Hạn mức mới (USD)</th>
              </tr>
            </thead>
            <tbody>
              {filteredAllocations.length === 0 ? (
                <tr>
                  <td className="px-6 py-14 text-center" colSpan={4}>
                    <Users aria-hidden="true" className="mx-auto size-9 text-slate-300" />
                    <p className="mt-2 text-sm font-semibold text-slate-500">
                      {allocations.length === 0 ? `Trường chưa có ${userLabel} phù hợp` : 'Không tìm thấy kết quả'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredAllocations.map((allocation) => {
                  const rowMax = maxAllowedFor(allocation.userId)

                  return (
                    <tr className="border-b border-slate-100" key={allocation.userId}>
                      <td className="px-6 py-3.5 text-sm font-bold text-slate-900">{allocation.fullName ?? '-'}</td>
                      <td className="px-4 py-3.5 text-sm text-slate-600">{formatUsd(allocation.usedQuantity)}</td>
                      <td className="px-4 py-3.5 text-sm text-slate-600">{formatUsd(allocation.allocatedQuantity)}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <input
                            className="h-9 w-28 rounded-lg border border-slate-200 px-2.5 text-right text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                            max={rowMax}
                            min={0}
                            onChange={(event) => updateAmount(allocation.userId, Number(event.target.value) || 0)}
                            step="0.01"
                            type="number"
                            value={edits[allocation.userId] ?? 0}
                          />
                          <span className="text-xs text-slate-400">/ {formatUsd(rowMax)}</span>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {confirmDialog}
    </div>
  )
}