import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useParams } from 'react-router'
import { Archive, BadgeCheck, ChevronLeft, Pencil } from 'lucide-react'
import { useAppSelector } from '@/app/store/hooks'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { canManageFramework, getFrameworkActorRole } from '../permissions'
import { frameworkQueryKeys } from '../api/useFrameworksQuery'
import { useFrameworkVersionQuery } from '../api/useFrameworkVersionQuery'
import {
  useCreateFrameworkCriteriaMutation,
  useCreateFrameworkCriterionBandsMutation,
  useCreateFrameworkResultBandsMutation,
  useDeleteFrameworkCriterionBandMutation,
  useDeleteFrameworkCriterionMutation,
  useDeleteFrameworkResultBandMutation,
  useUpdateFrameworkCriterionBandMutation,
  useUpdateFrameworkCriterionMutation,
  useUpdateFrameworkResultBandMutation,
  useUpdateFrameworkVersionMutation,
  useUpdateFrameworkVersionStatusMutation,
} from '../api/useFrameworkVersionMutations'
import { FrameworkCriteriaSection } from '../components/FrameworkCriteriaSection'
import { FrameworkCriterionBandFormDialog } from '../components/FrameworkCriterionBandFormDialog'
import { FrameworkCriterionFormDialog } from '../components/FrameworkCriterionFormDialog'
import { FrameworkDeleteConfirmDialog } from '../components/FrameworkDeleteConfirmDialog'
import { FrameworkResultBandFormDialog } from '../components/FrameworkResultBandFormDialog'
import { FrameworkResultBandsSection } from '../components/FrameworkResultBandsSection'
import { FrameworkVersionEditFormDialog } from '../components/FrameworkVersionEditFormDialog'
import { FrameworkVersionPublishDialog } from '../components/FrameworkVersionPublishDialog'
import { FrameworkVersionStatusBadge } from '../components/FrameworkVersionStatusBadge'
import type {
  FrameworkCriterion,
  FrameworkCriterionBandInput,
  FrameworkCriterionInput,
  FrameworkResultBand,
  FrameworkResultBandInput,
  FrameworkSignal,
  FrameworkSignalInput,
  SignalImportance,
  UpdateFrameworkVersionRequest,
} from '../types'
import { formatFrameworkDate, formatNullableText } from '../types'

type FrameworkCriterionBand = FrameworkCriterion['bands'][number]

type PendingDelete =
  | { criterion: FrameworkCriterion; kind: 'criterion' }
  | {
      band: FrameworkCriterionBand
      criterion: FrameworkCriterion
      kind: 'criterionBand'
    }
  | { band: FrameworkResultBand; kind: 'resultBand' }

function toSignalInputs(signals: FrameworkSignal[]): FrameworkSignalInput[] {
  return signals.map((signal) => ({
    code: signal.code,
    description: signal.description ?? '',
    evidenceHint: signal.evidenceHint,
    importance: (signal.importance as SignalImportance | null) ?? 'MEDIUM',
  }))
}

function getErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }

  return undefined
}

