import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, Pencil, Search, Star } from 'lucide-react'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { useConfirmationDialog } from '@/shared/ui/useConfirmationDialog'
import { useFeedbackToast } from '@/shared/ui/useFeedbackToast'
import { useUpdatePlanMutation } from '../api/usePlanMutations'
import {
  useSuspendSubscriptionMutation,
  useUnsuspendSubscriptionMutation,
} from '../api/useSchoolSubscriptionMutations'
import { useSchoolsWithOngoingExamQuery } from '../api/useSchoolsWithOngoingExamQuery'
import { useSchoolSubscriptionsByPlanQuery } from '../api/useSchoolSubscriptionsQuery'
import { useSubscriptionPlanQuery } from '../api/useSubscriptionPlansQuery'
import { PlanEditorDrawer } from '../components/PlanEditorDrawer'
import { SchoolSubscriptionTable } from '../components/SchoolSubscriptionTable'
import { SubscriptionPagination } from '../components/SubscriptionPagination'
import type { QuotaType, SchoolSubscriptionStatus, UpdateSubscriptionPlanPayload } from '../types'
import {
  QUOTA_LABELS,
  QUOTA_TYPES,
  formatDateTime,
  formatMinutes,
  formatPeriod,
  formatVnd,
  getErrorMessage,
  getPlanStatusDisplay,
} from '../types'

const DEFAULT_PAGE = 1
const PAGE_SIZE = 20

const STATUS_OPTIONS: Array<{ label: string; value: '' | SchoolSubscriptionStatus }> = [
  { label: 'Mọi trạng thái', value: '' },
  { label: 'Đang chạy', value: 'ACTIVE' },
  { label: 'Đình chỉ', value: 'SUSPENDED' },
  { label: 'Đã hủy gia hạn', value: 'CANCELLED' },
  { label: 'Hết hạn', value: 'EXPIRED' },
]

const QUOTA_HINTS: Record<QuotaType, string> = {
  EXAM: 'Hạn mức kiểm tra',
  PRACTICE: 'Hạn mức luyện tập cá nhân',
}

type StatProps = {
  hint?: string
  label: string
  value: string
}

function Stat({ hint, label, value }: StatProps) {
  return (
    <div className="flex flex-1 flex-col gap-1 px-6 py-4">
      <span className="text-xs font-bold text-slate-500">{label}</span>
      <span className="text-2xl font-black tracking-tight text-blue-950 tabular-nums">{value}</span>
      {hint ? <span className="text-xs font-medium text-slate-400">{hint}</span> : null}
    </div>
  )
}

