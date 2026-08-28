import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { CalendarRange, Plus } from 'lucide-react'
import { ErrorBanner } from '@/shared/ui/ErrorBanner'
import { useConfirmationDialog } from '@/shared/ui/useConfirmationDialog'
import { useFeedbackToast } from '@/shared/ui/useFeedbackToast'
import {
  useArchivePlanMutation,
  useCreatePlanMutation,
  useDeleteDraftPlanMutation,
  usePublishPlanMutation,
  useUpdatePlanMutation,
  useUpdatePlanReplacementMutation,
} from '../api/usePlanMutations'
import { useSubscriptionPlansQuery } from '../api/useSubscriptionPlansQuery'
import { ArchivePlanDialog } from '../components/ArchivePlanDialog'
import { PlanCatalogTable } from '../components/PlanCatalogTable'
import { PlanEditorDrawer } from '../components/PlanEditorDrawer'
import { SubscriptionPagination } from '../components/SubscriptionPagination'
import type {
  CreateSubscriptionPlanPayload,
  SubscriptionPlan,
  SubscriptionPlanPeriod,
  SubscriptionPlanStatus,
} from '../types'
import { formatPeriod, getErrorMessage } from '../types'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 20

type StatusFilter = 'ALL' | SubscriptionPlanStatus
type PeriodFilter = 'ALL' | SubscriptionPlanPeriod

const STATUS_FILTERS: Array<{ label: string; value: StatusFilter }> = [
  { label: 'Tất cả', value: 'ALL' },
  { label: 'Đang bán', value: 'ACTIVE' },
  { label: 'Nháp', value: 'DRAFT' },
  { label: 'Ngừng bán', value: 'ARCHIVED' },
]

const PERIOD_FILTERS: Array<{ label: string; value: PeriodFilter }> = [
  { label: 'Mọi chu kỳ', value: 'ALL' },
  { label: 'Theo ngày', value: 'DAY' },
  { label: 'Theo tháng', value: 'MONTH' },
  { label: 'Theo năm', value: 'YEAR' },
]

