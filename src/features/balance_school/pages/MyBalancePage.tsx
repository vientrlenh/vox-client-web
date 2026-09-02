import { useState } from 'react'
import { useNavigate } from 'react-router'
import { FileText, ShieldCheck } from 'lucide-react'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { useFeedbackToast } from '@/shared/ui/useFeedbackToast'
import { useMySubscriptionQuery } from '@/features/subscription_school/api/useMySubscriptionQuery'
import { useMySubscriptionUsageQuery } from '@/features/subscription_school/api/useMySubscriptionUsageQuery'
import { SUBSCRIPTION_PLANS_PATH } from '@/features/subscription_school/routes'
import {
  useBalanceEntriesQuery,
  useBalanceSummaryQuery,
  useDebtEventsQuery,
  useSchoolBalanceQuery,
  useThirtyDaysAgoIso,
} from '../api/useBalanceQueries'
import { usePlaceTopUpOrderMutation } from '../api/useTopUpMutation'
import { BalanceHeroCard } from '../components/BalanceHeroCard'
import { ENTRY_VISUALS, entrySourceLabel, entryTitle } from '../components/EntryLine'
import { SpendLayerBars } from '../components/SpendLayerBars'
import { TopUpDialog } from '../components/TopUpDialog'
import { DEBT_EVENT_LABELS, formatDateTime, formatVnd, toNumber } from '../model'
import { BALANCE_DEBT_PATH, BALANCE_STATEMENT_PATH } from '../routes'

const RECENT_ENTRY_COUNT = 5
const DEFAULT_TOP_UP = 5_000_000

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return undefined
}

