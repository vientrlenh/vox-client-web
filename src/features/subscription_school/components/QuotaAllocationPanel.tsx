import { useState } from 'react'
import { Percent, PiggyBank, Search, Shuffle } from 'lucide-react'
import { useConfirmationDialog } from '@/shared/ui/useConfirmationDialog'
import { UsageProgressBar } from '@/shared/ui/UsageProgressBar'
import { AllocateQuotaDialog } from './AllocateQuotaDialog'
import { FundQuotaDialog } from './FundQuotaDialog'
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
  /** Nạp tiền từ ví tự nạp của trường vào ví hạn mức của loại này. Không hoàn lại được. */
  onFund: (amountVnd: number, reason: string) => void
  onSetCap: (percent: number) => void
  onSubmit: (payload: AllocateQuotaPayload) => void
  page: number
  /**
   * Quyết định ý nghĩa của "Chưa phân bổ", và hai loại NGƯỢC NHAU: giáo viên không có trần thì tiêu
   * thoải mái trong ví trường, học sinh không có trần thì không luyện được lượt nào.
   */
  quotaType: 'EXAM' | 'PRACTICE'
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
  onFund,
  onPageChange,
  onSearchChange,
  onSetCap,
  onSubmit,
  page,
  quotaType,
  search,
  summary,
  userLabel,
}: QuotaAllocationPanelProps) {
  const [editing, setEditing] = useState<QuotaUserAllocation | null>(null)
  const [isEditingCap, setEditingCap] = useState(false)
  const [isFunding, setFunding] = useState(false)
  const { confirm, dialog: confirmDialog } = useConfirmationDialog()

  const allocations = summary?.content ?? []
  const poolTotalVnd = summary?.pool?.totalAllocatedAmountVnd ?? 0
  const distributedVnd = summary?.distributedAmountVnd ?? 0
  const totalPages = summary?.totalPages ?? 0
  const walletBalanceVnd = Math.max(0, summary?.walletBalanceVnd ?? 0)

  // Tiền THẬT trường còn trả được, khác hẳn phần còn chia được: trần chia tính trên tổng hạn mức gói
  // và không nhỏ đi khi ví bị tiêu, nên chia hết trần KHÔNG có nghĩa là những người được chia sẽ tiêu
  // được. Backend cố ý không chặn ở bước chia (trần chi phải ổn định suốt kỳ), nên chỗ duy nhất nói
  // được sự thật này cho quản trị trường là ở đây.
  const spendableFundsVnd = summary?.spendableFundsVnd ?? 0
  const isUnderfunded = distributedVnd > spendableFundsVnd
  // Phần đứng tên người đã nghỉ việc / ra trường: không tính vào trần và không có dòng nào trong bảng,
  // nên nếu không nói ra thì tổng "đã chia" và tổng các dòng lệch nhau không lý do.
  const orphanedVnd = summary?.orphanedAmountVnd ?? 0
  const unallocatedMeaning =
    quotaType === 'EXAM'
      ? `${userLabel} chưa có trần chi riêng — không bị chặn theo cá nhân, chỉ ví của trường áp dụng.`
      : `${userLabel} chưa có trần chi riêng — chưa luyện tập được lượt nào cho tới khi được chia.`

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

    onSubmit({ allocations: [], confirmWalletDraw: false, mode: 'AUTO' })
  }

  async function handleSaveOne(amountVnd: number, needsWalletConfirm: boolean) {
    if (!editing) {
      return
    }

    if (needsWalletConfirm) {
      const confirmed = await confirm({
        confirmLabel: 'Xác nhận trích ví',
        message: `Hạn mức mới vượt phần chia từ gói, phần dư sẽ trích từ ví tự nạp của trường (đang còn ${formatVnd(walletBalanceVnd)}). Ví này dùng chung cho cả thi lẫn luyện tập. Bạn có chắc chắn muốn tiếp tục?`,
        title: 'Xác nhận rút ví tự nạp của trường',
      })

      if (!confirmed) {
        return
      }
    }

    // Gửi ĐÚNG một người. Backend tự cộng thêm phần của những người không có trong yêu cầu khi kiểm
    // tổng, nên phân bổ từng phần là hợp lệ -- xem computeManualAmounts.
    onSubmit({
      allocations: [{ amountVnd, userId: editing.userId }],
      confirmWalletDraw: needsWalletConfirm,
      mode: 'MANUAL',
    })
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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
        {/*
          Đứng cạnh "Còn chia được" một cách có chủ ý: hai con số này thường xuyên KHÁC nhau, và
          chính khoảng cách giữa chúng là thứ quản trị trường cần thấy. Chia được không có nghĩa là
          trả được.
        */}
        <div
          className={`rounded-xl border px-4 py-3 ${
            isUnderfunded ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'
          }`}
        >
          <p className="text-[11.5px] font-semibold text-slate-500">Trường còn trả được</p>
          <p
            className={`mt-1 text-[17px] font-extrabold tracking-tight tabular-nums ${
              isUnderfunded ? 'text-red-700' : 'text-blue-950'
            }`}
          >
            {formatVnd(spendableFundsVnd)}
          </p>
        </div>
      </div>

      {isUnderfunded ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-800">
          <strong className="font-bold">
            Đã chia {formatVnd(distributedVnd)} nhưng trường chỉ còn trả được {formatVnd(spendableFundsVnd)}.
          </strong>{' '}
          Hạn mức cá nhân là trần chi, không giữ tiền — phần vượt vẫn hiện đủ trên màn hình của {userLabel}, nhưng
          sẽ bị từ chối ngay lúc họ bắt đầu dùng.
          {walletBalanceVnd > 0 ? (
            <>
              {' '}Ví tự nạp còn <strong className="font-bold">{formatVnd(walletBalanceVnd)}</strong> — nạp sang ví
              hạn mức để phần đã chia dùng được thật.
            </>
          ) : (
            <> Nạp thêm tiền vào ví hoặc nâng gói để phần đã chia dùng được thật.</>
          )}
        </p>
      ) : null}

      {orphanedVnd > 0 ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
          <strong className="font-semibold text-blue-950">{formatVnd(orphanedVnd)}</strong> đang đứng tên những
          người không còn thuộc danh sách này (đã nghỉ, đã ra trường, hoặc đổi vai trò). Phần đó không chiếm chỗ
          trong trần phân phối và không hiện ở bảng dưới — nêu ra để hai con số trên không có vẻ vênh nhau.
        </p>
      ) : null}

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
        {/*
          Nổi bật hơn khi đang thiếu tiền: lúc đó đây là việc DUY NHẤT sửa được tình trạng, còn lúc
          bình thường nó chỉ là một hành động sẵn có. Ẩn hẳn khi ví rỗng -- mở hộp thoại ra để rồi
          không nạp được đồng nào thì thà đừng mở.
        */}
        {walletBalanceVnd > 0 ? (
          <button
            className={`inline-flex h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 ${
              isUnderfunded
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
            disabled={isSubmitting}
            onClick={() => setFunding(true)}
            type="button"
          >
            <PiggyBank aria-hidden="true" className="size-4" />
            Nạp vào ví hạn mức
          </button>
        ) : null}
      </div>

      {/*
        Tooltip không đủ: trên máy cảm ứng thì không ai chạm được vào nó. Chỉ hiện khi trang đang xem
        thật sự có người chưa được chia, nên nó là chú thích cho thứ đang nhìn thấy chứ không phải một
        dòng hướng dẫn thường trực.
      */}
      {allocations.some((allocation) => allocation.allocatedAmountVnd === null) ? (
        <p className="text-xs leading-relaxed text-slate-500">
          <strong className="font-semibold text-slate-700">Chưa phân bổ</strong> khác <strong className="font-semibold text-slate-700">0 ₫</strong>: {unallocatedMeaning} Đặt 0 ₫ là chặn hẳn.
        </p>
      ) : null}

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
                    {/*
                      "Chưa phân bổ" và "0 ₫" là HAI trạng thái khác nhau và backend xử lý ngược
                      nhau -- gộp cả hai thành số 0 (bản cũ) giấu mất việc cả một nhóm người đang
                      không có trần chi nào. Xem QuotaUserAllocation.allocatedAmountVnd.
                    */}
                    <td className="px-4 py-3.5 text-right text-[13.5px] font-bold text-blue-950 tabular-nums">
                      {allocation.allocatedAmountVnd === null ? (
                        <span
                          className="text-[12.5px] font-semibold text-slate-400 italic"
                          title={unallocatedMeaning}
                        >
                          Chưa phân bổ
                        </span>
                      ) : (
                        formatVnd(allocation.allocatedAmountVnd)
                      )}
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

      {isFunding ? (
        <FundQuotaDialog
          isSubmitting={isSubmitting}
          onClose={() => setFunding(false)}
          onSubmit={(amountVnd, reason) => {
            onFund(amountVnd, reason)
            setFunding(false)
          }}
          poolTotalVnd={poolTotalVnd}
          poolUsedVnd={summary?.pool?.usedAmountVnd ?? 0}
          quotaType={quotaType}
          // Đề xuất đúng phần đang thiếu, không đề xuất cả ví: người dùng đang giải một vấn đề cụ
          // thể, và con số đó chính là câu trả lời cho nó.
          suggestedAmountVnd={Math.max(0, distributedVnd - spendableFundsVnd)}
          walletBalanceVnd={walletBalanceVnd}
        />
      ) : null}

      {editing ? (
        <AllocateQuotaDialog
          allocation={editing}
          distributedVnd={distributedVnd}
          isSubmitting={isSubmitting}
          onClose={() => setEditing(null)}
          onSubmit={(amountVnd, needsWalletConfirm) => void handleSaveOne(amountVnd, needsWalletConfirm)}
          poolTotalVnd={distributableVnd}
          quotaType={quotaType}
          walletBalanceVnd={walletBalanceVnd}
        />
      ) : null}

      {confirmDialog}
    </div>
  )
}
