import { useState } from 'react'
import { AlertTriangle, Diamond, Receipt, ShoppingBag, Users } from 'lucide-react'
import { TabPillGroup } from '@/shared/ui/TabPill'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { useConfirmationDialog } from '@/shared/ui/useConfirmationDialog'
import { Pagination } from '@/shared/components/Pagination'
import { goToCheckout } from '@/shared/payment/checkout'
import {
  DEFAULT_PAYMENT_METHOD,
  isPaymentMethod,
  PAYMENT_METHOD_OPTIONS,
  type PaymentMethod,
} from '@/shared/payment/types'
import { useQuotaPricingQuery } from '@/features/subscription_system/api/useQuotaPricingQuery'
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
  usePreviewRenewalMutation,
} from '../api/usePaymentLinkMutations'
import { useCancelMySubscriptionMutation } from '../api/useCancelMySubscriptionMutation'
import { useInvoicesQuery } from '../api/useInvoicesQuery'
import { useMyDebtEventsQuery } from '../api/useMyDebtEventsQuery'
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
import { PlanChangeConfirmDialog } from '../components/PlanChangeConfirmDialog'
import { InvoicesTable } from '../components/InvoicesTable'
import { DebtEventsTable } from '../components/DebtEventsTable'
import { QuotaAllocationPanel } from '../components/QuotaAllocationPanel'
import {
  formatVnd,
  QUOTA_TYPES,
  type RenewalPreview,
  type RequestType,
  type SubscriptionPlan,
  type TokenTopUpState,
} from '../types'

