import { useState } from 'react'
import { useRegisterFormQuery } from '../api/useRegisterFormQuery'
import { useRegisterFormsQuery } from '../api/useRegisterFormsQuery'
import { RegistrationDetailPanel } from '../components/RegistrationDetailPanel'
import { RegistrationPageHeader } from '../components/RegistrationPageHeader'
import { RegistrationPagination } from '../components/RegistrationPagination'
import { RegistrationTable } from '../components/RegistrationTable'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10

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

export function SystemAdminRegistrationsPage() {
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const registerFormsQuery = useRegisterFormsQuery(page, pageSize)
  const forms = registerFormsQuery.data?.content ?? []
  const selectedListForm =
    forms.find((form) => form.id === selectedId) ?? forms[0] ?? null
  const effectiveSelectedId = selectedListForm?.id ?? null
  const registerFormQuery = useRegisterFormQuery(effectiveSelectedId)
  const detailForm = registerFormQuery.data ?? null
  const totalElements = registerFormsQuery.data?.totalElements ?? 0
  const totalPages = registerFormsQuery.data?.totalPages ?? 0

  function handlePageChange(nextPage: number) {
    setSelectedId(null)
    setPage(nextPage)
  }

  function handlePageSizeChange(nextPageSize: number) {
    setSelectedId(null)
    setPage(DEFAULT_PAGE)
    setPageSize(nextPageSize)
  }

  function handleRefresh() {
    void registerFormsQuery.refetch()
  }

  function handleRetryList() {
    void registerFormsQuery.refetch()
  }

  function handleRetryDetail() {
    void registerFormQuery.refetch()
  }

  return (
    <section className="grid gap-6" aria-labelledby="system-admin-registrations-title">
      <RegistrationPageHeader
        isRefreshing={registerFormsQuery.isFetching}
        onRefresh={handleRefresh}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px] 2xl:grid-cols-[minmax(0,1fr)_460px]">
        <RegistrationTable
          errorMessage={getErrorMessage(registerFormsQuery.error)}
          footer={
            <RegistrationPagination
              isDisabled={
                registerFormsQuery.isLoading || registerFormsQuery.isError
              }
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              page={page}
              pageSize={pageSize}
              totalElements={totalElements}
              totalPages={totalPages}
            />
          }
          forms={forms}
          isError={registerFormsQuery.isError}
          isLoading={registerFormsQuery.isLoading}
          onRetry={handleRetryList}
          onSelect={setSelectedId}
          selectedId={effectiveSelectedId}
        />

        <RegistrationDetailPanel
          errorMessage={getErrorMessage(registerFormQuery.error)}
          form={detailForm}
          isError={registerFormQuery.isError}
          isLoading={Boolean(effectiveSelectedId) && registerFormQuery.isLoading}
          onRetry={handleRetryDetail}
        />
      </div>
    </section>
  )
}