export function SubscriptionPlanCatalogPage() {
  const navigate = useNavigate()
  const { dialog: confirmationDialog, confirm, confirmWithSelection } = useConfirmationDialog()
  const { feedbackToast, showError, showSuccess } = useFeedbackToast()

  const [page, setPage] = useState(DEFAULT_PAGE)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('ALL')
  const [editorPlan, setEditorPlan] = useState<SubscriptionPlan | null>(null)
  const [isEditorOpen, setEditorOpen] = useState(false)
  const [archiveTarget, setArchiveTarget] = useState<SubscriptionPlan | null>(null)

  const plansQuery = useSubscriptionPlansQuery(page, pageSize)
  const createMutation = useCreatePlanMutation()
  const updateMutation = useUpdatePlanMutation()
  const publishMutation = usePublishPlanMutation()
  const archiveMutation = useArchivePlanMutation()
  const deleteDraftMutation = useDeleteDraftPlanMutation()
  const replacementMutation = useUpdatePlanReplacementMutation()

  const items = useMemo(() => plansQuery.data?.content ?? [], [plansQuery.data])

  // Lọc ở CLIENT vì subscriptionPlans chưa nhận bộ lọc nào — chỉ đúng trong phạm vi trang hiện tại.
  // Khi danh mục nhiều hơn một trang thì phải đẩy hai bộ lọc này xuống BE, nếu không con số trên pill
  // và danh sách bên dưới sẽ nói hai chuyện khác nhau.
  const visibleItems = useMemo(
    () =>
      items.filter(({ subscription }) => {
        const matchesStatus = statusFilter === 'ALL' || subscription.status === statusFilter
        const matchesPeriod = periodFilter === 'ALL' || subscription.periodType === periodFilter
        return matchesStatus && matchesPeriod
      }),
    [items, periodFilter, statusFilter],
  )

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = { ACTIVE: 0, ALL: items.length, ARCHIVED: 0, DRAFT: 0 }
    for (const { subscription } of items) {
      counts[subscription.status] += 1
    }
    return counts
  }, [items])

  const planNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const { subscription } of items) {
      map.set(subscription.id, `${subscription.name} · ${formatPeriod(subscription.periodType, subscription.periodCount)}`)
    }
    return map
  }, [items])

  const activePlanOptions = useMemo(
    () =>
      items
        .filter(({ subscription }) => subscription.status === 'ACTIVE')
        .map(({ subscription }) => ({
          label: planNameById.get(subscription.id) ?? subscription.name,
          value: subscription.id,
        })),
    [items, planNameById],
  )

  function openCreate() {
    setEditorPlan(null)
    setEditorOpen(true)
  }

  function openEdit(plan: SubscriptionPlan) {
    setEditorPlan(plan)
    setEditorOpen(true)
  }

  async function handleCreate(payload: CreateSubscriptionPlanPayload) {
    try {
      const result = await createMutation.mutateAsync(payload)
      setEditorOpen(false)
      showSuccess(result.message || 'Tạo gói thành công. Gói đang ở trạng thái nháp.')
    } catch (error) {
      showError(getErrorMessage(error))
    }
  }

  async function handleUpdate(id: string, payload: CreateSubscriptionPlanPayload) {
    try {
      await updateMutation.mutateAsync({ id, payload })
      setEditorOpen(false)
      showSuccess('Cập nhật gói thành công.')
    } catch (error) {
      showError(getErrorMessage(error))
    }
  }

  async function handlePublish(plan: SubscriptionPlan) {
    const confirmed = await confirm({
      confirmLabel: 'Xuất bản',
      message: `Xuất bản gói "${plan.name}"? Sau khi xuất bản, trường có thể đăng ký gói này.`,
      title: 'Xuất bản gói',
    })

    if (!confirmed) {
      return
    }

    try {
      const result = await publishMutation.mutateAsync(plan.id)
      showSuccess(result.message || 'Xuất bản gói thành công.')
    } catch (error) {
      showError(getErrorMessage(error))
    }
  }

  async function handleDeleteDraft(plan: SubscriptionPlan) {
    const confirmed = await confirm({
      confirmLabel: 'Xóa',
      message: `Xóa gói nháp "${plan.name}"? Thao tác này không hoàn tác được.`,
      title: 'Xóa gói nháp',
    })

    if (!confirmed) {
      return
    }

    try {
      await deleteDraftMutation.mutateAsync(plan.id)
      showSuccess('Đã xóa gói nháp.')
    } catch (error) {
      showError(getErrorMessage(error))
    }
  }

  async function handleArchiveConfirm(replacedByPlanId: string | null) {
    if (!archiveTarget) {
      return
    }

    try {
      const result = await archiveMutation.mutateAsync({ id: archiveTarget.id, replacedByPlanId })
      setArchiveTarget(null)
      showSuccess(result.message || 'Đã ngừng bán gói.')
    } catch (error) {
      showError(getErrorMessage(error))
    }
  }

  async function handleUpdateReplacement(plan: SubscriptionPlan) {
    const options = activePlanOptions.filter((option) => option.value !== plan.id)

    if (options.length === 0) {
      showError('Chưa có gói nào đang bán để làm gói thay thế.')
      return
    }

    const { confirmed, selection } = await confirmWithSelection({
      confirmLabel: 'Cập nhật',
      message: `Chọn gói mà trường đang dùng "${plan.name}" sẽ chuyển sang khi gia hạn.`,
      selectLabel: 'Gói thay thế',
      selectOptions: options,
      title: 'Đổi gói thay thế',
    })

    if (!confirmed || !selection) {
      return
    }

    try {
      const result = await replacementMutation.mutateAsync({ id: plan.id, replacedByPlanId: selection })
      showSuccess(result.message || 'Đã cập nhật gói thay thế.')
    } catch (error) {
      showError(getErrorMessage(error))
    }
  }

  const isMutating =
    createMutation.isPending ||
    updateMutation.isPending ||
    publishMutation.isPending ||
    archiveMutation.isPending ||
    deleteDraftMutation.isPending ||
    replacementMutation.isPending

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-3xl font-black tracking-tight text-blue-950">Danh mục gói</h1>
          <p className="text-sm font-medium text-slate-500">
            Gói bán cho trường. Mỗi chu kỳ là một gói riêng — đổi giá thì tạo gói mới rồi trỏ thay thế.
          </p>
        </div>
        <button
          className="inline-flex h-11 items-center gap-2 rounded-full bg-indigo-600 px-6 text-sm font-bold text-white transition hover:bg-indigo-700"
          onClick={openCreate}
          type="button"
        >
          <Plus aria-hidden="true" className="size-4" />
          Tạo gói
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((option) => (
            <button
              className={`inline-flex h-9 items-center rounded-full px-4 text-xs font-bold transition ${
                statusFilter === option.value
                  ? 'bg-indigo-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
              key={option.value}
              onClick={() => setStatusFilter(option.value)}
              type="button"
            >
              {option.label} · {statusCounts[option.value]}
            </button>
          ))}
        </div>

        <label className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5">
          <CalendarRange aria-hidden="true" className="size-4 text-slate-400" />
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
      </div>

      <ErrorBanner message={plansQuery.isError ? getErrorMessage(plansQuery.error) : null} />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <PlanCatalogTable
          isLoading={plansQuery.isLoading}
          items={visibleItems}
          onArchive={setArchiveTarget}
          onDeleteDraft={handleDeleteDraft}
          onEdit={openEdit}
          onOpenDetail={(plan) => navigate(`/system-admin/subscription/plans/${plan.id}`)}
          onPublish={handlePublish}
          onUpdateReplacement={handleUpdateReplacement}
          planNameById={planNameById}
        />
        <SubscriptionPagination
          isDisabled={plansQuery.isFetching}
          itemNoun="gói"
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(DEFAULT_PAGE)
          }}
          page={page}
          pageSize={pageSize}
          totalElements={plansQuery.data?.totalElements ?? 0}
          totalPages={plansQuery.data?.totalPages ?? 0}
        />
      </section>

      {isEditorOpen ? (
        <PlanEditorDrawer
          isOpen={isEditorOpen}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
          key={editorPlan?.id ?? 'new'}
          onClose={() => setEditorOpen(false)}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          plan={editorPlan}
        />
      ) : null}

      <ArchivePlanDialog
        activeSchoolCount={0}
        isOpen={Boolean(archiveTarget)}
        isSubmitting={archiveMutation.isPending}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchiveConfirm}
        plan={archiveTarget}
        replacementOptions={activePlanOptions.filter((option) => option.value !== archiveTarget?.id)}
      />

      {isMutating ? <span className="sr-only">Đang xử lý…</span> : null}
      {confirmationDialog}
      {feedbackToast}
    </div>
  )
}
