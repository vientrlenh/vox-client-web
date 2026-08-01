import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ChevronLeft, Plus } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAppSelector } from '@/app/store/hooks'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { canManageFramework, getFrameworkActorRole } from '../permissions'
import { useFrameworkQuery } from '../api/useFrameworkQuery'
import {
  useActivateFrameworkMutation,
  useDeactivateFrameworkMutation,
  useUpdateFrameworkMutation,
} from '../api/useFrameworkMutations'
import {
  useCreateFrameworkVersionMutation,
  useDeleteFrameworkVersionMutation,
  useUpdateFrameworkVersionStatusMutation,
} from '../api/useFrameworkVersionMutations'
import { useFrameworkVersionsQuery } from '../api/useFrameworkVersionsQuery'
import { frameworkQueryKeys } from '../api/useFrameworksQuery'
import { FrameworkFormDialog } from '../components/FrameworkFormDialog'
import { FrameworkStatusBadge } from '../components/FrameworkStatusBadge'
import { FrameworkVersionDeleteDialog } from '../components/FrameworkVersionDeleteDialog'
import { FrameworkVersionFormDialog } from '../components/FrameworkVersionFormDialog'
import { FrameworkVersionTable } from '../components/FrameworkVersionTable'
import { FrameworkPagination } from '../components/FrameworkPagination'
import type {
  CreateFrameworkVersionRequest,
  FrameworkVersion,
  UpdateFrameworkRequest,
} from '../types'
import { formatFrameworkDate, formatNullableText } from '../types'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10

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

