import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { CalendarRange } from 'lucide-react'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { useFeedbackToast } from '@/shared/ui/useFeedbackToast'
import { usePlaceSubscriptionOrderMutation } from '@/features/order_school'
import { useMySubscriptionQuery } from '../api/useMySubscriptionQuery'
import { useSubscriptionPlansQuery } from '../api/useSubscriptionPlansQuery'
import { PlanBrowseGrid } from '../components/PlanBrowseGrid'
import type { SubscriptionPlan, SubscriptionPlanPeriod } from '../model'

const DEFAULT_PAGE = 1
const PLAN_PAGE_SIZE = 50

type PeriodFilter = 'ALL' | SubscriptionPlanPeriod

// Cùng bộ nhãn với danh mục gói bên System Admin: cùng một khái niệm chu kỳ thì trường và quản trị
// viên phải đọc thấy đúng một cách gọi.
const PERIOD_FILTERS: Array<{ label: string; value: PeriodFilter }> = [
  { label: 'Mọi chu kỳ', value: 'ALL' },
  { label: 'Theo ngày', value: 'DAY' },
  { label: 'Theo tháng', value: 'MONTH' },
  { label: 'Theo năm', value: 'YEAR' },
]

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return undefined
}

export function SubscriptionPlansPage() {
  const navigate = useNavigate()
  const { feedbackToast, showError } = useFeedbackToast()

  const mySubscriptionQuery = useMySubscriptionQuery()
  const plansQuery = useSubscriptionPlansQuery(DEFAULT_PAGE, PLAN_PAGE_SIZE)
  const placeSubscriptionOrder = usePlaceSubscriptionOrderMutation()

  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('ALL')

  const subscription = mySubscriptionQuery.data ?? null
  const items = useMemo(() => plansQuery.data?.content ?? [], [plansQuery.data])

  // Lọc ở CLIENT được, khác với danh mục bên System Admin: trang này lấy một lượt PLAN_PAGE_SIZE gói
  // và KHÔNG phân trang, nên không có chuyện con số ở chỗ này chọi với con số ở chỗ kia. Khi danh mục
  // vượt quá PLAN_PAGE_SIZE thì phải đẩy bộ lọc xuống backend cùng lúc với việc thêm phân trang.
  const visibleItems = useMemo(
    () =>
      periodFilter === 'ALL'
        ? items
        : items.filter(({ subscription: plan }) => plan.periodType === periodFilter),
    [items, periodFilter],
  )

  /**
   * Đặt đơn rồi đi thẳng tới trang đơn — KHÔNG mở phiên thanh toán ở đây.
   *
   * Phiên chỉ được phát đúng lúc người dùng bấm trả trên trang đơn: SePay không có API hủy phiên
   * chưa trả, nên một phiên bị bỏ dở khoá trường khỏi đặt đơn mới tối đa 24 giờ.
   */
  async function handleSelectPlan(plan: SubscriptionPlan) {
    try {
      const orderId = await placeSubscriptionOrder.mutateAsync(plan.id)
      navigate(`/school-admin/orders/${orderId}`)
    } catch (error) {
      // Bốn kiểu từ chối của backend (đình chỉ · còn đơn treo · đã có kỳ xếp hàng · nâng cấp sớm)
      // đều tới đây. Giữ nguyên văn: chúng viết cho người đọc, không phải mã lỗi.
      showError(getErrorMessage(error) ?? 'Không thể đặt đơn cho gói này.')
    }
  }

  return (
    <section aria-labelledby="subscription-plans-title" className="grid gap-6">
      <div>
        <h1 className="text-2xl font-black text-blue-950 sm:text-3xl" id="subscription-plans-title">
          Tất cả các gói
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Gói đắt hơn gói đang dùng có hiệu lực ngay và được bù phần chưa dùng; gói rẻ hơn chạy nối tiếp sau kỳ hiện
          tại.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 transition focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-50">
          <CalendarRange aria-hidden="true" className="size-4 shrink-0 text-slate-400" />
          <span className="sr-only">Lọc theo chu kỳ</span>
          <select
            className="bg-transparent text-sm font-medium text-blue-950 outline-none"
            onChange={(event) => setPeriodFilter(event.target.value as PeriodFilter)}
            value={periodFilter}
          >
            {PERIOD_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {periodFilter === 'ALL' ? null : (
          <span className="text-[13px] text-slate-500">
            <strong className="font-bold text-blue-950 tabular-nums">{visibleItems.length}</strong> / {items.length} gói
          </span>
        )}
      </div>

      <ErrorBanner
        message={plansQuery.isError ? getErrorMessage(plansQuery.error) ?? 'Không tải được danh sách gói.' : null}
      />

      {!plansQuery.isLoading && items.length > 0 && visibleItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm font-bold text-slate-700">Không có gói nào theo chu kỳ này</p>
          <p className="mt-1 text-sm text-slate-500">Chọn “Mọi chu kỳ” để xem lại toàn bộ danh mục.</p>
        </div>
      ) : (
        <PlanBrowseGrid
          currentSubscription={subscription}
          isLoading={plansQuery.isLoading}
          items={visibleItems}
          onSelect={(plan) => void handleSelectPlan(plan)}
        />
      )}

      {feedbackToast}
    </section>
  )
}