type SchoolSubscriptionTab = 'plan' | 'browse' | 'quota' | 'invoices' | 'debt'
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
  const [renewalPreview, setRenewalPreview] = useState<RenewalPreview | null>(null)
  const [invoicesPage, setInvoicesPage] = useState(DEFAULT_PAGE)
  const [debtEventsPage, setDebtEventsPage] = useState(DEFAULT_PAGE)
  // Một state duy nhất cho mọi luồng thanh toán trên trang: người dùng chọn cổng ở đâu thì các
  // luồng còn lại cũng ghi nhớ lựa chọn đó, khỏi phải chọn lại từ đầu mỗi lần.
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(DEFAULT_PAYMENT_METHOD)

  const { confirm, confirmWithSelection, dialog: confirmDialog } = useConfirmationDialog()

  const mySubscriptionQuery = useMySubscriptionQuery()
  const usageQuery = useMySubscriptionUsageQuery()
  const quotaPricingQuery = useQuotaPricingQuery()
  const plansQuery = useSubscriptionPlansQuery(DEFAULT_PAGE, 50)
  const invoicesQuery = useInvoicesQuery(invoicesPage, 10)
  const debtEventsQuery = useMyDebtEventsQuery(debtEventsPage, 10)
  const classTestQuotaQuery = useClassTestQuotaAllocationsQuery()
  const practiceQuotaQuery = usePracticeQuotaAllocationsQuery()

  const submitRequestMutation = useSubmitSubscriptionRequestMutation()
  const requestPaymentLinkMutation = useCreatePaymentLinkForSubscriptionRequestMutation()
  const previewRenewalMutation = usePreviewRenewalMutation()
  const renewPaymentLinkMutation = useCreatePaymentLinkForRenewalMutation()
  const tokenPaymentLinkMutation = useCreatePaymentLinkForTokenPurchaseMutation()
  const cancelMutation = useCancelMySubscriptionMutation()
  const allocateClassTestQuotaMutation = useAllocateClassTestQuotaMutation()
  const allocatePracticeQuotaMutation = useAllocatePracticeQuotaMutation()

  const subscription = mySubscriptionQuery.data ?? null
  const activePlans = (plansQuery.data?.content ?? []).filter((plan) => plan.status === 'ACTIVE')
  const isRegisteringOrPaying = submitRequestMutation.isPending || requestPaymentLinkMutation.isPending

  function updateTokenQuantity(quotaType: (typeof QUOTA_TYPES)[number], amountUsd: number) {
    setTokenState((current) => ({ ...current, [quotaType]: amountUsd }))
  }

  async function handleRenew() {
    if (!subscription) {
      return
    }

    try {
      const preview = await previewRenewalMutation.mutateAsync(subscription.id)

      // Gói đã đổi thì hộp thoại so sánh gói lo luôn việc chọn cổng — hỏi ở đây nữa là hỏi hai lần.
      if (preview.data.planChanged) {
        setRenewalPreview(preview.data)
        return
      }

      const { confirmed, selection } = await confirmWithSelection({
        confirmLabel: 'Tiếp tục thanh toán',
        message: `Gia hạn gói ${preview.data.renewalPlan.name} với giá ${formatVnd(preview.data.renewalPlan.pricePerYear)}. Gói được gia hạn tự động ngay sau khi thanh toán thành công.`,
        selectLabel: 'Cổng thanh toán',
        selectOptions: PAYMENT_METHOD_OPTIONS,
        selectPlaceholder: 'Chọn cổng thanh toán',
        title: 'Gia hạn gói dịch vụ',
      })

      if (!confirmed) {
        return
      }

      if (!isPaymentMethod(selection)) {
        setToast({ text: 'Chọn cổng thanh toán để tiếp tục.', tone: 'error' })
        return
      }

      setPaymentMethod(selection)
      const result = await renewPaymentLinkMutation.mutateAsync({
        paymentMethod: selection,
        subscriptionId: subscription.id,
      })
      goToCheckout(result.data)
    } catch (error) {
      setToast({ text: getErrorMessage(error) ?? 'Không thể tạo link thanh toán gia hạn.', tone: 'error' })
    }
  }

  async function handleConfirmPlanChange() {
    if (!subscription || !renewalPreview) {
      return
    }

    try {
      const result = await renewPaymentLinkMutation.mutateAsync({
        acceptedPlanId: renewalPreview.renewalPlan.id,
        paymentMethod,
        subscriptionId: subscription.id,
      })

      // Bù trừ ngày chưa dùng đã chi trả đủ 100% giá gói mới -- BE chốt PAID ngay, không có cổng nào
      // để điều hướng sang (xem CreatePaymentLinkForRenewalUseCase).
      if (result.data.action === 'NONE') {
        setToast({ text: 'Đã bù đủ 100% — gia hạn miễn phí thành công.', tone: 'success' })
        setRenewalPreview(null)
        void mySubscriptionQuery.refetch()
        return
      }

      goToCheckout(result.data)
    } catch (error) {
      setToast({ text: getErrorMessage(error) ?? 'Không thể tạo link thanh toán gia hạn.', tone: 'error' })
      setRenewalPreview(null)
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
      const linkResult = await requestPaymentLinkMutation.mutateAsync({
        paymentMethod,
        requestId: submitResult.data.id,
      })
      goToCheckout(linkResult.data)
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
      quantity: tokenState[quotaType],
      quotaType,
    }))

    if (items.length === 0) {
      setToast({ text: 'Chọn số tiền cần mua thêm', tone: 'error' })
      return
    }

    try {
      const result = await tokenPaymentLinkMutation.mutateAsync({
        items,
        paymentMethod,
        subscriptionId: subscription.id,
      })
      goToCheckout(result.data)
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
        <h1 className="text-2xl font-black text-blue-950 sm:text-3xl" id="school-admin-subscription-title">
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
          { icon: <AlertTriangle className="size-4" />, label: 'Lịch sử nợ', value: 'debt' },
        ]}
        onChange={setTab}
        value={tab}
      />

      {tab === 'plan' ? (
        <div className="grid gap-6">
          <MyPlanCard
            isCancelling={cancelMutation.isPending}
            isLoading={mySubscriptionQuery.isLoading}
            isRenewing={previewRenewalMutation.isPending || renewPaymentLinkMutation.isPending}
            onCancel={() => void handleCancel()}
            onGoBrowse={() => setTab('browse')}
            onRenew={() => void handleRenew()}
            subscription={subscription}
          />
          {subscription?.plan ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-black text-blue-950">Mức sử dụng</h2>
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
              onPaymentMethodChange={setPaymentMethod}
              onSubmit={() => void handleBuyTokens()}
              paymentMethod={paymentMethod}
              plan={subscription.plan}
              state={tokenState}
              usdToVndRate={quotaPricingQuery.data?.usdToVndRate}
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
              key="teachers"
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
              key="students"
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

      {tab === 'debt' ? (
        <DebtEventsTable
          errorMessage={getErrorMessage(debtEventsQuery.error)}
          events={debtEventsQuery.data?.content ?? []}
          footer={
            <Pagination
              currentPage={debtEventsPage}
              itemName="sự kiện"
              onPageChange={setDebtEventsPage}
              totalElements={debtEventsQuery.data?.totalElements ?? 0}
              totalPages={debtEventsQuery.data?.totalPages ?? 0}
            />
          }
          isError={debtEventsQuery.isError}
          isLoading={debtEventsQuery.isLoading}
          onRetry={() => void debtEventsQuery.refetch()}
        />
      ) : null}

      <PaymentConfirmDialog
        isSubmitting={isRegisteringOrPaying}
        onCancel={() => setPendingSelection(null)}
        onConfirm={() => void handleConfirmSelection()}
        onPaymentMethodChange={setPaymentMethod}
        paymentMethod={paymentMethod}
        plan={pendingSelection?.plan ?? null}
        requestType={pendingSelection?.requestType ?? 'REGISTRATION'}
      />

      <PlanChangeConfirmDialog
        isSubmitting={renewPaymentLinkMutation.isPending}
        onCancel={() => setRenewalPreview(null)}
        onConfirm={() => void handleConfirmPlanChange()}
        onPaymentMethodChange={setPaymentMethod}
        paymentMethod={paymentMethod}
        preview={renewalPreview}
      />

      {confirmDialog}

      <FeedbackToast message={toast?.text ?? null} onClose={() => setToast(null)} tone={toast?.tone ?? 'success'} />
    </section>
  )
}
