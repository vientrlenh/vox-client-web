import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useCreateSupportedLanguageMutation,
  useDeleteSupportedLanguageMutation,
  useUpdateSupportedLanguageMutation,
} from '../api/useSupportedLanguageMutations'
import { useSupportedLanguageQuery } from '../api/useSupportedLanguageQuery'
import {
  languageQueryKeys,
  useSupportedLanguagesQuery,
} from '../api/useSupportedLanguagesQuery'
import { LanguageDeleteDialog } from '../components/LanguageDeleteDialog'
import { LanguageDetailDrawer } from '../components/LanguageDetailDrawer'
import {
  LanguageFormDialog,
  type LanguageFormMode,
} from '../components/LanguageFormDialog'
import { LanguageFiltersBar } from '../components/LanguageFiltersBar'
import { LanguagePageHeader } from '../components/LanguagePageHeader'
import { LanguagePagination } from '../components/LanguagePagination'
import { LanguageTable } from '../components/LanguageTable'
import type {
  CreateSupportedLanguageRequest,
  LanguageFilters,
  SupportedLanguage,
  UpdateSupportedLanguageRequest,
} from '../types'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10
const EMPTY_FILTERS: LanguageFilters = {
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

export function SystemAdminLanguagesPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [filters, setFilters] = useState<LanguageFilters>(EMPTY_FILTERS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [formMode, setFormMode] = useState<LanguageFormMode | null>(null)
  const [formTarget, setFormTarget] = useState<SupportedLanguage | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SupportedLanguage | null>(
    null,
  )
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [pageMessage, setPageMessage] = useState<PageMessage | null>(null)

  const languagesQuery = useSupportedLanguagesQuery(page, pageSize, filters)
  const languageDetailQuery = useSupportedLanguageQuery(selectedId)
  const createMutation = useCreateSupportedLanguageMutation()
  const updateMutation = useUpdateSupportedLanguageMutation()
  const deleteMutation = useDeleteSupportedLanguageMutation()
  const languages = languagesQuery.data?.content ?? []
  const isSaving = createMutation.isPending || updateMutation.isPending
  const isMutating = isSaving || deleteMutation.isPending

  function handleFilterChange(name: keyof LanguageFilters, value: string) {
    setFilters((current) => ({
      ...current,
      [name]: value,
    }))
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
    void languagesQuery.refetch()
    if (selectedId) {
      void languageDetailQuery.refetch()
    }
  }

  function openCreateDialog() {
    setFormTarget(null)
    setFormError(null)
    setFormMode('create')
  }

  function openEditDialog(language: SupportedLanguage) {
    setFormTarget(language)
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

  function openDetailDrawer(language: SupportedLanguage) {
    setSelectedId(language.id)
    setIsDetailOpen(true)
  }

  function closeDetailDrawer() {
    setIsDetailOpen(false)
  }

  function openDeleteDialog(language: SupportedLanguage) {
    setDeleteTarget(language)
    setDeleteError(null)
  }

  function closeDeleteDialog() {
    if (deleteMutation.isPending) {
      return
    }

    setDeleteTarget(null)
    setDeleteError(null)
  }

  async function handleCreateLanguage(payload: CreateSupportedLanguageRequest) {
    try {
      setFormError(null)
      const result = await createMutation.mutateAsync({ payload })

      await queryClient.invalidateQueries({
        queryKey: languageQueryKeys.all,
      })
      setPageMessage({ text: result.message, tone: 'success' })
      setFormMode(null)
      setFormTarget(null)
    } catch (error) {
      setFormError(
        getErrorMessage(error) ?? 'Không thể tạo ngôn ngữ. Vui lòng thử lại.',
      )
    }
  }

  async function handleUpdateLanguage(
    id: string,
    payload: UpdateSupportedLanguageRequest,
  ) {
    try {
      setFormError(null)
      const result = await updateMutation.mutateAsync({ id, payload })

      await queryClient.invalidateQueries({
        queryKey: languageQueryKeys.all,
      })
      setPageMessage({ text: result.message, tone: 'success' })
      setFormMode(null)
      setFormTarget(null)
      if (selectedId === id) {
        setIsDetailOpen(true)
      }
    } catch (error) {
      setFormError(
        getErrorMessage(error) ??
          'Không thể cập nhật ngôn ngữ. Vui lòng thử lại.',
      )
    }
  }

  async function handleDeleteLanguage() {
    if (!deleteTarget) {
      return
    }

    try {
      setDeleteError(null)
      const result = await deleteMutation.mutateAsync({ id: deleteTarget.id })

      await queryClient.invalidateQueries({
        queryKey: languageQueryKeys.all,
      })
      if (selectedId === deleteTarget.id) {
        setIsDetailOpen(false)
      }
      setDeleteTarget(null)
      setPageMessage({ text: result.message, tone: 'success' })
    } catch (error) {
      setDeleteError(
        getErrorMessage(error) ??
          'Không thể lưu trữ ngôn ngữ. Vui lòng thử lại.',
      )
    }
  }

  const pageMessageClassName =
    pageMessage?.tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-red-200 bg-red-50 text-red-700'

  return (
    <section
      aria-labelledby="system-admin-languages-title"
      className="grid gap-6"
    >
      <LanguagePageHeader
        isRefreshing={languagesQuery.isFetching || languageDetailQuery.isFetching}
        onCreate={openCreateDialog}
        onRefresh={handleRefresh}
      />

      {pageMessage ? (
        <div
          className={`rounded-lg border px-4 py-3 text-sm font-semibold ${pageMessageClassName}`}
          role={pageMessage.tone === 'error' ? 'alert' : 'status'}
        >
          {pageMessage.text}
        </div>
      ) : null}

      <LanguageFiltersBar filters={filters} onChange={handleFilterChange} />

      <LanguageTable
        errorMessage={getErrorMessage(languagesQuery.error)}
        footer={
          <LanguagePagination
            isDisabled={languagesQuery.isLoading || languagesQuery.isError}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            page={page}
            pageSize={pageSize}
            totalElements={languagesQuery.data?.totalElements ?? 0}
            totalPages={languagesQuery.data?.totalPages ?? 0}
          />
        }
        isActionPending={isMutating}
        isError={languagesQuery.isError}
        isLoading={languagesQuery.isLoading}
        languages={languages}
        onDelete={openDeleteDialog}
        onEdit={openEditDialog}
        onRetry={() => {
          void languagesQuery.refetch()
        }}
        onView={openDetailDrawer}
        selectedId={isDetailOpen ? selectedId : null}
      />

      <LanguageFormDialog
        errorMessage={formError ?? undefined}
        isOpen={Boolean(formMode)}
        isSubmitting={isSaving}
        language={formTarget}
        mode={formMode ?? 'create'}
        onClose={closeFormDialog}
        onCreate={(payload) => {
          void handleCreateLanguage(payload)
        }}
        onUpdate={(id, payload) => {
          void handleUpdateLanguage(id, payload)
        }}
      />

      <LanguageDeleteDialog
        errorMessage={deleteError ?? undefined}
        isSubmitting={deleteMutation.isPending}
        language={deleteTarget}
        onClose={closeDeleteDialog}
        onConfirm={() => {
          void handleDeleteLanguage()
        }}
      />

      <LanguageDetailDrawer
        errorMessage={getErrorMessage(languageDetailQuery.error)}
        isError={languageDetailQuery.isError}
        isLoading={Boolean(selectedId) && languageDetailQuery.isLoading}
        language={languageDetailQuery.data ?? null}
        onClose={closeDetailDrawer}
        onRetry={() => {
          void languageDetailQuery.refetch()
        }}
        open={isDetailOpen}
      />
    </section>
  )
}