export function MyBalancePage() {
  const navigate = useNavigate()
  const { feedbackToast, showError } = useFeedbackToast()
  const [isTopUpOpen, setIsTopUpOpen] = useState(false)

  const from = useThirtyDaysAgoIso()

  const balanceQuery = useSchoolBalanceQuery()
  const summaryQuery = useBalanceSummaryQuery(from)
  const recentQuery = useBalanceEntriesQuery(1, RECENT_ENTRY_COUNT)
  const debtQuery = useDebtEventsQuery(1, 2)
  const subscriptionQuery = useMySubscriptionQuery()
  const usageQuery = useMySubscriptionUsageQuery()
  const placeTopUpOrder = usePlaceTopUpOrderMutation()

  const balance = balanceQuery.data ?? null
  const recentEntries = recentQuery.data?.content ?? []
  const debtEvents = debtQuery.data?.content ?? []

  // Số dư 0 của trường CHƯA TỪNG nạp và của trường vừa tiêu hết là hai con số giống hệt nhau -- chỉ
  // sổ cái phân biệt được. totalElements là câu trả lời rẻ nhất, và trang này vốn đã tải nó rồi.
  const hasEverMoved = (recentQuery.data?.totalElements ?? 0) > 0

  // Nạp tiền đòi một gói đang chạy (CreateTopUpOrderUseCase từ chối nếu không). Suy từ query gói đã
  // có sẵn, KHÔNG thêm field canTopUp lên type ví: điều kiện là sự thật về GÓI, chép sang chỗ thứ
  // hai là hôm nào luật đổi thì nút vẫn mời bấm vào một thứ chắc chắn hỏng.
  const canTopUp = subscriptionQuery.data?.status === 'ACTIVE'

  async function handleTopUp(creditAmountVnd: number) {
    try {
      const orderId = await placeTopUpOrder.mutateAsync(creditAmountVnd)
      setIsTopUpOpen(false)
      navigate(`/school-admin/orders/${orderId}`)
    } catch (error) {
      showError(getErrorMessage(error) ?? 'Không tạo được đơn nạp thêm.')
    }
  }

  return (
    <section aria-labelledby="my-balance-title" className="grid gap-6">
      <div>
        <h1 className="text-2xl font-black text-blue-950 sm:text-3xl" id="my-balance-title">
          Tổng quan ví nhà trường
        </h1>
        <p className="mt-2 max-w-3xl text-[15px] leading-6 text-slate-500">
          Tiền trường tự nạp, dùng để gánh phần chi phí AI <strong className="font-semibold text-slate-600">vượt quá
          hạn mức kèm gói</strong>. Số dư sống xuyên qua mọi lần gia hạn và không bao giờ hết hạn.
        </p>
      </div>

      <ErrorBanner
        message={balanceQuery.isError ? getErrorMessage(balanceQuery.error) ?? 'Không tải được số dư ví.' : null}
      />

      <BalanceHeroCard
        balance={balance}
        hasEverMoved={hasEverMoved}
        isLoading={balanceQuery.isLoading}
        onOpenStatement={() => navigate(BALANCE_STATEMENT_PATH)}
        onTopUp={() => setIsTopUpOpen(true)}
        spentLast30Days={summaryQuery.data?.overageChargedVnd ?? null}
      />

      <SpendLayerBars
        balanceVnd={balance?.balanceVnd ?? null}
        isLoading={usageQuery.isLoading}
        usage={usageQuery.data ?? []}
      />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white px-6 py-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-base font-bold tracking-tight text-blue-950">Bút toán gần nhất</h2>
            <button
              className="text-[13px] font-semibold text-indigo-600 transition hover:text-indigo-800"
              onClick={() => navigate(BALANCE_STATEMENT_PATH)}
              type="button"
            >
              Toàn bộ sao kê →
            </button>
          </div>

          {recentQuery.isLoading ? (
            <p className="mt-6 text-sm font-semibold text-slate-400">Đang tải bút toán...</p>
          ) : recentEntries.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 px-5 py-8 text-center">
              <FileText aria-hidden="true" className="mx-auto size-8 text-slate-300" />
              <p className="mt-2.5 text-[13.5px] font-bold text-slate-700">Ví chưa có bút toán nào</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-slate-500">
                Trường chưa nạp và cũng chưa tiêu vượt hạn mức lần nào.
                <br />
                Chỉ cần nạp khi hạn mức kèm gói bắt đầu cạn.
              </p>
            </div>
          ) : (
            <ul className="mt-2">
              {recentEntries.map((entry) => {
                const visual = ENTRY_VISUALS[entry.entryType]
                const Icon = visual.icon
                const isCredit = toNumber(entry.amountVnd) >= 0

                return (
                  <li className="flex items-center gap-3.5 border-b border-slate-100 py-3 last:border-b-0" key={entry.id}>
                    <span className={`inline-flex size-7 shrink-0 items-center justify-center rounded-lg ${visual.bubble}`}>
                      <Icon aria-hidden="true" className={`size-3.5 ${visual.iconClass}`} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-blue-950">{entryTitle(entry)}</p>
                      <p className="mt-0.5 truncate font-mono text-[10.5px] text-slate-400">
                        {entrySourceLabel(entry)} · {formatDateTime(entry.occurredAt)}
                      </p>
                    </div>
                    <span className={`text-[13px] font-bold tabular-nums ${visual.amountClass}`}>
                      {isCredit ? '+' : ''}
                      {formatVnd(entry.amountVnd)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white px-6 py-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-base font-bold tracking-tight text-blue-950">Nhật ký nợ hạn mức</h2>
            <button
              className="text-[13px] font-semibold text-indigo-600 transition hover:text-indigo-800"
              onClick={() => navigate(BALANCE_DEBT_PATH)}
              type="button"
            >
              Xem tất cả →
            </button>
          </div>

          {debtQuery.isLoading ? (
            <p className="mt-5 text-sm font-semibold text-slate-400">Đang tải nhật ký...</p>
          ) : debtEvents.length === 0 ? (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5">
              <ShieldCheck aria-hidden="true" className="mt-0.5 size-4.5 shrink-0 text-emerald-700" />
              <div>
                <p className="text-[13px] font-bold text-emerald-700">Trường chưa từng bị khoá</p>
                <p className="mt-0.5 text-xs leading-relaxed text-emerald-800">
                  Chưa có sự kiện nợ nào được ghi nhận trong toàn bộ lịch sử của trường.
                </p>
              </div>
            </div>
          ) : (
            <ul className="mt-3 flex flex-col gap-2.5">
              {debtEvents.map((event) => (
                <li className="rounded-xl border border-slate-200 px-3.5 py-3" key={event.id}>
                  <p className="text-[12.5px] font-bold text-blue-950">{DEBT_EVENT_LABELS[event.eventType]}</p>
                  <p className="mt-0.5 text-[11.5px] text-slate-500 tabular-nums">{formatDateTime(event.occurredAt)}</p>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-4 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">
            Sổ này chỉ ghi lúc <strong className="font-semibold text-slate-700">đổi trạng thái</strong> — rơi vào nợ,
            vượt trần cảnh báo, hết nợ. Nó không phải sao kê tiền: một trường tiêu vượt hạn mức đều đặn nhưng ví luôn
            còn dương thì sổ này trống hoàn toàn.
          </p>
        </section>
      </div>

      {isTopUpOpen ? (
        <TopUpDialog
          canTopUp={canTopUp}
          defaultAmount={DEFAULT_TOP_UP}
          isSubmitting={placeTopUpOrder.isPending}
          onClose={() => setIsTopUpOpen(false)}
          onGoToPlans={() => navigate(SUBSCRIPTION_PLANS_PATH)}
          onSubmit={(amount) => void handleTopUp(amount)}
        />
      ) : null}

      {feedbackToast}
    </section>
  )
}
