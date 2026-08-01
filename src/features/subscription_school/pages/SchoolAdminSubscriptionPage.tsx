import { useState } from 'react'
import { Diamond, Receipt, ShoppingBag, Users } from 'lucide-react'
import { TabPillGroup } from '@/shared/ui/TabPill'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { useConfirmationDialog } from '@/shared/ui/useConfirmationDialog'
import { Pagination } from '@/shared/components/Pagination'
import { useMySubscriptionQuery } from '../api/useMySubscriptionQuery'
import { useMySubscriptionUsageQuery } from '../api/useMySubscriptionUsageQuery'
import { useSubscriptionPlansQuery } from '../api/useSubscriptionPlansQuery'
import {
  useCreatePaymentLinkForSubscriptionRequestMutation,
  useSubmitSubscriptionRequestMutation,
} from '../api/useSubscriptionRequestMutations'
import {
  useCreatePaymentLinkForRenewalMutation,
  useCreatePaymentLinkForTokenPurchaseMutation,
} from '../api/usePaymentLinkMutations'
import { useCancelMySubscriptionMutation } from '../api/useCancelMySubscriptionMutation'
import { useInvoicesQuery } from '../api/useInvoicesQuery'
import {
  useClassTestQuotaAllocationsQuery,
  usePracticeQuotaAllocationsQuery,
} from '../api/useQuotaAllocationQueries'
import {
  useAllocateClassTestQuotaMutation,
  useAllocatePracticeQuotaMutation,
} from '../api/useQuotaAllocationMutations'
import { MyPlanCard } from '../components/MyPlanCard'
import { UsageBarsGrid } from '../components/UsageBarsGrid'
import { PlanBrowseGrid } from '../components/PlanBrowseGrid'
import { TokenTopUpPanel } from '../components/TokenTopUpPanel'
import { PaymentConfirmDialog } from '../components/PaymentConfirmDialog'
import { InvoicesTable } from '../components/InvoicesTable'
import { QuotaAllocationPanel } from '../components/QuotaAllocationPanel'
import { minutesToSeconds, QUOTA_TYPES, type RequestType, type SubscriptionPlan, type TokenTopUpState } from '../types'

type SchoolSubscriptionTab = 'plan' | 'browse' | 'quota' | 'invoices'
type QuotaAllocationTab = 'teachers' | 'students'

const DEFAULT_PAGE = 1
const EMPTY_TOKEN_STATE: TokenTopUpState = { CLASS_TEST: 0, GRADING: 0, PRACTICE: 0 }

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return undefined
}