function FrameworkDetailPage({ basePath }: { basePath: string }) {
  const { frameworkId } = useParams<{ frameworkId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAppSelector((state) => state.auth.user)
  const canManage = canManageFramework(getFrameworkActorRole(user?.roles))

  const [versionsPage, setVersionsPage] = useState(DEFAULT_PAGE)
  const [versionsPageSize, setVersionsPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [editOpen, setEditOpen] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [createVersionOpen, setCreateVersionOpen] = useState(false)
  const [createVersionError, setCreateVersionError] = useState<string | null>(null)
  const [deleteVersionTarget, setDeleteVersionTarget] =
    useState<FrameworkVersion | null>(null)
  const [deleteVersionError, setDeleteVersionError] = useState<string | null>(null)
  const [pageMessage, setPageMessage] = useState<PageMessage | null>(null)

  const frameworkQuery = useFrameworkQuery(frameworkId ?? null)
  const versionsQuery = useFrameworkVersionsQuery(
    frameworkId ?? '',
    versionsPage,
    versionsPageSize,
  )
  const updateMutation = useUpdateFrameworkMutation()
  const activateMutation = useActivateFrameworkMutation()
  const deactivateMutation = useDeactivateFrameworkMutation()
  const createVersionMutation = useCreateFrameworkVersionMutation()
  const deleteVersionMutation = useDeleteFrameworkVersionMutation()
  const versionStatusMutation = useUpdateFrameworkVersionStatusMutation()

  const framework = frameworkQuery.data ?? null

  async function handleUpdateFramework(
    id: string,
    payload: UpdateFrameworkRequest,
  ) {
    try {
      setEditError(null)
      const result = await updateMutation.mutateAsync({ id, payload })

      await queryClient.invalidateQueries({ queryKey: frameworkQueryKeys.all })
      setPageMessage({ text: result.message, tone: 'success' })
      setEditOpen(false)
    } catch (error) {
      setEditError(
        getErrorMessage(error) ??
          'Không thể cập nhật framework. Vui lòng thử lại.',
      )
    }
  }

  async function handleCreateVersion(payload: CreateFrameworkVersionRequest) {
    if (!frameworkId) {
      return
    }

    try {
      setCreateVersionError(null)
      const result = await createVersionMutation.mutateAsync({
        frameworkId,
        payload,
      })

      await queryClient.invalidateQueries({ queryKey: frameworkQueryKeys.all })
      setPageMessage({ text: result.message, tone: 'success' })
      setCreateVersionOpen(false)
      void navigate(
        `${basePath}/frameworks/${frameworkId}/versions/${result.data.versionId}`,
        { state: { autoEdit: true } },
      )
    } catch (error) {
      setCreateVersionError(
        getErrorMessage(error) ??
          'Không thể tạo phiên bản. Vui lòng thử lại.',
      )
    }
  }

  async function handleToggleFrameworkActive() {
    if (!framework) {
      return
    }

    try {
      const mutation = framework.isActive ? deactivateMutation : activateMutation
      const result = await mutation.mutateAsync({ id: framework.id })

      await queryClient.invalidateQueries({ queryKey: frameworkQueryKeys.all })
      setPageMessage({ text: result.message, tone: 'success' })
    } catch (error) {
      setPageMessage({
        text:
          getErrorMessage(error) ??
          'Không thể đổi trạng thái framework. Vui lòng thử lại.',
        tone: 'error',
      })
    }
  }

  async function handlePublishVersion(version: FrameworkVersion) {
    if (!frameworkId) {
      return
    }

    try {
      const result = await versionStatusMutation.mutateAsync({
        frameworkId,
        payload: { status: 'PUBLISHED' },
        versionId: version.id,
      })

      await queryClient.invalidateQueries({ queryKey: frameworkQueryKeys.all })
      setPageMessage({ text: result.message, tone: 'success' })
    } catch (error) {
      setPageMessage({
        text:
          getErrorMessage(error) ??
          'Không thể xuất bản phiên bản. Vui lòng thử lại.',
        tone: 'error',
      })
    }
  }

  async function handleArchiveVersion(version: FrameworkVersion) {
    if (!frameworkId) {
      return
    }

    try {
      const result = await versionStatusMutation.mutateAsync({
        frameworkId,
        payload: { status: 'ARCHIVED' },
        versionId: version.id,
      })

      await queryClient.invalidateQueries({ queryKey: frameworkQueryKeys.all })
      setPageMessage({ text: result.message, tone: 'success' })
    } catch (error) {
      setPageMessage({
        text:
          getErrorMessage(error) ??
          'Không thể lưu trữ phiên bản. Vui lòng thử lại.',
        tone: 'error',
      })
    }
  }

  async function handleDeleteVersion() {
    if (!deleteVersionTarget || !frameworkId) {
      return
    }

    try {
      setDeleteVersionError(null)
      const result = await deleteVersionMutation.mutateAsync({
        frameworkId,
        versionId: deleteVersionTarget.id,
      })

      await queryClient.invalidateQueries({ queryKey: frameworkQueryKeys.all })
      setDeleteVersionTarget(null)
      setPageMessage({ text: result.message, tone: 'success' })
    } catch (error) {
      setDeleteVersionError(
        getErrorMessage(error) ??
          'Không thể xóa phiên bản. Vui lòng thử lại.',
      )
    }
  }

  return (
    <section className="grid gap-6">
      <div>
        <Link
          className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 transition hover:text-indigo-700"
          to={`${basePath}/frameworks`}
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          Danh sách framework
        </Link>
      </div>

      <FeedbackToast
        message={pageMessage?.text ?? null}
        onClose={() => setPageMessage(null)}
        tone={pageMessage?.tone ?? 'error'}
      />

      {frameworkQuery.isLoading ? (
        <div className="h-40 animate-pulse rounded-lg bg-white border border-slate-200" />
      ) : null}

      {frameworkQuery.isError ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-white px-6 py-12 text-center">
          <p className="text-sm font-bold text-red-600">
            {getErrorMessage(frameworkQuery.error) ??
              'Không thể tải thông tin framework.'}
          </p>
          <button
            className="mt-4 inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
            onClick={() => void frameworkQuery.refetch()}
            type="button"
          >
            Thử lại
          </button>
        </div>
      ) : null}

      {!frameworkQuery.isLoading && framework ? (
        <div className="rounded-lg border border-slate-200 bg-white px-6 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-black text-blue-950">
                {formatNullableText(framework.name)}
              </h1>
              {framework.description ? (
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {framework.description}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                <FrameworkStatusBadge isActive={framework.isActive} />
                <span>Tạo: {formatFrameworkDate(framework.createdAt)}</span>
                <span>Cập nhật: {formatFrameworkDate(framework.updatedAt)}</span>
              </div>
            </div>
            {canManage ? (
              <div className="flex shrink-0 items-center gap-2">
                <button
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={
                    activateMutation.isPending || deactivateMutation.isPending
                  }
                  onClick={() => void handleToggleFrameworkActive()}
                  type="button"
                >
                  {framework.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                </button>
                <button
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
                  onClick={() => {
                    setEditError(null)
                    setEditOpen(true)
                  }}
                  type="button"
                >
                  Sửa thông tin
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <h2 className="text-lg font-black text-blue-950">Phiên bản</h2>
          {canManage ? (
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-black text-white transition hover:bg-indigo-700"
              onClick={() => {
                setCreateVersionError(null)
                setCreateVersionOpen(true)
              }}
              type="button"
            >
              <Plus aria-hidden="true" className="size-4" />
              Tạo phiên bản
            </button>
          ) : null}
        </div>

        <FrameworkVersionTable
          errorMessage={getErrorMessage(versionsQuery.error)}
          footer={
            <FrameworkPagination
              isDisabled={versionsQuery.isLoading || versionsQuery.isError}
              onPageChange={setVersionsPage}
              onPageSizeChange={(size) => {
                setVersionsPage(DEFAULT_PAGE)
                setVersionsPageSize(size)
              }}
              page={versionsPage}
              pageSize={versionsPageSize}
              totalElements={versionsQuery.data?.totalElements ?? 0}
              totalPages={versionsQuery.data?.totalPages ?? 0}
            />
          }
          isActionPending={
            createVersionMutation.isPending ||
            deleteVersionMutation.isPending ||
            versionStatusMutation.isPending
          }
          isError={versionsQuery.isError}
          isLoading={versionsQuery.isLoading}
          onArchive={
            canManage
              ? (version) => {
                  void handleArchiveVersion(version)
                }
              : undefined
          }
          onDelete={
            canManage
              ? (version) => {
                  setDeleteVersionTarget(version)
                  setDeleteVersionError(null)
                }
              : undefined
          }
          onPublish={
            canManage
              ? (version) => {
                  void handlePublishVersion(version)
                }
              : undefined
          }
          onRetry={() => void versionsQuery.refetch()}
          onView={(version) => {
            void navigate(
              `${basePath}/frameworks/${frameworkId}/versions/${version.id}`,
            )
          }}
          versions={versionsQuery.data?.content ?? []}
        />
      </div>

      <FrameworkFormDialog
        errorMessage={editError ?? undefined}
        framework={framework}
        isOpen={editOpen}
        isSubmitting={updateMutation.isPending}
        mode="edit"
        onClose={() => {
          if (updateMutation.isPending) {
            return
          }

          setEditError(null)
          setEditOpen(false)
        }}
        onCreate={() => undefined}
        onUpdate={(id, payload) => {
          void handleUpdateFramework(id, payload)
        }}
      />

      <FrameworkVersionFormDialog
        errorMessage={createVersionError ?? undefined}
        isOpen={createVersionOpen}
        isSubmitting={createVersionMutation.isPending}
        onClose={() => {
          if (createVersionMutation.isPending) {
            return
          }

          setCreateVersionError(null)
          setCreateVersionOpen(false)
        }}
        onCreate={(payload) => {
          void handleCreateVersion(payload)
        }}
      />

      <FrameworkVersionDeleteDialog
        errorMessage={deleteVersionError ?? undefined}
        isSubmitting={deleteVersionMutation.isPending}
        onClose={() => {
          if (deleteVersionMutation.isPending) {
            return
          }

          setDeleteVersionTarget(null)
          setDeleteVersionError(null)
        }}
        onConfirm={() => {
          void handleDeleteVersion()
        }}
        version={deleteVersionTarget}
      />
    </section>
  )
}

export function SystemAdminFrameworkDetailPage() {
  return <FrameworkDetailPage basePath="/system-admin" />
}

export function SchoolAdminFrameworkDetailPage() {
  return <FrameworkDetailPage basePath="/school-admin" />
}