function FrameworkVersionDetailPage({ basePath }: { basePath: string }) {
  const { frameworkId, versionId } = useParams<{
    frameworkId: string
    versionId: string
  }>()

  const queryClient = useQueryClient()
  const location = useLocation()
  const user = useAppSelector((state) => state.auth.user)
  const canManageRole = canManageFramework(getFrameworkActorRole(user?.roles))
  const isSchoolAdmin = basePath === '/school-admin'
  const versionQuery = useFrameworkVersionQuery(versionId ?? null, isSchoolAdmin)
  const version = versionQuery.data ?? null
  const canManage = canManageRole && version?.status === 'DRAFT'

  const updateVersionMutation = useUpdateFrameworkVersionMutation()
  const versionStatusMutation = useUpdateFrameworkVersionStatusMutation()
  const addCriteriaMutation = useCreateFrameworkCriteriaMutation()
  const updateCriterionMutation = useUpdateFrameworkCriterionMutation()
  const deleteCriterionMutation = useDeleteFrameworkCriterionMutation()
  const addCriterionBandsMutation = useCreateFrameworkCriterionBandsMutation()
  const updateCriterionBandMutation = useUpdateFrameworkCriterionBandMutation()
  const deleteCriterionBandMutation = useDeleteFrameworkCriterionBandMutation()
  const addResultBandsMutation = useCreateFrameworkResultBandsMutation()
  const updateResultBandMutation = useUpdateFrameworkResultBandMutation()
  const deleteResultBandMutation = useDeleteFrameworkResultBandMutation()

  const [isEditingVersion, setIsEditingVersion] = useState(false)
  const [isAddingCriterion, setIsAddingCriterion] = useState(false)
  const [editingCriterion, setEditingCriterion] =
    useState<FrameworkCriterion | null>(null)
  const [quickAddCriterionId, setQuickAddCriterionId] = useState<
    string | null
  >(null)
  const [editingCriterionBand, setEditingCriterionBand] = useState<{
    band: FrameworkCriterionBand
    criterion: FrameworkCriterion
  } | null>(null)
  const [isAddingResultBand, setIsAddingResultBand] = useState(
    Boolean((location.state as { autoEdit?: boolean } | null)?.autoEdit),
  )
  const [editingResultBand, setEditingResultBand] =
    useState<FrameworkResultBand | null>(null)
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false)
  const [publishError, setPublishError] = useState<string>()
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(
    null,
  )
  const isDeletingPending =
    pendingDelete?.kind === 'criterion'
      ? deleteCriterionMutation.isPending
      : pendingDelete?.kind === 'criterionBand'
        ? deleteCriterionBandMutation.isPending
        : pendingDelete?.kind === 'resultBand'
          ? deleteResultBandMutation.isPending
          : false
  const [statusMessage, setStatusMessage] = useState<{
    text: string
    tone: 'error' | 'success'
  } | null>(null)

  function invalidateVersion() {
    if (!versionId) {
      return
    }

    void queryClient.invalidateQueries({
      queryKey: frameworkQueryKeys.version(versionId),
    })
  }

  const quickAddCriterion =
    version?.criteria.find(
      (criterion) => criterion.id === quickAddCriterionId,
    ) ?? null
  const quickAddAvailableResultBands = quickAddCriterion
    ? (version?.resultBands ?? []).filter(
        (band) =>
          !quickAddCriterion.bands.some(
            (existing) => existing.frameworkResultBandId === band.id,
          ),
      )
    : []

  function openPublishDialog() {
    setPublishError(undefined)
    setIsPublishDialogOpen(true)
  }

  function closePublishDialog() {
    if (versionStatusMutation.isPending) {
      return
    }

    setIsPublishDialogOpen(false)
    setPublishError(undefined)
  }

  async function handlePublishVersion() {
    if (!frameworkId || !versionId) {
      return
    }

    try {
      setPublishError(undefined)
      const result = await versionStatusMutation.mutateAsync({
        frameworkId,
        payload: { status: 'PUBLISHED' },
        versionId,
      })

      invalidateVersion()
      setIsPublishDialogOpen(false)
      setStatusMessage({ text: result.message, tone: 'success' })
    } catch (error) {
      setPublishError(
        getErrorMessage(error) ??
          'Không thể xuất bản phiên bản khung đánh giá năng lực. Vui lòng thử lại.',
      )
    }
  }

  async function handleArchiveVersion() {
    if (!frameworkId || !versionId) {
      return
    }

    try {
      const result = await versionStatusMutation.mutateAsync({
        frameworkId,
        payload: { status: 'ARCHIVED' },
        versionId,
      })

      invalidateVersion()
      setStatusMessage({ text: result.message, tone: 'success' })
    } catch (error) {
      setStatusMessage({
        text:
          getErrorMessage(error) ??
          'Không thể lưu trữ phiên bản khung đánh giá năng lực. Vui lòng thử lại.',
        tone: 'error',
      })
    }
  }

  function handleEditVersion(payload: UpdateFrameworkVersionRequest) {
    if (!frameworkId || !versionId) {
      return
    }

    updateVersionMutation.mutate(
      { frameworkId, payload, versionId },
      {
        onSuccess: () => {
          invalidateVersion()
          setIsEditingVersion(false)
          updateVersionMutation.reset()
        },
      },
    )
  }

  function handleAddCriterion(payload: FrameworkCriterionInput) {
    if (!frameworkId || !versionId) {
      return
    }

    addCriteriaMutation.mutate(
      { frameworkId, payload: { criteria: [payload] }, versionId },
      {
        onSuccess: () => {
          invalidateVersion()
          setIsAddingCriterion(false)
          addCriteriaMutation.reset()
        },
      },
    )
  }

  function handleEditCriterion(payload: FrameworkCriterionInput) {
    if (!frameworkId || !versionId || !editingCriterion) {
      return
    }

    updateCriterionMutation.mutate(
      {
        criterionId: editingCriterion.id,
        frameworkId,
        payload,
        versionId,
      },
      {
        onSuccess: () => {
          invalidateVersion()
          setEditingCriterion(null)
          updateCriterionMutation.reset()
        },
      },
    )
  }

  function handleDeleteCriterion(criterion: FrameworkCriterion) {
    setPendingDelete({ criterion, kind: 'criterion' })
  }

  function handleAddCriterionBand(payload: FrameworkCriterionBandInput) {
    if (!frameworkId || !versionId || !quickAddCriterionId) {
      return
    }

    addCriterionBandsMutation.mutate(
      {
        criterionId: quickAddCriterionId,
        frameworkId,
        payload: { bands: [payload] },
        versionId,
      },
      {
        onSuccess: () => {
          invalidateVersion()
          setQuickAddCriterionId(null)
          addCriterionBandsMutation.reset()
        },
      },
    )
  }

  function handleEditCriterionBand(payload: FrameworkCriterionBandInput) {
    if (!frameworkId || !versionId || !editingCriterionBand) {
      return
    }

    updateCriterionBandMutation.mutate(
      {
        bandId: editingCriterionBand.band.id,
        criterionId: editingCriterionBand.criterion.id,
        frameworkId,
        payload: {
          descriptor: payload.descriptor,
          negativeSignals: payload.negativeSignals,
          positiveSignals: payload.positiveSignals,
        },
        versionId,
      },
      {
        onSuccess: () => {
          invalidateVersion()
          setEditingCriterionBand(null)
          updateCriterionBandMutation.reset()
        },
      },
    )
  }

  function handleDeleteCriterionBand(
    criterion: FrameworkCriterion,
    band: FrameworkCriterionBand,
  ) {
    setPendingDelete({ band, criterion, kind: 'criterionBand' })
  }

  function handleAddResultBand(payload: FrameworkResultBandInput) {
    if (!frameworkId || !versionId) {
      return
    }

    addResultBandsMutation.mutate(
      { frameworkId, payload: { bands: [payload] }, versionId },
      {
        onSuccess: () => {
          invalidateVersion()
          setIsAddingResultBand(false)
          addResultBandsMutation.reset()
        },
      },
    )
  }

  function handleEditResultBand(payload: FrameworkResultBandInput) {
    if (!frameworkId || !versionId || !editingResultBand) {
      return
    }

    updateResultBandMutation.mutate(
      { bandId: editingResultBand.id, frameworkId, payload, versionId },
      {
        onSuccess: () => {
          invalidateVersion()
          setEditingResultBand(null)
          updateResultBandMutation.reset()
        },
      },
    )
  }

  function handleDeleteResultBand(band: FrameworkResultBand) {
    setPendingDelete({ band, kind: 'resultBand' })
  }

  function closePendingDelete() {
    if (isDeletingPending) {
      return
    }

    setPendingDelete(null)
  }

  function confirmPendingDelete() {
    if (!pendingDelete || !frameworkId || !versionId) {
      return
    }

    if (pendingDelete.kind === 'criterion') {
      deleteCriterionMutation.mutate(
        { criterionId: pendingDelete.criterion.id, frameworkId, versionId },
        {
          onSuccess: () => {
            invalidateVersion()
            setPendingDelete(null)
          },
        },
      )
      return
    }

    if (pendingDelete.kind === 'criterionBand') {
      deleteCriterionBandMutation.mutate(
        {
          bandId: pendingDelete.band.id,
          criterionId: pendingDelete.criterion.id,
          frameworkId,
          versionId,
        },
        {
          onSuccess: () => {
            invalidateVersion()
            setPendingDelete(null)
          },
        },
      )
      return
    }

    deleteResultBandMutation.mutate(
      { bandId: pendingDelete.band.id, frameworkId, versionId },
      {
        onSuccess: () => {
          invalidateVersion()
          setPendingDelete(null)
        },
      },
    )
  }

  return (
    <section className="grid gap-6">
      <div>
        <Link
          className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 transition hover:text-indigo-700"
          to={`${basePath}/frameworks/${frameworkId}`}
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          Chi tiết khung đánh giá năng lực
        </Link>
      </div>

      {versionQuery.isLoading ? (
        <div className="h-36 animate-pulse rounded-lg border border-slate-200 bg-white" />
      ) : null}

      {versionQuery.isError ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-white px-6 py-12 text-center">
          <p className="text-sm font-bold text-red-600">
            {getErrorMessage(versionQuery.error) ??
              'Không thể tải thông tin phiên bản.'}
          </p>
          <button
            className="mt-4 inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
            onClick={() => void versionQuery.refetch()}
            type="button"
          >
            Thử lại
          </button>
        </div>
      ) : null}

      {!versionQuery.isLoading && version ? (
        <div className="rounded-lg border border-slate-200 bg-white px-6 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-baseline gap-2">
                <h1 className="text-2xl font-black text-blue-950">
                  {formatNullableText(version.name)}
                </h1>
                <span className="text-sm font-bold text-slate-400">
                  {formatNullableText(version.code)} · v{version.version}
                </span>
              </div>
              {version.description ? (
                <p className="mt-2 text-sm text-slate-600">
                  {version.description}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                <FrameworkVersionStatusBadge status={version.status} />
                <span>
                  Hiệu lực từ: {formatFrameworkDate(version.effectiveFrom)}
                </span>
                <span>
                  Hiệu lực đến: {formatFrameworkDate(version.effectiveTo)}
                </span>
                <span>Tạo: {formatFrameworkDate(version.createdAt)}</span>
                <span>Cập nhật: {formatFrameworkDate(version.updatedAt)}</span>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {canManageRole && version.status === 'DRAFT' ? (
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-black text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={versionStatusMutation.isPending}
                  onClick={openPublishDialog}
                  type="button"
                >
                  <BadgeCheck aria-hidden="true" className="size-4" />
                  Xuất bản
                </button>
              ) : null}
              {canManageRole && version.status === 'PUBLISHED' ? (
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={versionStatusMutation.isPending}
                  onClick={() => void handleArchiveVersion()}
                  type="button"
                >
                  <Archive aria-hidden="true" className="size-4" />
                  Lưu trữ
                </button>
              ) : null}
              {canManage ? (
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
                  onClick={() => setIsEditingVersion(true)}
                  type="button"
                >
                  <Pencil aria-hidden="true" className="size-4" />
                  Chỉnh sửa phiên bản khung đánh giá năng lực
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <FeedbackToast
        message={statusMessage?.text ?? null}
        onClose={() => setStatusMessage(null)}
        tone={statusMessage?.tone ?? 'error'}
      />

      <FrameworkVersionPublishDialog
        errorMessage={publishError}
        isSubmitting={versionStatusMutation.isPending}
        onClose={closePublishDialog}
        onConfirm={() => void handlePublishVersion()}
        version={isPublishDialogOpen ? (version ?? null) : null}
      />

      {pendingDelete ? (
        <FrameworkDeleteConfirmDialog
          isSubmitting={isDeletingPending}
          message={
            pendingDelete.kind === 'criterion'
              ? 'Tiêu chí này sẽ bị xóa. Các mức đánh giá thuộc tiêu chí cũng sẽ bị xóa. Hành động này không thể hoàn tác.'
              : pendingDelete.kind === 'criterionBand'
                ? 'Mức đánh giá này sẽ bị xóa khỏi tiêu chí. Hành động này không thể hoàn tác.'
                : 'Thang kết quả này sẽ bị xóa. Hành động này không thể hoàn tác.'
          }
          onClose={closePendingDelete}
          onConfirm={confirmPendingDelete}
          title={
            pendingDelete.kind === 'criterion'
              ? 'Xóa tiêu chí'
              : pendingDelete.kind === 'criterionBand'
                ? 'Xóa mức đánh giá'
                : 'Xóa thang kết quả'
          }
        />
      ) : null}

      {isEditingVersion && version ? (
        <FrameworkVersionEditFormDialog
          errorMessage={getErrorMessage(updateVersionMutation.error)}
          initialValues={{
            code: version.code,
            description: version.description,
            effectiveFrom: version.effectiveFrom ?? '',
            effectiveTo: version.effectiveTo,
            name: version.name,
          }}
          isOpen
          isSubmitting={updateVersionMutation.isPending}
          onClose={() => {
            setIsEditingVersion(false)
            updateVersionMutation.reset()
          }}
          onSubmit={handleEditVersion}
        />
      ) : null}

      <FrameworkResultBandsSection
        canManage={canManage}
        errorMessage={getErrorMessage(versionQuery.error)}
        isError={versionQuery.isError}
        isLoading={versionQuery.isLoading}
        onAddResultBand={() => setIsAddingResultBand(true)}
        onDeleteResultBand={handleDeleteResultBand}
        onEditResultBand={setEditingResultBand}
        onRetry={() => void versionQuery.refetch()}
        resultBands={version?.resultBands ?? []}
      />

      <FrameworkCriteriaSection
        canManage={canManage}
        criteria={version?.criteria ?? []}
        errorMessage={getErrorMessage(versionQuery.error)}
        isError={versionQuery.isError}
        isLoading={versionQuery.isLoading}
        onAddCriterion={() => setIsAddingCriterion(true)}
        onAddCriterionBand={setQuickAddCriterionId}
        onDeleteCriterion={handleDeleteCriterion}
        onDeleteCriterionBand={handleDeleteCriterionBand}
        onEditCriterion={setEditingCriterion}
        onEditCriterionBand={(criterion, band) =>
          setEditingCriterionBand({ band, criterion })
        }
        onRetry={() => void versionQuery.refetch()}
        resultBands={version?.resultBands ?? []}
      />

      {isAddingCriterion ? (
        <FrameworkCriterionFormDialog
          errorMessage={getErrorMessage(addCriteriaMutation.error)}
          isOpen
          isSubmitting={addCriteriaMutation.isPending}
          onClose={() => {
            setIsAddingCriterion(false)
            addCriteriaMutation.reset()
          }}
          onSubmit={handleAddCriterion}
        />
      ) : null}

      {editingCriterion ? (
        <FrameworkCriterionFormDialog
          errorMessage={getErrorMessage(updateCriterionMutation.error)}
          initialValues={{
            code: editingCriterion.code,
            description: editingCriterion.description,
            name: editingCriterion.name,
            order: editingCriterion.order,
          }}
          isOpen
          isSubmitting={updateCriterionMutation.isPending}
          onClose={() => {
            setEditingCriterion(null)
            updateCriterionMutation.reset()
          }}
          onSubmit={handleEditCriterion}
        />
      ) : null}

      {quickAddCriterion ? (
        <FrameworkCriterionBandFormDialog
          availableResultBands={quickAddAvailableResultBands}
          criterionCode={quickAddCriterion.code}
          errorMessage={getErrorMessage(addCriterionBandsMutation.error)}
          isOpen
          isSubmitting={addCriterionBandsMutation.isPending}
          onClose={() => {
            setQuickAddCriterionId(null)
            addCriterionBandsMutation.reset()
          }}
          onSubmit={handleAddCriterionBand}
        />
      ) : null}

      {editingCriterionBand ? (
        <FrameworkCriterionBandFormDialog
          availableResultBands={[]}
          criterionCode={editingCriterionBand.criterion.code}
          errorMessage={getErrorMessage(updateCriterionBandMutation.error)}
          initialValues={{
            descriptor: editingCriterionBand.band.descriptor,
            negativeSignals: toSignalInputs(
              editingCriterionBand.band.negativeSignals?.values ?? [],
            ),
            positiveSignals: toSignalInputs(
              editingCriterionBand.band.positiveSignals?.values ?? [],
            ),
          }}
          isOpen
          isSubmitting={updateCriterionBandMutation.isPending}
          onClose={() => {
            setEditingCriterionBand(null)
            updateCriterionBandMutation.reset()
          }}
          onSubmit={handleEditCriterionBand}
          resultBandLabel={formatNullableText(
            version?.resultBands.find(
              (band) =>
                band.id === editingCriterionBand.band.frameworkResultBandId,
            )?.label,
          )}
        />
      ) : null}

      {isAddingResultBand ? (
        <FrameworkResultBandFormDialog
          errorMessage={getErrorMessage(addResultBandsMutation.error)}
          isOpen
          isSubmitting={addResultBandsMutation.isPending}
          onClose={() => {
            setIsAddingResultBand(false)
            addResultBandsMutation.reset()
          }}
          onSubmit={handleAddResultBand}
        />
      ) : null}

      {editingResultBand ? (
        <FrameworkResultBandFormDialog
          errorMessage={getErrorMessage(updateResultBandMutation.error)}
          initialValues={{
            code: editingResultBand.code,
            description: editingResultBand.description,
            label: editingResultBand.label,
            order: editingResultBand.order,
          }}
          isOpen
          isSubmitting={updateResultBandMutation.isPending}
          onClose={() => {
            setEditingResultBand(null)
            updateResultBandMutation.reset()
          }}
          onSubmit={handleEditResultBand}
        />
      ) : null}
    </section>
  )
}

export function SystemAdminFrameworkVersionDetailPage() {
  return <FrameworkVersionDetailPage basePath="/system-admin" />
}

export function SchoolAdminFrameworkVersionDetailPage() {
  return <FrameworkVersionDetailPage basePath="/school-admin" />
}
