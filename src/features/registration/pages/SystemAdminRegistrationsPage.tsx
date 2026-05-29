import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useApproveRegisterFormMutation,
  useRejectRegisterFormMutation,
} from '../api/useRegisterFormDecisionMutations'
import { useRegisterFormQuery } from '../api/useRegisterFormQuery'
import {
  registrationQueryKeys,
  useRegisterFormsQuery,
} from '../api/useRegisterFormsQuery'
import { RegistrationDetailPanel } from '../components/RegistrationDetailPanel'
import type {
  RegistrationDecisionMode,
  RegistrationDecisionPayload,
} from '../components/RegistrationDecisionDialog'
import { RegistrationDecisionDialog } from '../components/RegistrationDecisionDialog'
import { RegistrationPageHeader } from '../components/RegistrationPageHeader'
import { RegistrationPagination } from '../components/RegistrationPagination'
import { RegistrationTable } from '../components/RegistrationTable'
import type { RegisterForm } from '../types'

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

type DecisionTarget = {
  form: RegisterForm
  mode: RegistrationDecisionMode
}

type PageMessage = {
  text: string
  tone: 'error' | 'success'
}

export function SystemAdminRegistrationsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [decisionTarget, setDecisionTarget] = useState<DecisionTarget | null>(
    null,
  )
  const [decisionError, setDecisionError] = useState<string | null>(null)
  const [pageMessage, setPageMessage] = useState<PageMessage | null>(null)
  const approveMutation = useApproveRegisterFormMutation()
  const rejectMutation = useRejectRegisterFormMutation()
  const registerFormsQuery = useRegisterFormsQuery(page, pageSize)
  const forms = registerFormsQuery.data?.content ?? []
  const selectedListForm =
    forms.find((form) => form.id === selectedId) ?? forms[0] ?? null
  const effectiveSelectedId = selectedListForm?.id ?? null
  const registerFormQuery = useRegisterFormQuery(effectiveSelectedId)
  const detailForm = registerFormQuery.data ?? null
  const totalElements = registerFormsQuery.data?.totalElements ?? 0
  const totalPages = registerFormsQuery.data?.totalPages ?? 0
  const isDecisionPending = approveMutation.isPending || rejectMutation.isPending

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

  function handleOpenDecision(mode: RegistrationDecisionMode, form: RegisterForm) {
    setSelectedId(form.id)
    setDecisionError(null)
    setDecisionTarget({ form, mode })
  }

  function handleCloseDecision() {
    if (isDecisionPending) {
      return
    }

    setDecisionError(null)
    setDecisionTarget(null)
  }

  async function handleDecisionSubmit(decision: RegistrationDecisionPayload) {
    if (!decisionTarget) {
      return
    }

    try {
      setDecisionError(null)

      const message =
        decision.mode === 'approve'
          ? await approveMutation.mutateAsync({
              id: decisionTarget.form.id,
              payload: decision.payload,
            })
          : await rejectMutation.mutateAsync({
              id: decisionTarget.form.id,
              payload: decision.payload,
            })

      await queryClient.invalidateQueries({
        queryKey: registrationQueryKeys.all,
      })

      setDecisionTarget(null)
      setPageMessage({
        text: message,
        tone: 'success',
      })
    } catch (error) {
      setDecisionError(
        getErrorMessage(error) ??
          'Không thể xử lý đơn đăng ký. Vui lòng thử lại.',
      )
    }
  }

  const pageMessageClassName =
    pageMessage?.tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-red-200 bg-red-50 text-red-700'

  return (
    <section className="grid gap-6" aria-labelledby="system-admin-registrations-title">
      <RegistrationPageHeader
        isRefreshing={registerFormsQuery.isFetching}
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
          isActionPending={isDecisionPending}
          isError={registerFormsQuery.isError}
          isLoading={registerFormsQuery.isLoading}
          onApprove={(form) => handleOpenDecision('approve', form)}
          onReject={(form) => handleOpenDecision('reject', form)}
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

      <RegistrationDecisionDialog
        errorMessage={decisionError ?? undefined}
        form={decisionTarget?.form ?? null}
        isSubmitting={isDecisionPending}
        mode={decisionTarget?.mode ?? null}
        onClose={handleCloseDecision}
        onSubmit={handleDecisionSubmit}
      />
    </section>
  )
}
