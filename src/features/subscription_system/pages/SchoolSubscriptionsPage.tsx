import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { useConfirmationDialog } from '@/shared/ui/useConfirmationDialog'
import { useFeedbackToast } from '@/shared/ui/useFeedbackToast'
import {
  useSuspendSubscriptionMutation,
  useUnsuspendSubscriptionMutation,
} from '../api/useSchoolSubscriptionMutations'
import { useSchoolSubscriptionsQuery } from '../api/useSchoolSubscriptionsQuery'
import { useSubscriptionPlansQuery } from '../api/useSubscriptionPlansQuery'
import { SchoolSubscriptionTable } from '../components/SchoolSubscriptionTable'
import { SubscriptionPagination } from '../components/SubscriptionPagination'
import type { SchoolFilters, SchoolSubscriptionStatus } from '../types'
import { formatPeriod, getErrorMessage } from '../types'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 20
const PLAN_OPTIONS_PAGE_SIZE = 50

const STATUS_OPTIONS: Array<{ label: string; value: '' | SchoolSubscriptionStatus }> = [
  { label: 'Mọi trạng thái', value: '' },
  { label: 'Đang chạy', value: 'ACTIVE' },
  { label: 'Đình chỉ', value: 'SUSPENDED' },
  { label: 'Đã hủy gia hạn', value: 'CANCELLED' },
  { label: 'Hết hạn', value: 'EXPIRED' },
]

const EMPTY_FILTERS: SchoolFilters = { keyword: '', status: '', subscriptionPlanId: '' }

export function SchoolSubscriptionsPage() {
  const { dialog: confirmationDialog, confirmWithReason } = useConfirmationDialog()
  const { feedbackToast, showError, showSuccess } = useFeedbackToast()

  const [filters, setFilters] = useState<SchoolFilters>(EMPTY_FILTERS)
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const subscriptionsQuery = useSchoolSubscriptionsQuery(filters, page, pageSize)
  const plansQuery = useSubscriptionPlansQuery(DEFAULT_PAGE, PLAN_OPTIONS_PAGE_SIZE)
  const suspendMutation = useSuspendSubscriptionMutation()
  const unsuspendMutation = useUnsuspendSubscriptionMutation()

  const subscriptions = useMemo(() => subscriptionsQuery.data?.content ?? [], [subscriptionsQuery.data])

  const planOptions = useMemo(
    () =>
      (plansQuery.data?.content ?? []).map(({ subscription }) => ({
        label: `${subscription.name} · ${formatPeriod(subscription.periodType, subscription.periodCount)}`,
        value: subscription.id,
      })),
    [plansQuery.data],
  )

  function updateFilter<K extends keyof SchoolFilters>(key: K, value: SchoolFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }))
    setPage(DEFAULT_PAGE)
  }

  async function handleSuspend(subscriptionId: string, schoolName: string) {
    const { confirmed, reason } = await confirmWithReason({
      confirmLabel: 'Đình chỉ',
      message: `Đình chỉ gói của "${schoolName}"? Trường sẽ mất quyền dùng NGAY, khác với hủy gia hạn.`,
      reasonLabel: 'Lý do đình chỉ',
      requireReason: true,
      title: 'Đình chỉ gói',
    })

    if (!confirmed) {
      return
    }

    try {
      const result = await suspendMutation.mutateAsync({ reason, subscriptionId })
      showSuccess(result.message || 'Đã đình chỉ gói.')
    } catch (error) {
      // BE từ chối khi trường đang có ca thi chạy — thông điệp đó nói rõ phải đợi hết ca, giữ nguyên
      // văn thay vì thay bằng câu chung.
      showError(getErrorMessage(error))
    }
  }

  async function handleUnsuspend(subscriptionId: string, schoolName: string) {
    const { confirmed, reason } = await confirmWithReason({
      confirmLabel: 'Gỡ đình chỉ',
      message: `Gỡ đình chỉ cho "${schoolName}"? Lý do đình chỉ hiện tại sẽ bị xóa trắng.`,
      reasonLabel: 'Ghi chú (không bắt buộc)',
      title: 'Gỡ đình chỉ',
    })

    if (!confirmed) {
      return
    }

    try {
      const result = await unsuspendMutation.mutateAsync({ note: reason || undefined, subscriptionId })
      showSuccess(result.message || 'Đã gỡ đình chỉ.')
    } catch (error) {
      showError(getErrorMessage(error))
    }
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-3xl font-black tracking-tight text-blue-950">Trường &amp; gói</h1>
        <p className="text-sm font-medium text-slate-500">
          Gói đang hiệu lực của từng trường. Đình chỉ cắt quyền dùng ngay; hủy chỉ tắt gia hạn.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex h-11 min-w-64 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5">
          <Search aria-hidden="true" className="size-4 shrink-0 text-slate-400" />
          <span className="sr-only">Tìm theo tên trường</span>
          <input
            className="w-full bg-transparent text-sm font-medium text-blue-950 outline-none placeholder:text-slate-400"
            onChange={(event) => updateFilter('keyword', event.target.value)}
            placeholder="Tìm theo tên trường"
            value={filters.keyword}
          />
        </label>

        <label className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-3.5">
          <span className="sr-only">Lọc theo gói</span>
          <select
            className="bg-transparent text-sm font-medium text-blue-950 outline-none"
            onChange={(event) => updateFilter('subscriptionPlanId', event.target.value)}
            value={filters.subscriptionPlanId}
          >
            <option value="">Tất cả gói</option>
            {planOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-3.5">
          <span className="sr-only">Lọc theo trạng thái</span>
          <select
            className="bg-transparent text-sm font-medium text-blue-950 outline-none"
            onChange={(event) => updateFilter('status', event.target.value as '' | SchoolSubscriptionStatus)}
            value={filters.status}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ErrorBanner message={subscriptionsQuery.isError ? getErrorMessage(subscriptionsQuery.error) : null} />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <SchoolSubscriptionTable
          emptyMessage="Không có trường nào khớp bộ lọc."
          isLoading={subscriptionsQuery.isLoading}
          items={subscriptions}
          onSuspend={(subscription) =>
            handleSuspend(subscription.id, subscription.school?.name ?? subscription.schoolId)
          }
          onUnsuspend={(subscription) =>
            handleUnsuspend(subscription.id, subscription.school?.name ?? subscription.schoolId)
          }
        />
        <SubscriptionPagination
          isDisabled={subscriptionsQuery.isFetching}
          itemNoun="trường"
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(DEFAULT_PAGE)
          }}
          page={page}
          pageSize={pageSize}
          totalElements={subscriptionsQuery.data?.totalElements ?? 0}
          totalPages={subscriptionsQuery.data?.totalPages ?? 0}
        />
      </section>

      {confirmationDialog}
      {feedbackToast}
    </div>
  )
}