export function SchoolAdminSubscriptionPage() {
  const [tab, setTab] = useState<SchoolSubscriptionTab>('plan')
  const [quotaTab, setQuotaTab] = useState<QuotaAllocationTab>('teachers')
  const [toast, setToast] = useState<{ text: string; tone: 'error' | 'success' } | null>(null)
  const [tokenState, setTokenState] = useState<TokenTopUpState>(EMPTY_TOKEN_STATE)
  const [pendingSelection, setPendingSelection] = useState<{ plan: SubscriptionPlan; requestType: RequestType } | null>(
    null,
  )
  const [invoicesPage, setInvoicesPage] = useState(DEFAULT_PAGE)

  const { confirm, dialog: confirmDialog } = useConfirmationDialog()

  const mySubscriptionQuery = useMySubscriptionQuery()
  const usageQuery = useMySubscriptionUsageQuery()
  const plansQuery = useSubscriptionPlansQuery(DEFAULT_PAGE, 50)
  const invoicesQuery = useInvoicesQuery(invoicesPage, 10)
  const classTestQuotaQuery = useClassTestQuotaAllocationsQuery()
  const practiceQuotaQuery = usePracticeQuotaAllocationsQuery()

  const submitRequestMutation = useSubmitSubscriptionRequestMutation()
  const requestPaymentLinkMutation = useCreatePaymentLinkForSubscriptionRequestMutation()
  const renewPaymentLinkMutation = useCreatePaymentLinkForRenewalMutation()
  const tokenPaymentLinkMutation = useCreatePaymentLinkForTokenPurchaseMutation()
  const cancelMutation = useCancelMySubscriptionMutation()
  const allocateClassTestQuotaMutation = useAllocateClassTestQuotaMutation()
  const allocatePracticeQuotaMutation = useAllocatePracticeQuotaMutation()

  const subscription = mySubscriptionQuery.data ?? null
  const activePlans = (plansQuery.data?.content ?? []).filter((plan) => plan.status === 'ACTIVE')
  const isRegisteringOrPaying = submitRequestMutation.isPending || requestPaymentLinkMutation.isPending

  function updateTokenQuantity(quotaType: (typeof QUOTA_TYPES)[number], minutes: number) {
    setTokenState((current) => ({ ...current, [quotaType]: minutes }))
  }

  async function handleRenew() {
    if (!subscription) {
      return
    }

    try {
      const result = await renewPaymentLinkMutation.mutateAsync(subscription.id)
      window.location.href = result.data.checkoutUrl
    } catch (error) {
      setToast({ text: getErrorMessage(error) ?? 'Không thể tạo link thanh toán gia hạn.', tone: 'error' })
    }
  }

  async function handleCancel() {
    if (!subscription) {
      return
    }

    const confirmed = await confirm({
      confirmLabel: 'Hủy gói',
      message: 'Gói dịch vụ hiện tại sẽ bị hủy ngay lập tức. Hành động này không thể hoàn tác.',
      title: 'Hủy gói đăng ký',
    })

    if (!confirmed) {
      return
    }

    try {
      await cancelMutation.mutateAsync(subscription.id)
      setToast({ text: 'Đã hủy gói dịch vụ', tone: 'success' })
    } catch (error) {
      setToast({ text: getErrorMessage(error) ?? 'Không thể hủy gói.', tone: 'error' })
    }
  }

  function handleSelectPlan(plan: SubscriptionPlan, requestType: RequestType) {
    setPendingSelection({ plan, requestType })
  }

  async function handleConfirmSelection() {
    if (!pendingSelection) {
      return
    }

    try {
      const submitResult = await submitRequestMutation.mutateAsync({
        currentPlanId: subscription?.planId ?? null,
        requestedPlanId: pendingSelection.plan.id,
        requestType: pendingSelection.requestType,
      })
      const linkResult = await requestPaymentLinkMutation.mutateAsync(submitResult.data.id)
      window.location.href = linkResult.data.checkoutUrl
    } catch (error) {
      setToast({ text: getErrorMessage(error) ?? 'Không thể tạo yêu cầu / link thanh toán.', tone: 'error' })
      setPendingSelection(null)
    }
  }

  async function handleBuyTokens() {
    if (!subscription) {
      return
    }

    const items = QUOTA_TYPES.filter((quotaType) => tokenState[quotaType] > 0).map((quotaType) => ({
      quantity: minutesToSeconds(tokenState[quotaType]),
      quotaType,
    }))

    if (items.length === 0) {
      setToast({ text: 'Chọn số phút cần mua thêm', tone: 'error' })
      return
    }

    try {
      const result = await tokenPaymentLinkMutation.mutateAsync({ items, subscriptionId: subscription.id })
      window.location.href = result.data.checkoutUrl
    } catch (error) {
      setToast({ text: getErrorMessage(error) ?? 'Không thể tạo link thanh toán mua token.', tone: 'error' })
    }
  }

  async function handleAllocateClassTestQuota(payload: Parameters<typeof allocateClassTestQuotaMutation.mutateAsync>[0]) {
    try {
      await allocateClassTestQuotaMutation.mutateAsync(payload)
      setToast({ text: 'Đã cập nhật phân bổ hạn mức kiểm tra lớp', tone: 'success' })
    } catch (error) {
      setToast({ text: getErrorMessage(error) ?? 'Không thể phân bổ hạn mức kiểm tra lớp.', tone: 'error' })
    }
  }

  async function handleAllocatePracticeQuota(payload: Parameters<typeof allocatePracticeQuotaMutation.mutateAsync>[0]) {
    try {
      await allocatePracticeQuotaMutation.mutateAsync(payload)
      setToast({ text: 'Đã cập nhật phân bổ hạn mức luyện tập', tone: 'success' })
    } catch (error) {
      setToast({ text: getErrorMessage(error) ?? 'Không thể phân bổ hạn mức luyện tập.', tone: 'error' })
    }
  }

  return (
    <section aria-labelledby="school-admin-subscription-title" className="grid gap-6">
      <div>
        <h1 className="text-[26px] font-extrabold tracking-tight text-blue-950" id="school-admin-subscription-title">
          Gói dịch vụ của trường
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Xem gói hiện tại, hạn mức còn lại theo 3 tiêu chí, đăng ký hoặc nâng cấp gói mới.
        </p>
      </div>

      <TabPillGroup
        items={[
          { icon: <Diamond className="size-4" />, label: 'Gói của tôi', value: 'plan' },
          { icon: <ShoppingBag className="size-4" />, label: 'Đăng ký / Nâng cấp', value: 'browse' },
          { icon: <Users className="size-4" />, label: 'Phân bổ hạn mức', value: 'quota' },
          { icon: <Receipt className="size-4" />, label: 'Hóa đơn', value: 'invoices' },
        ]}
        onChange={setTab}
        value={tab}
      />

      {tab === 'plan' ? (
        <div className="grid gap-6">
          <MyPlanCard
            isCancelling={cancelMutation.isPending}
            isLoading={mySubscriptionQuery.isLoading}
            isRenewing={renewPaymentLinkMutation.isPending}
            onCancel={() => void handleCancel()}
            onGoBrowse={() => setTab('browse')}
            onRenew={() => void handleRenew()}
            subscription={subscription}
          />
          {subscription?.plan ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-[17px] font-extrabold text-blue-950">Mức sử dụng</h2>
              <div className="mt-4">
                <UsageBarsGrid isLoading={usageQuery.isLoading} usage={usageQuery.data ?? []} />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === 'browse' ? (
        <div className="grid gap-7">
          <PlanBrowseGrid
            currentSubscription={subscription}
            isLoading={plansQuery.isLoading}
            onSelect={handleSelectPlan}
            plans={activePlans}
          />

          {subscription?.status === 'ACTIVE' && subscription.plan ? (
            <TokenTopUpPanel
              isSubmitting={tokenPaymentLinkMutation.isPending}
              onChange={updateTokenQuantity}
              onSubmit={() => void handleBuyTokens()}
              plan={subscription.plan}
              state={tokenState}
            />
          ) : null}
        </div>
      ) : null}

      {tab === 'quota' ? (
        <div className="grid gap-5">
          <TabPillGroup
            items={[
              { label: 'Giáo viên - Kiểm tra lớp', value: 'teachers' },
              { label: 'Học sinh - Luyện tập', value: 'students' },
            ]}
            onChange={setQuotaTab}
            value={quotaTab}
          />

          {quotaTab === 'teachers' ? (
            <QuotaAllocationPanel
              errorMessage={getErrorMessage(classTestQuotaQuery.error)}
              isError={classTestQuotaQuery.isError}
              isLoading={classTestQuotaQuery.isLoading}
              isSubmitting={allocateClassTestQuotaMutation.isPending}
              onSubmit={(payload) => void handleAllocateClassTestQuota(payload)}
              summary={classTestQuotaQuery.data}
              userLabel="giáo viên"
            />
          ) : (
            <QuotaAllocationPanel
              errorMessage={getErrorMessage(practiceQuotaQuery.error)}
              isError={practiceQuotaQuery.isError}
              isLoading={practiceQuotaQuery.isLoading}
              isSubmitting={allocatePracticeQuotaMutation.isPending}
              onSubmit={(payload) => void handleAllocatePracticeQuota(payload)}
              summary={practiceQuotaQuery.data}
              userLabel="học sinh"
            />
          )}
        </div>
      ) : null}

      {tab === 'invoices' ? (
        <InvoicesTable
          errorMessage={getErrorMessage(invoicesQuery.error)}
          footer={
            <Pagination
              currentPage={invoicesPage}
              itemName="hóa đơn"
              onPageChange={setInvoicesPage}
              totalElements={invoicesQuery.data?.totalElements ?? 0}
              totalPages={invoicesQuery.data?.totalPages ?? 0}
            />
          }
          invoices={invoicesQuery.data?.content ?? []}
          isError={invoicesQuery.isError}
          isLoading={invoicesQuery.isLoading}
          onRetry={() => void invoicesQuery.refetch()}
        />
      ) : null}

      <PaymentConfirmDialog
        isSubmitting={isRegisteringOrPaying}
        onCancel={() => setPendingSelection(null)}
        onConfirm={() => void handleConfirmSelection()}
        plan={pendingSelection?.plan ?? null}
        requestType={pendingSelection?.requestType ?? 'REGISTRATION'}
      />

      {confirmDialog}

      <FeedbackToast message={toast?.text ?? null} onClose={() => setToast(null)} tone={toast?.tone ?? 'success'} />
    </section>
  )
}
