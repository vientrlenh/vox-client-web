import { useState } from 'react'
import { BarChart3, Building2, ClipboardList, Package, Plus } from 'lucide-react'
import { TabPillGroup } from '@/shared/ui/TabPill'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { useConfirmationDialog } from '@/shared/ui/useConfirmationDialog'
import { Pagination } from '@/shared/components/Pagination'
import { goToCheckout } from '@/shared/payment/checkout'
import { isPaymentMethod, PAYMENT_METHOD_OPTIONS } from '@/shared/payment/types'
import { useSubscriptionPlansQuery } from '../api/useSubscriptionPlansQuery'
import { useCreatePlanMutation, useUpdatePlanMutation, useArchivePlanMutation } from '../api/usePlanMutations'
import { useSchoolSubscriptionsQuery } from '../api/useSchoolSubscriptionsQuery'
import { useCancelSubscriptionMutation, useRenewSubscriptionMutation } from '../api/useSchoolSubscriptionMutations'
import { useSubscriptionRequestsQuery } from '../api/useSubscriptionRequestsQuery'
import { useCreatePaymentLinkForRequestMutation, useRejectRequestMutation } from '../api/useSubscriptionRequestMutations'
import { useSchoolLookup } from '../api/useSchoolLookup'
import { SubscriptionOverviewPanel } from '../components/SubscriptionOverviewPanel'
import { PlanCard } from '../components/PlanCard'
import { PlanEditorDrawer } from '../components/PlanEditorDrawer'
import { SchoolSubscriptionsFiltersBar } from '../components/SchoolSubscriptionsFiltersBar'
import { SchoolSubscriptionsTable } from '../components/SchoolSubscriptionsTable'
import { SchoolSubscriptionDetailDrawer } from '../components/SchoolSubscriptionDetailDrawer'
import { SubscriptionRequestsTable } from '../components/SubscriptionRequestsTable'
import { formatVnd } from '../types'
import type {
  CreatePlanPayload,
  RequestStatus,
  SchoolFilters,
  SchoolSubscription,
  SubscriptionPlan,
  SubscriptionRequest,
} from '../types'

type SubscriptionTab = 'overview' | 'packages' | 'schools' | 'requests'

const DEFAULT_PAGE = 1
const PAGE_SIZE = 10
const EMPTY_SCHOOL_FILTERS: SchoolFilters = { keyword: '', planId: '', status: '' }

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return undefined
}

