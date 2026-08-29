import { useState } from 'react'
import { useNavigate } from 'react-router'
import { TabPillGroup } from '@/shared/ui/TabPill'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { useConfirmationDialog } from '@/shared/ui/useConfirmationDialog'
import { useFeedbackToast } from '@/shared/ui/useFeedbackToast'
import { usePlaceRenewalOrderMutation } from '@/features/order_school'
import { useMySubscriptionQuery } from '../api/useMySubscriptionQuery'
import { useMySubscriptionUsageQuery } from '../api/useMySubscriptionUsageQuery'
import { useRenewalPreviewQuery } from '../api/useRenewalPreviewQuery'
import { useCancelMySubscriptionMutation } from '../api/useCancelMySubscriptionMutation'
import {
  useClassTestQuotaAllocationsQuery,
  usePracticeQuotaAllocationsQuery,
} from '../api/useQuotaAllocationQueries'
import {
  useAllocateClassTestQuotaMutation,
  useAllocatePracticeQuotaMutation,
} from '../api/useQuotaAllocationMutations'
import { MyPlanCard } from '../components/MyPlanCard'
import { PlanRenewalDialog } from '../components/PlanRenewalDialog'
import { QuotaAllocationPanel } from '../components/QuotaAllocationPanel'
import { SUBSCRIPTION_PLANS_PATH } from '../routes'

type QuotaAllocationTab = 'teachers' | 'students'

function getErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return undefined
}

export function MySubscriptionPage() {
  const navigate = useNavigate()
  const { confirm, dialog: confirmDialog } = useConfirmationDialog()
  const { feedbackToast, showError, showSuccess } = useFeedbackToast()

  const [quotaTab, setQuotaTab] = useState<QuotaAllocationTab>('teachers')
  const [isRenewalOpen, setRenewalOpen] = useState(false)

  const mySubscriptionQuery = useMySubscriptionQuery()
  const usageQuery = useMySubscriptionUsageQuery()
  const renewalPreviewQuery = useRenewalPreviewQuery(isRenewalOpen)
  const classTestQuotaQuery = useClassTestQuotaAllocationsQuery()
  const practiceQuotaQuery = usePracticeQuotaAllocationsQuery()

  const placeRenewalOrder = usePlaceRenewalOrderMutation()
  const cancelMutation = useCancelMySubscriptionMutation()
  const allocateClassTestQuotaMutation = useAllocateClassTestQuotaMutation()
  const allocatePracticeQuotaMutation = useAllocatePracticeQuotaMutation()

  const subscription = mySubscriptionQuery.data ?? null

  async function handleConfirmRenewal(acceptedPlanId: string) {
    try {
      const orderId = await placeRenewalOrder.mutateAsync(acceptedPlanId)
      setRenewalOpen(false)
      navigate(`/school-admin/orders/${orderId}`)
    } catch (error) {
      showError(getErrorMessage(error) ?? 'Không thể đặt đơn gia hạn.')
    }
  }

  async function handleCancelSubscription() {
    const confirmed = await confirm({
      confirmLabel: 'Hủy gia hạn',
      message:
        'Trường vẫn dùng gói bình thường tới hết kỳ hiện tại, chỉ là gói sẽ không tự gia hạn nữa. Không hoàn tiền.',
      title: 'Hủy gia hạn gói',
    })

    if (!confirmed) {
      return
    }

    try {
      await cancelMutation.mutateAsync()
      showSuccess('Đã ghi nhận yêu cầu không gia hạn gói.')
    } catch (error) {
      showError(getErrorMessage(error) ?? 'Không thể hủy gia hạn.')
    }
  }

  async function handleAllocateClassTestQuota(
    payload: Parameters<typeof allocateClassTestQuotaMutation.mutateAsync>[0],
  ) {
    try {
      await allocateClassTestQuotaMutation.mutateAsync(payload)
      showSuccess('Đã cập nhật phân bổ hạn mức kiểm tra')
    } catch (error) {
      showError(getErrorMessage(error) ?? 'Không thể phân bổ hạn mức kiểm tra.')
    }
  }

  async function handleAllocatePracticeQuota(
    payload: Parameters<typeof allocatePracticeQuotaMutation.mutateAsync>[0],
  ) {
    try {
      await allocatePracticeQuotaMutation.mutateAsync(payload)
      showSuccess('Đã cập nhật phân bổ hạn mức luyện tập')
    } catch (error) {
      showError(getErrorMessage(error) ?? 'Không thể phân bổ hạn mức luyện tập.')
    }
  }

  return (
    <section aria-labelledby="my-subscription-title" className="grid gap-6">
      <div>
        <h1 className="text-2xl font-black text-blue-950 sm:text-3xl" id="my-subscription-title">
          Gói của tôi
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Gói trường đang dùng, mức tiêu hạn mức và cách chia hạn mức cho từng người.
        </p>
      </div>

      <ErrorBanner
        message={
          mySubscriptionQuery.isError ? getErrorMessage(mySubscriptionQuery.error) ?? 'Không tải được gói.' : null
        }
      />

      {/*
        Mức sử dụng nằm TRONG thẻ gói chứ không phải một khối riêng bên dưới: hạn mức là thứ school
        admin theo dõi thường xuyên nhất, tách ra thì nó luôn nằm dưới màn hình đầu.
      */}
      <MyPlanCard
        isCancelling={cancelMutation.isPending}
        isLoading={mySubscriptionQuery.isLoading}
        isRenewing={placeRenewalOrder.isPending}
        isUsageLoading={usageQuery.isLoading}
        onCancel={() => void handleCancelSubscription()}
        onGoBrowse={() => navigate(SUBSCRIPTION_PLANS_PATH)}
        onRenew={() => setRenewalOpen(true)}
        subscription={subscription}
        usage={usageQuery.data ?? []}
      />

      {/*
        Phân bổ hạn mức sống ở trang này, không phải một mục điều hướng thứ ba: nó chia ví của CHÍNH
        gói đang chạy, nên chỉ có nghĩa khi trường đã có gói.
      */}
      {subscription?.plan ? (
        <div className="grid gap-4">
          <div>
            <h2 className="text-[17px] font-bold text-blue-950">Phân bổ hạn mức</h2>
            <p className="mt-1 text-sm text-slate-500">
              Chia ví của trường thành trần chi cho từng người. Không có tên ở đây nghĩa là không bị chặn riêng, chỉ ví
              của trường áp dụng.
            </p>
          </div>

          <TabPillGroup
            items={[
              { label: 'Giáo viên · Bài kiểm tra', value: 'teachers' },
              { label: 'Học sinh · Ôn luyện', value: 'students' },
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

      <PlanRenewalDialog
        errorMessage={renewalPreviewQuery.isError ? getErrorMessage(renewalPreviewQuery.error) : undefined}
        isLoading={renewalPreviewQuery.isLoading}
        isOpen={isRenewalOpen}
        isSubmitting={placeRenewalOrder.isPending}
        onClose={() => setRenewalOpen(false)}
        onConfirm={(acceptedPlanId) => void handleConfirmRenewal(acceptedPlanId)}
        preview={renewalPreviewQuery.data ?? null}
      />

      {confirmDialog}
      {feedbackToast}
    </section>
  )
}