export function SubscriptionPlanDetailPage() {
  const { planId } = useParams<{ planId: string }>()
  const { dialog: confirmationDialog, confirmWithReason } = useConfirmationDialog()
  const { feedbackToast, showError, showSuccess } = useFeedbackToast()

  const [page, setPage] = useState(DEFAULT_PAGE)
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<'' | SchoolSubscriptionStatus>('')
  const [isEditorOpen, setEditorOpen] = useState(false)

  const planQuery = useSubscriptionPlanQuery(planId)
  const schoolsQuery = useSchoolSubscriptionsByPlanQuery(planId, { keyword, status }, page, PAGE_SIZE)
  const ongoingExamQuery = useSchoolsWithOngoingExamQuery()
  const updateMutation = useUpdatePlanMutation()
  const suspendMutation = useSuspendSubscriptionMutation()
  const unsuspendMutation = useUnsuspendSubscriptionMutation()

  const plan = planQuery.data ?? null
  const subscriptions = useMemo(() => schoolsQuery.data?.content ?? [], [schoolsQuery.data])
  const totalElements = schoolsQuery.data?.totalElements ?? 0

  // Lỗi hoặc chưa tải xong -> tập rỗng, tức KHÔNG chặn nút nào. BE vẫn là chốt cuối.
  const schoolsWithOngoingExam = useMemo(
    () => new Set(ongoingExamQuery.data ?? []),
    [ongoingExamQuery.data],
  )

  const quotaByType = useMemo(() => {
    const map = new Map<QuotaType, number>()
    for (const quota of plan?.quotas ?? []) {
      map.set(quota.quotaType, quota.includedAmountVnd)
    }
    return map
  }, [plan])

  // "Đang chạy" đếm trong TRANG hiện tại, còn tổng lấy từ totalElements của BE — nói rõ để không ai
  // đọc con số nhỏ hơn thành "đã có trường rời gói".
  const runningOnPage = subscriptions.filter((item) => item.status === 'ACTIVE').length

  async function handleUpdate(id: string, payload: UpdateSubscriptionPlanPayload) {
    try {
      await updateMutation.mutateAsync({ id, payload })
      setEditorOpen(false)
      showSuccess('Cập nhật gói thành công.')
    } catch (error) {
      showError(getErrorMessage(error))
    }
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

  if (planQuery.isLoading) {
    return <p className="text-sm font-bold text-slate-500">Đang tải thông tin gói...</p>
  }

  if (!plan) {
    return (
      <div className="grid gap-4">
        <ErrorBanner message="Không tìm thấy gói dịch vụ này." />
        <Link className="text-sm font-bold text-indigo-600" to="/system-admin/subscription/plans">
          Quay lại danh mục gói
        </Link>
      </div>
    )
  }

  const statusDisplay = getPlanStatusDisplay(plan.status)

  return (
    <div className="grid gap-6">
      <Link
        className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 transition hover:text-slate-700"
        to="/system-admin/subscription/plans"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Danh mục gói
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid min-w-0 gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-blue-950">{plan.name}</h1>
            <StatusBadge label={statusDisplay.label} tone={statusDisplay.tone} />
          </div>
          {plan.tagline ? <p className="text-sm font-medium text-slate-500">{plan.tagline}</p> : null}
          <p className="text-xs font-medium text-slate-400">
            Chu kỳ {formatPeriod(plan.periodType, plan.periodCount)} · phiên bản {plan.version}
            {plan.updatedAt ? ` · cập nhật ${formatDateTime(plan.updatedAt)}` : ''}
          </p>
        </div>

        {plan.status === 'ACTIVE' ? (
          <button
            className="inline-flex h-11 items-center gap-2 rounded-full bg-indigo-50 px-6 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100"
            onClick={() => setEditorOpen(true)}
            type="button"
          >
            <Pencil aria-hidden="true" className="size-4" />
            Sửa gói
          </button>
        ) : null}
      </div>

      {/* Nơi ở của hạn mức và số trường đang dùng — bảng danh mục cố ý không mang chúng. */}
      <section className="flex flex-wrap divide-x divide-slate-200 rounded-2xl border border-slate-200 bg-white">
        <Stat
          hint={`mỗi ${formatPeriod(plan.periodType, plan.periodCount)}`}
          label="Giá gói"
          value={formatVnd(plan.priceVnd)}
        />
        {QUOTA_TYPES.map((quotaType) => (
          <Stat
            hint={QUOTA_HINTS[quotaType]}
            key={quotaType}
            label={QUOTA_LABELS[quotaType]}
            value={formatVnd(quotaByType.get(quotaType) ?? 0)}
          />
        ))}
        <Stat hint="mỗi lượt thi" label="Tối đa mỗi bài" value={formatMinutes(plan.maxTimePerAttemptMin)} />
        <Stat
          hint={`${runningOnPage} đang chạy trong trang này`}
          label="Trường đang dùng"
          value={String(totalElements)}
        />
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <h2 className="flex-1 text-xl font-black tracking-tight text-blue-950">Trường đang dùng gói này</h2>

        <label className="inline-flex h-11 w-64 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5">
          <Search aria-hidden="true" className="size-4 shrink-0 text-slate-400" />
          <span className="sr-only">Tìm theo tên trường</span>
          <input
            className="w-full bg-transparent text-sm font-medium text-blue-950 outline-none placeholder:text-slate-400"
            onChange={(event) => {
              setKeyword(event.target.value)
              setPage(DEFAULT_PAGE)
            }}
            placeholder="Tìm theo tên trường"
            value={keyword}
          />
        </label>

        <label className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-3.5">
          <span className="sr-only">Lọc theo trạng thái</span>
          <select
            className="bg-transparent text-sm font-medium text-blue-950 outline-none"
            onChange={(event) => {
              setStatus(event.target.value as '' | SchoolSubscriptionStatus)
              setPage(DEFAULT_PAGE)
            }}
            value={status}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ErrorBanner message={schoolsQuery.isError ? getErrorMessage(schoolsQuery.error) : null} />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <SchoolSubscriptionTable
          emptyMessage="Chưa có trường nào dùng gói này."
          isLoading={schoolsQuery.isLoading}
          items={subscriptions}
          onSuspend={(subscription) =>
            handleSuspend(subscription.id, subscription.school?.name ?? subscription.schoolId)
          }
          onUnsuspend={(subscription) =>
            handleUnsuspend(subscription.id, subscription.school?.name ?? subscription.schoolId)
          }
          showPlanColumn={false}
          suspendBlockedSchoolIds={schoolsWithOngoingExam}
        />
        <SubscriptionPagination
          isDisabled={schoolsQuery.isFetching}
          itemNoun="trường"
          onPageChange={setPage}
          page={page}
          pageSize={PAGE_SIZE}
          totalElements={totalElements}
          totalPages={schoolsQuery.data?.totalPages ?? 0}
        />
      </section>

      {plan.replacedByPlanId ? (
        <p className="inline-flex items-center gap-2 text-sm font-medium text-slate-500">
          <Star aria-hidden="true" className="size-4 text-amber-500" />
          Gói này đã ngừng bán — trường sẽ chuyển sang gói thay thế khi gia hạn.
        </p>
      ) : null}

      {isEditorOpen ? (
        <PlanEditorDrawer
          isOpen={isEditorOpen}
          isSubmitting={updateMutation.isPending}
          onClose={() => setEditorOpen(false)}
          onCreate={() => undefined}
          onUpdate={handleUpdate}
          plan={plan}
        />
      ) : null}

      {confirmationDialog}
      {feedbackToast}
    </div>
  )
}
