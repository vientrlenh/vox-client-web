import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useAppSelector } from '@/app/store/hooks'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { canManageFramework, getFrameworkActorRole } from '../permissions'
import {
  useActivateFrameworkMutation,
  useCreateFrameworkMutation,
  useDeactivateFrameworkMutation,
  useDeleteFrameworkMutation,
  useUpdateFrameworkMutation,
} from '../api/useFrameworkMutations'
import {
  frameworkQueryKeys,
  useFrameworksQuery,
} from '../api/useFrameworksQuery'
import { FrameworkDeleteDialog } from '../components/FrameworkDeleteDialog'
import {
  FrameworkFormDialog,
  type FrameworkFormMode,
} from '../components/FrameworkFormDialog'
import { FrameworkFiltersBar } from '../components/FrameworkFiltersBar'
import { FrameworkPageHeader } from '../components/FrameworkPageHeader'
import { FrameworkPagination } from '../components/FrameworkPagination'
import { FrameworkTable } from '../components/FrameworkTable'
import type {
  CreateFrameworkRequest,
  Framework,
  FrameworkFilters,
  UpdateFrameworkRequest,
} from '../types'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10
const EMPTY_FILTERS: FrameworkFilters = {
  isActive: '',
  search: '',
}

type PageMessage = {
  text: string
  tone: 'error' | 'success'
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

function FrameworksPage({ basePath }: { basePath: string }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const user = useAppSelector((state) => state.auth.user)
  const canManage = canManageFramework(getFrameworkActorRole(user?.roles))
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [filters, setFilters] = useState<FrameworkFilters>(EMPTY_FILTERS)
  const [formMode, setFormMode] = useState<FrameworkFormMode | null>(null)
  const [formTarget, setFormTarget] = useState<Framework | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Framework | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [pageMessage, setPageMessage] = useState<PageMessage | null>(null)

  const frameworksQuery = useFrameworksQuery(page, pageSize, filters)
  const createMutation = useCreateFrameworkMutation()
  const updateMutation = useUpdateFrameworkMutation()
  const deleteMutation = useDeleteFrameworkMutation()
  const activateMutation = useActivateFrameworkMutation()
  const deactivateMutation = useDeactivateFrameworkMutation()
  const frameworks = frameworksQuery.data?.content ?? []
  const isSaving =
    createMutation.isPending ||
    updateMutation.isPending ||
    activateMutation.isPending ||
    deactivateMutation.isPending
  const isMutating = isSaving || deleteMutation.isPending

  function handleFilterChange(name: keyof FrameworkFilters, value: string) {
    setFilters((current) => ({ ...current, [name]: value }))
    setPage(DEFAULT_PAGE)
  }

  function handlePageChange(nextPage: number) {
    setPage(nextPage)
  }

  function handlePageSizeChange(nextPageSize: number) {
    setPage(DEFAULT_PAGE)
    setPageSize(nextPageSize)
  }

  function handleRefresh() {
    void frameworksQuery.refetch()
  }

  function openCreateDialog() {
    setFormTarget(null)
    setFormError(null)
    setFormMode('create')
  }

  function openEditDialog(framework: Framework) {
    setFormTarget(framework)
    setFormError(null)
    setFormMode('edit')
  }

  function closeFormDialog() {
    if (isSaving) {
      return
    }

    setFormError(null)
    setFormMode(null)
    setFormTarget(null)
  }

  function openDeleteDialog(framework: Framework) {
    setDeleteTarget(framework)
    setDeleteError(null)
  }

  function closeDeleteDialog() {
    if (deleteMutation.isPending) {
      return
    }

    setDeleteTarget(null)
    setDeleteError(null)
  }

  async function handleCreateFramework(
    payload: CreateFrameworkRequest,
    isActive: boolean,
  ) {
    try {
      setFormError(null)
      const result = await createMutation.mutateAsync({ payload })

      if (isActive) {
        await activateMutation.mutateAsync({ id: result.data.frameworkId })
      }

      await queryClient.invalidateQueries({ queryKey: frameworkQueryKeys.all })
      setPageMessage({ text: result.message, tone: 'success' })
      setFormMode(null)
      setFormTarget(null)
    } catch (error) {
      setFormError(
        getErrorMessage(error) ?? 'Không thể tạo khung đánh giá năng lực. Vui lòng thử lại.',
      )
    }
  }

  async function handleUpdateFramework(
    id: string,
    payload: UpdateFrameworkRequest,
  ) {
    try {
      setFormError(null)
      const result = await updateMutation.mutateAsync({ id, payload })

      await queryClient.invalidateQueries({ queryKey: frameworkQueryKeys.all })
      setPageMessage({ text: result.message, tone: 'success' })
      setFormMode(null)
      setFormTarget(null)
    } catch (error) {
      setFormError(
        getErrorMessage(error) ??
          'Không thể cập nhật khung đánh giá năng lực. Vui lòng thử lại.',
      )
    }
  }

  async function handleDeleteFramework() {
    if (!deleteTarget) {
      return
    }

    try {
      setDeleteError(null)
      const result = await deleteMutation.mutateAsync({ id: deleteTarget.id })

      await queryClient.invalidateQueries({ queryKey: frameworkQueryKeys.all })
      setDeleteTarget(null)
      setPageMessage({ text: result.message, tone: 'success' })
    } catch (error) {
      setDeleteError(
        getErrorMessage(error) ??
          'Không thể xóa khung đánh giá năng lực. Vui lòng thử lại.',
      )
    }
  }

  async function handleActivateFramework(framework: Framework) {
    try {
      const result = await activateMutation.mutateAsync({ id: framework.id })

      await queryClient.invalidateQueries({ queryKey: frameworkQueryKeys.all })
      setPageMessage({ text: result.message, tone: 'success' })
    } catch (error) {
      setPageMessage({
        text:
          getErrorMessage(error) ??
          'Không thể kích hoạt framework. Vui lòng thử lại.',
        tone: 'error',
      })
    }
  }

  async function handleDeactivateFramework(framework: Framework) {
    try {
      const result = await deactivateMutation.mutateAsync({ id: framework.id })

      await queryClient.invalidateQueries({ queryKey: frameworkQueryKeys.all })
      setPageMessage({ text: result.message, tone: 'success' })
    } catch (error) {
      setPageMessage({
        text:
          getErrorMessage(error) ??
          'Không thể vô hiệu hóa khung đánh giá năng lực. Vui lòng thử lại.',
        tone: 'error',
      })
    }
  }

  return (
    <section
      aria-labelledby="system-admin-frameworks-title"
      className="grid gap-6"
    >
      <FrameworkPageHeader
        isRefreshing={frameworksQuery.isFetching}
        onCreate={canManage ? openCreateDialog : undefined}
        onRefresh={handleRefresh}
      />

      <FeedbackToast
        message={pageMessage?.text ?? null}
        onClose={() => setPageMessage(null)}
        tone={pageMessage?.tone ?? 'error'}
      />

      <FrameworkFiltersBar filters={filters} onChange={handleFilterChange} />

      <FrameworkTable
        errorMessage={getErrorMessage(frameworksQuery.error)}
        footer={
          <FrameworkPagination
            isDisabled={frameworksQuery.isLoading || frameworksQuery.isError}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            page={page}
            pageSize={pageSize}
            totalElements={frameworksQuery.data?.totalElements ?? 0}
            totalPages={frameworksQuery.data?.totalPages ?? 0}
          />
        }
        frameworks={frameworks}
        isActionPending={isMutating}
        isError={frameworksQuery.isError}
        isLoading={frameworksQuery.isLoading}
        onActivate={
          canManage
            ? (fw) => {
                void handleActivateFramework(fw)
              }
            : undefined
        }
        onDeactivate={
          canManage
            ? (fw) => {
                void handleDeactivateFramework(fw)
              }
            : undefined
        }
        onDelete={canManage ? openDeleteDialog : undefined}
        onEdit={canManage ? openEditDialog : undefined}
        onRetry={() => {
          void frameworksQuery.refetch()
        }}
        onView={(fw) => {
          void navigate(`${basePath}/frameworks/${fw.id}`)
        }}
      />

      <FrameworkFormDialog
        errorMessage={formError ?? undefined}
        framework={formTarget}
        isOpen={Boolean(formMode)}
        isSubmitting={isSaving}
        mode={formMode ?? 'create'}
        onClose={closeFormDialog}
        onCreate={(payload, isActive) => {
          void handleCreateFramework(payload, isActive)
        }}
        onUpdate={(id, payload) => {
          void handleUpdateFramework(id, payload)
        }}
      />

      <FrameworkDeleteDialog
        errorMessage={deleteError ?? undefined}
        framework={deleteTarget}
        isSubmitting={deleteMutation.isPending}
        onClose={closeDeleteDialog}
        onConfirm={() => {
          void handleDeleteFramework()
        }}
      />
    </section>
  )
}

export function SystemAdminFrameworksPage() {
  return <FrameworksPage basePath="/system-admin" />
}

export function SchoolAdminFrameworksPage() {
  return <FrameworksPage basePath="/school-admin" />
}
