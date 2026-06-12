import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import {
  useCreateQuestionBankMutation,
  useUpdateQuestionBankMutation,
} from '../api/useQuestionBankMutations'
import { useQuestionBankQuery } from '../api/useQuestionBankQuery'
import {
  questionBankQueryKeys,
  useQuestionBanksQuery,
} from '../api/useQuestionBanksQuery'
import type { QuestionBankFormMode } from '../components/QuestionBankFormDialog'
import { QuestionBankFormDialog } from '../components/QuestionBankFormDialog'
import { QuestionBankPageHeader } from '../components/QuestionBankPageHeader'
import { QuestionBankPagination } from '../components/QuestionBankPagination'
import { QuestionBankTable } from '../components/QuestionBankTable'
import type {
  CreateQuestionBankRequest,
  QuestionBankDto,
  UpdateQuestionBankRequest,
} from '../types'

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

type FormTarget = {
  mode: QuestionBankFormMode
  questionBank: QuestionBankDto | null
}

type PageMessage = {
  text: string
  tone: 'error' | 'success'
}

export function TeacherQuestionBanksPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [pageMessage, setPageMessage] = useState<PageMessage | null>(null)
  const createMutation = useCreateQuestionBankMutation()
  const updateMutation = useUpdateQuestionBankMutation()
  const questionBanksQuery = useQuestionBanksQuery(page, pageSize)
  const questionBanks = questionBanksQuery.data?.content ?? []
  const selectedListBank =
    questionBanks.find((bank) => bank.id === selectedId) ??
    questionBanks[0] ??
    null
  const effectiveSelectedId = selectedListBank?.id ?? null
  const questionBankQuery = useQuestionBankQuery(effectiveSelectedId)
  const totalElements = questionBanksQuery.data?.totalElements ?? 0
  const totalPages = questionBanksQuery.data?.totalPages ?? 0
  const isFormPending = createMutation.isPending || updateMutation.isPending

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
    void questionBanksQuery.refetch()
  }

  function handleRetryList() {
    void questionBanksQuery.refetch()
  }

  function handleViewTopics(bank: QuestionBankDto) {
    navigate(
      `/teacher/question-topics?bankId=${bank.id}&bankName=${encodeURIComponent(bank.bankName)}`,
    )
  }

  function handleOpenCreate() {
    setFormError(null)
    setFormTarget({ mode: 'create', questionBank: null })
  }

  function handleOpenEdit(bank: QuestionBankDto) {
    setSelectedId(bank.id)
    setFormError(null)
    setFormTarget({ mode: 'edit', questionBank: bank })
  }

  function handleCloseForm() {
    if (isFormPending) {
      return
    }

    setFormError(null)
    setFormTarget(null)
  }

  async function handleFormSubmit(
    mode: QuestionBankFormMode,
    payload: CreateQuestionBankRequest | UpdateQuestionBankRequest,
  ) {
    if (!formTarget) {
      return
    }

    try {
      setFormError(null)

      let message: string

      if (mode === 'create') {
        message = await createMutation.mutateAsync(
          payload as CreateQuestionBankRequest,
        )
      } else {
        if (!formTarget.questionBank) {
          return
        }

        message = await updateMutation.mutateAsync({
          id: formTarget.questionBank.id,
          payload: payload as UpdateQuestionBankRequest,
        })
      }

      await queryClient.invalidateQueries({
        queryKey: questionBankQueryKeys.all,
      })

      setFormTarget(null)
      setPageMessage({
        text: message,
        tone: 'success',
      })
    } catch (error) {
      setFormError(
        getErrorMessage(error) ??
          'Không thể xử lý ngân hàng câu hỏi. Vui lòng thử lại.',
      )
    }
  }

  const pageMessageClassName =
    pageMessage?.tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-red-200 bg-red-50 text-red-700'

  return (
    <section
      className="grid gap-6"
      aria-labelledby="teacher-question-banks-title"
    >
      <QuestionBankPageHeader
        isRefreshing={questionBanksQuery.isFetching}
        onCreate={handleOpenCreate}
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

      <QuestionBankTable
        errorMessage={getErrorMessage(questionBanksQuery.error)}
        footer={
          <QuestionBankPagination
            isDisabled={
              questionBanksQuery.isLoading || questionBanksQuery.isError
            }
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            page={page}
            pageSize={pageSize}
            totalElements={totalElements}
            totalPages={totalPages}
          />
        }
        isError={questionBanksQuery.isError}
        isLoading={questionBanksQuery.isLoading}
        onEdit={handleOpenEdit}
        onRetry={handleRetryList}
        onSelect={setSelectedId}
        onViewTopics={handleViewTopics}
        questionBanks={questionBanks}
        selectedId={effectiveSelectedId}
      />

      <QuestionBankFormDialog
        errorMessage={formError ?? undefined}
        isSubmitting={isFormPending}
        mode={formTarget?.mode ?? null}
        onClose={handleCloseForm}
        onSubmit={handleFormSubmit}
        questionBank={formTarget?.questionBank ?? null}
      />
    </section>
  )
}
