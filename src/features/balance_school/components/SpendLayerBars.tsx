import { QUOTA_LABELS, QUOTA_TYPES, type SubscriptionQuotaRecord } from '@/features/subscription_school/model'
import { formatVndWhole, toNumber } from '../model'

type SpendLayerBarsProps = {
  balanceVnd: string | null
  isLoading: boolean
  usage: SubscriptionQuotaRecord[]
}

/**
 * "Chi tiêu còn đi được bao xa trước khi trường bị khoá", vẽ theo TỪNG ví hạn mức.
 *
 * Mỗi thanh có thước bằng hạn mức + ví, chứ không phải chỉ hạn mức: ví đứng NGAY SAU hạn mức trong
 * thứ tự tiêu tiền, nên hai thứ phải nằm cùng một thước thì mới đọc được là "qua khỏi mốc kia là bắt
 * đầu ăn vào ví".
 *
 * Vùng gạch chéo hiện GIỐNG NHAU trên cả hai thanh vì nó là CÙNG MỘT ví -- cộng lại là đếm đôi. Chú
 * thích bên dưới nói rõ điều đó; bỏ nó đi là mời người đọc tự cộng hai lần cùng một số tiền.
 */
export function SpendLayerBars({ balanceVnd, isLoading, usage }: SpendLayerBarsProps) {
  const wallet = Math.max(0, toNumber(balanceVnd))
  const usageByType = new Map(usage.map((record) => [record.quotaType, record]))

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-[17px] font-bold tracking-tight text-blue-950">Ví đứng sau hạn mức nào</h2>
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <i aria-hidden="true" className="size-2.5 rounded-[3px] bg-indigo-600" /> Đã dùng
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i aria-hidden="true" className="size-2.5 rounded-[3px] bg-indigo-100" /> Hạn mức còn lại
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i
              aria-hidden="true"
              className="size-2.5 rounded-[3px]"
              style={{ backgroundImage: 'repeating-linear-gradient(135deg,#fef3c7 0 4px,#fde68a 4px 8px)' }}
            />{' '}
            Ví dự phòng
          </span>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-5 text-sm font-semibold text-slate-400">Đang tải hạn mức...</p>
      ) : (
        <div className="mt-5 flex flex-col gap-5">
          {QUOTA_TYPES.map((quotaType) => {
            const record = usageByType.get(quotaType)
            const total = record?.totalAllocatedAmountVnd ?? 0
            const used = Math.min(record?.usedAmountVnd ?? 0, total)
            const span = total + wallet

            // Trường chưa có gói: không có thước nào để vẽ. Hiện một dòng chữ thay vì một thanh rỗng
            // trông như "đã dùng hết".
            if (span <= 0) {
              return (
                <div className="flex flex-col gap-2" key={quotaType}>
                  <span className="text-[13.5px] font-bold text-blue-950">{QUOTA_LABELS[quotaType]}</span>
                  <p className="text-xs text-slate-400">Chưa có hạn mức nào được cấp cho loại này.</p>
                </div>
              )
            }

            const usedPct = (used / span) * 100
            const freePct = ((total - used) / span) * 100
            const walletPct = (wallet / span) * 100
            const quotaPct = (total / span) * 100

            return (
              <div className="flex flex-col gap-2" key={quotaType}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-[13.5px] font-bold text-blue-950">{QUOTA_LABELS[quotaType]}</span>
                  <span className="text-[12.5px] text-slate-500 tabular-nums">
                    {formatVndWhole(used)} / {formatVndWhole(total)} hạn mức
                  </span>
                </div>
                <div className="relative flex h-7 overflow-hidden rounded-lg bg-slate-100">
                  <div className="bg-indigo-600" style={{ width: `${usedPct}%` }} />
                  <div className="bg-indigo-100" style={{ width: `${freePct}%` }} />
                  <div
                    style={{
                      backgroundImage: 'repeating-linear-gradient(135deg,#fef3c7 0 6px,#fde68a 6px 12px)',
                      width: `${walletPct}%`,
                    }}
                  />
                  {wallet > 0 ? (
                    <div
                      aria-hidden="true"
                      className="absolute inset-y-0 border-l-2 border-dashed border-slate-400"
                      style={{ left: `${quotaPct}%` }}
                    />
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {wallet > 0 ? (
        <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
          <strong className="font-bold">Hai vùng gạch chéo là CÙNG MỘT ví.</strong> Cộng chúng lại là đếm đôi —{' '}
          {formatVndWhole(wallet)} này phục vụ cả hai loại, hết ở bên nào thì bên kia cũng hết. Đường đứt là mốc hạn
          mức kèm gói: qua khỏi nó là bắt đầu tiêu vào ví.
        </p>
      ) : null}
    </section>
  )
}