export function SystemAdminSubscriptionPage() {
  const [tab, setTab] = useState<SubscriptionTab>('overview')
  const [toast, setToast] = useState<{ text: string; tone: 'error' | 'success' } | null>(null)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const [detailOpen, setDetailOpen] = useState(false)
  const [viewingSubscription, setViewingSubscription] = useState<SchoolSubscription | null>(null)

  const [schoolFilters, setSchoolFilters] = useState<SchoolFilters>(EMPTY_SCHOOL_FILTERS)
  const [schoolsPage, setSchoolsPage] = useState(DEFAULT_PAGE)

  const [requestsStatus, setRequestsStatus] = useState<RequestStatus>('PENDING')
  const [requestsPage, setRequestsPage] = useState(DEFAULT_PAGE)

  const { confirm, confirmWithSelection, dialog: confirmDialog } = useConfirmationDialog()
  const { getSchool, isLoading: isSchoolLookupLoading } = useSchoolLookup()

  const plansQuery = useSubscriptionPlansQuery(DEFAULT_PAGE, 50)
  const plans = plansQuery.data?.content ?? []
  const activePlans = plans.filter((plan) => plan.status === 'ACTIVE')

  const overviewSubscriptionsQuery = useSchoolSubscriptionsQuery(
    { keyword: '', planId: '', status: 'ACTIVE' },
    DEFAULT_PAGE,
    200,
  )

  const schoolsQuery = useSchoolSubscriptionsQuery(schoolFilters, schoolsPage, PAGE_SIZE)
  const requestsQuery = useSubscriptionRequestsQuery(requestsStatus, requestsPage, PAGE_SIZE)
  const overviewRequestsQuery = useSubscriptionRequestsQuery('PENDING', DEFAULT_PAGE, 5)

  const createPlanMutation = useCreatePlanMutation()
  const updatePlanMutation = useUpdatePlanMutation()
  const archivePlanMutation = useArchivePlanMutation()
  const renewMutation = useRenewSubscriptionMutation()
  const cancelMutation = useCancelSubscriptionMutation()
  const paymentLinkMutation = useCreatePaymentLinkForRequestMutation()
  const rejectMutation = useRejectRequestMutation()

  const isSavingPlan = createPlanMutation.isPending || updatePlanMutation.isPending
  const isSchoolActionPending = renewMutation.isPending || cancelMutation.isPending
  const isRequestActionPending = paymentLinkMutation.isPending || rejectMutation.isPending

  function getPlanName(planId: string | null) {
    if (!planId) {
      return '—'
    }
    return plans.find((plan) => plan.id === planId)?.name ?? planId.slice(0, 8)
  }

  function handleSchoolFilterChange(name: keyof SchoolFilters, value: string) {
    setSchoolFilters((current) => ({ ...current, [name]: value }))
    setSchoolsPage(DEFAULT_PAGE)
  }

  function openCreatePlan() {
    setEditingPlan(null)
    setFormError(null)
    setEditorOpen(true)
  }

  function openEditPlan(plan: SubscriptionPlan) {
    setEditingPlan(plan)
    setFormError(null)
    setEditorOpen(true)
  }

  function closeEditor() {
    if (isSavingPlan) {
      return
    }
    setEditorOpen(false)
    setEditingPlan(null)
    setFormError(null)
  }

  function openDetail(subscription: SchoolSubscription) {
    setViewingSubscription(subscription)
    setDetailOpen(true)
  }

  function closeDetail() {
    setDetailOpen(false)
    setViewingSubscription(null)
  }

  async function handleCreatePlan(payload: CreatePlanPayload) {
    try {
      setFormError(null)
      await createPlanMutation.mutateAsync(payload)
      setToast({ text: 'Đã tạo gói mới', tone: 'success' })
      setEditorOpen(false)
      setEditingPlan(null)
    } catch (error) {
      setFormError(getErrorMessage(error) ?? 'Không thể tạo gói. Vui lòng thử lại.')
    }
  }

  async function handleUpdatePlan(id: string, payload: CreatePlanPayload) {
    try {
      setFormError(null)
      await updatePlanMutation.mutateAsync({ id, payload })
      setToast({ text: 'Đã cập nhật gói', tone: 'success' })
      setEditorOpen(false)
      setEditingPlan(null)
    } catch (error) {
      setFormError(getErrorMessage(error) ?? 'Không thể cập nhật gói. Vui lòng thử lại.')
    }
  }

  async function handleArchivePlan(plan: SubscriptionPlan) {
    const replacementOptions = activePlans
      .filter((candidate) => candidate.id !== plan.id)
      .map((candidate) => ({ label: `${candidate.name} — ${formatVnd(candidate.pricePerYear)}`, value: candidate.id }))

    const result = await confirmWithSelection({
      confirmLabel: 'Lưu trữ',
      message: `Gói "${plan.name}" sẽ được lưu trữ và không còn hiển thị cho trường đăng ký mới. Các trường đang dùng gói này không bị ảnh hưởng ngay, nhưng nếu không chọn gói thay thế, các trường sẽ không gia hạn được cho tới khi có gói thay thế.`,
      selectLabel: 'Gói thay thế khi trường gia hạn (không bắt buộc)',
      selectOptions: replacementOptions,
      selectPlaceholder: 'Không chọn — chặn gia hạn cho tới khi có gói thay thế',
      title: 'Lưu trữ gói dịch vụ',
    })

    if (!result.confirmed) {
      return
    }

    try {
      await archivePlanMutation.mutateAsync({ id: plan.id, replacedByPlanId: result.selection || null })
      setToast({ text: 'Đã lưu trữ gói', tone: 'success' })
    } catch (error) {
      setToast({ text: getErrorMessage(error) ?? 'Không thể lưu trữ gói.', tone: 'error' })
    }
  }

  async function handleRenew(subscription: SchoolSubscription) {
    const school = getSchool(subscription.schoolId)
    const confirmed = await confirm({
      confirmLabel: 'Gia hạn',
      message: `Gia hạn gói cho trường "${school?.name ?? subscription.schoolId}" thêm một chu kỳ mới?`,
      title: 'Gia hạn gói đăng ký',
    })

    if (!confirmed) {
      return
    }

    try {
      await renewMutation.mutateAsync({ schoolId: subscription.schoolId, subscriptionId: subscription.id })
      setToast({ text: 'Đã gia hạn gói cho trường', tone: 'success' })
    } catch (error) {
      setToast({ text: getErrorMessage(error) ?? 'Không thể gia hạn gói.', tone: 'error' })
    }
  }

  async function handleCancel(subscription: SchoolSubscription) {
    const school = getSchool(subscription.schoolId)
    const confirmed = await confirm({
      confirmLabel: 'Hủy gói',
      message: `Hủy gói đang dùng của trường "${school?.name ?? subscription.schoolId}"? Hành động này không thể hoàn tác.`,
      title: 'Hủy gói đăng ký',
    })

    if (!confirmed) {
      return
    }

    try {
      await cancelMutation.mutateAsync({ schoolId: subscription.schoolId, subscriptionId: subscription.id })
      setToast({ text: 'Đã hủy gói của trường', tone: 'success' })
    } catch (error) {
      setToast({ text: getErrorMessage(error) ?? 'Không thể hủy gói.', tone: 'error' })
    }
  }

  async function handlePay(request: SubscriptionRequest) {
    const school = getSchool(request.schoolId)
    const { confirmed, selection } = await confirmWithSelection({
      confirmLabel: 'Tiếp tục thanh toán',
      message: `Bạn sẽ được chuyển đến cổng thanh toán để thanh toán gói "${getPlanName(request.requestedPlanId)}" cho trường "${school?.name ?? request.schoolId}". Gói được kích hoạt tự động ngay sau khi thanh toán thành công.`,
      selectLabel: 'Cổng thanh toán',
      selectOptions: PAYMENT_METHOD_OPTIONS,
      selectPlaceholder: 'Chọn cổng thanh toán',
      title: 'Thanh toán yêu cầu',
    })

    if (!confirmed) {
      return
    }

    if (!isPaymentMethod(selection)) {
      setToast({ text: 'Chọn cổng thanh toán để tiếp tục.', tone: 'error' })
      return
    }

    try {
      const result = await paymentLinkMutation.mutateAsync({ paymentMethod: selection, requestId: request.id })
      goToCheckout(result.data)
    } catch (error) {
      setToast({ text: getErrorMessage(error) ?? 'Không thể tạo link thanh toán.', tone: 'error' })
    }
  }

  async function handleReject(request: SubscriptionRequest) {
    const school = getSchool(request.schoolId)
    const confirmed = await confirm({
      confirmLabel: 'Từ chối',
      message: `Từ chối yêu cầu của trường "${school?.name ?? request.schoolId}"?`,
      title: 'Từ chối yêu cầu',
    })

    if (!confirmed) {
      return
    }

    try {
      await rejectMutation.mutateAsync(request.id)
      setToast({ text: 'Đã từ chối yêu cầu', tone: 'success' })
    } catch (error) {
      setToast({ text: getErrorMessage(error) ?? 'Không thể từ chối yêu cầu.', tone: 'error' })
    }
  }

  return (
    <section aria-labelledby="system-admin-subscription-title" className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-blue-950" id="system-admin-subscription-title">
            Quản lý gói subscription
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Định nghĩa gói theo hạn mức, theo dõi trường đang dùng, xử lý yêu cầu và doanh thu toàn hệ thống.
          </p>
        </div>
        {tab === 'packages' ? (
          <button
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-indigo-600 px-4.5 text-sm font-black text-white transition hover:bg-indigo-700"
            onClick={openCreatePlan}
            type="button"
          >
            <Plus aria-hidden="true" className="size-4.5" />
            Tạo gói mới
          </button>
        ) : null}
      </div>

      <TabPillGroup
        items={[
          { icon: <BarChart3 className="size-4" />, label: 'Tổng quan', value: 'overview' },
          { icon: <Package className="size-4" />, label: 'Gói dịch vụ', value: 'packages' },
          { icon: <Building2 className="size-4" />, label: 'Trường học', value: 'schools' },
          { icon: <ClipboardList className="size-4" />, label: 'Yêu cầu', value: 'requests' },
        ]}
        onChange={setTab}
        value={tab}
      />

      {tab === 'overview' ? (
        <SubscriptionOverviewPanel
          activeSubscriptions={overviewSubscriptionsQuery.data?.content ?? []}
          getSchoolName={(schoolId) => getSchool(schoolId)?.name ?? schoolId}
          isLoading={overviewSubscriptionsQuery.isLoading || plansQuery.isLoading || isSchoolLookupLoading}
          pendingRequestsCount={overviewRequestsQuery.data?.totalElements ?? 0}
          plans={activePlans}
          recentRequests={overviewRequestsQuery.data?.content ?? []}
        />
      ) : null}

      {tab === 'packages' ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {plansQuery.isLoading ? (
            <p className="text-sm font-semibold text-slate-500">Đang tải danh sách gói...</p>
          ) : null}
          {!plansQuery.isLoading && plans.length === 0 ? (
            <p className="text-sm font-semibold text-slate-500">Chưa có gói dịch vụ nào.</p>
          ) : null}
          {plans.map((plan) => (
            <PlanCard
              getPlanName={getPlanName}
              key={plan.id}
              onArchive={handleArchivePlan}
              onEdit={openEditPlan}
              plan={plan}
            />
          ))}
        </div>
      ) : null}

      {tab === 'schools' ? (
        <div className="grid gap-4">
          <SchoolSubscriptionsFiltersBar filters={schoolFilters} onChange={handleSchoolFilterChange} plans={activePlans} />
          <SchoolSubscriptionsTable
            errorMessage={getErrorMessage(schoolsQuery.error)}
            footer={
              <Pagination
                currentPage={schoolsPage}
                itemName="trường"
                onPageChange={setSchoolsPage}
                totalElements={schoolsQuery.data?.totalElements ?? 0}
                totalPages={schoolsQuery.data?.totalPages ?? 0}
              />
            }
            getSchool={getSchool}
            isActionPending={isSchoolActionPending}
            isError={schoolsQuery.isError}
            isLoading={schoolsQuery.isLoading}
            onCancel={handleCancel}
            onRenew={handleRenew}
            onRetry={() => void schoolsQuery.refetch()}
            onViewDetail={openDetail}
            subscriptions={schoolsQuery.data?.content ?? []}
          />
        </div>
      ) : null}

      {tab === 'requests' ? (
        <SubscriptionRequestsTable
          errorMessage={getErrorMessage(requestsQuery.error)}
          footer={
            <Pagination
              currentPage={requestsPage}
              itemName="yêu cầu"
              onPageChange={setRequestsPage}
              totalElements={requestsQuery.data?.totalElements ?? 0}
              totalPages={requestsQuery.data?.totalPages ?? 0}
            />
          }
          getPlanName={getPlanName}
          getSchool={getSchool}
          isActionPending={isRequestActionPending}
          isError={requestsQuery.isError}
          isLoading={requestsQuery.isLoading}
          onPay={handlePay}
          onReject={handleReject}
          onRetry={() => void requestsQuery.refetch()}
          onStatusChange={(status) => {
            setRequestsStatus(status)
            setRequestsPage(DEFAULT_PAGE)
          }}
          requests={requestsQuery.data?.content ?? []}
          status={requestsStatus}
        />
      ) : null}

      <PlanEditorDrawer
        errorMessage={formError ?? undefined}
        isOpen={editorOpen}
        key={editorOpen ? (editingPlan?.id ?? 'create') : 'closed'}
        isSubmitting={isSavingPlan}
        onClose={closeEditor}
        onCreate={(payload) => void handleCreatePlan(payload)}
        onUpdate={(id, payload) => void handleUpdatePlan(id, payload)}
        plan={editingPlan}
      />

      <SchoolSubscriptionDetailDrawer
        isOpen={detailOpen}
        onClose={closeDetail}
        school={viewingSubscription ? getSchool(viewingSubscription.schoolId) : null}
        subscription={viewingSubscription}
      />

      {confirmDialog}

      <FeedbackToast message={toast?.text ?? null} onClose={() => setToast(null)} tone={toast?.tone ?? 'success'} />
    </section>
  )
}
