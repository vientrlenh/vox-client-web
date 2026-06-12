import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router'
import {
  useCreateQuestionMutation,
  useUpdateQuestionMutation,
} from '../api/useQuestionMutations'
import { useQuestionQuery } from '../api/useQuestionQuery'
import {
  questionQueryKeys,
  useQuestionsQuery,
  useQuestionsByTopicQuery,
} from '../api/useQuestionsQuery'
import type { QuestionFormMode } from '../components/QuestionFormDialog'
import { QuestionFormDialog } from '../components/QuestionFormDialog'
import { QuestionPageHeader } from '../components/QuestionPageHeader'
import { QuestionPagination } from '../components/QuestionPagination'
import { QuestionTable } from '../components/QuestionTable'
import type {
  CreateQuestionRequest,
  QuestionDto,
  UpdateQuestionRequest,
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
  mode: QuestionFormMode
  question: QuestionDto | null
}

type PageMessage = {
  text: string
  tone: 'error' | 'success'
}

export function TeacherQuestionsPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const topicId = searchParams.get('topicId') ?? ''
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [pageMessage, setPageMessage] = useState<PageMessage | null>(null)
  const createMutation = useCreateQuestionMutation()
  const updateMutation = useUpdateQuestionMutation()
  const allQuestionsQuery = useQuestionsQuery(page, pageSize)
  const topicQuestionsQuery = useQuestionsByTopicQuery(topicId, page, pageSize)
  const questionsQuery = topicId ? topicQuestionsQuery : allQuestionsQuery
  const questions = questionsQuery.data?.content ?? []
  const selectedListQuestion =
    questions.find((q) => q.id === selectedId) ?? questions[0] ?? null
  const effectiveSelectedId = selectedListQuestion?.id ?? null
  const questionQuery = useQuestionQuery(effectiveSelectedId)
  const totalElements = questionsQuery.data?.totalElements ?? 0
  const totalPages = questionsQuery.data?.totalPages ?? 0
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
    void questionsQuery.refetch()
  }

  function handleRetryList() {
    void questionsQuery.refetch()
  }

  function handleBack() {
    navigate('/teacher/question-topics')
  }

  function handleOpenCreate() {
    setFormError(null)
    setFormTarget({ mode: 'create', question: null })
  }

  function handleOpenEdit(question: QuestionDto) {
    setSelectedId(question.id)
    setFormError(null)
    setFormTarget({ mode: 'edit', question })
  }

  function handleCloseForm() {
    if (isFormPending) {
      return
    }

    setFormError(null)
    setFormTarget(null)
  }

  async function handleFormSubmit(
    mode: QuestionFormMode,
    payload: CreateQuestionRequest | UpdateQuestionRequest,
  ) {
    if (!formTarget) {
      return
    }

    try {
      setFormError(null)

      let message: string

      if (mode === 'create') {
        message = await createMutation.mutateAsync(
          payload as CreateQuestionRequest,
        )
      } else {
        if (!formTarget.question) {
          return
        }

        message = await updateMutation.mutateAsync({
          id: formTarget.question.id,
          payload: payload as UpdateQuestionRequest,
        })
      }

      await queryClient.invalidateQueries({
        queryKey: questionQueryKeys.all,
      })

      setFormTarget(null)
      setPageMessage({
        text: message,
        tone: 'success',
      })
    } catch (error) {
      setFormError(
        getErrorMessage(error) ??
          'Không thể xử lý câu hỏi. Vui lòng thử lại.',
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
      aria-labelledby="teacher-questions-title"
    >
      <QuestionPageHeader
        isRefreshing={questionsQuery.isFetching}
        onBack={topicId ? handleBack : undefined}
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

      <QuestionTable
        errorMessage={getErrorMessage(questionsQuery.error)}
        footer={
          <QuestionPagination
            isDisabled={
              questionsQuery.isLoading || questionsQuery.isError
            }
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            page={page}
            pageSize={pageSize}
            totalElements={totalElements}
            totalPages={totalPages}
          />
        }
        isError={questionsQuery.isError}
        isLoading={questionsQuery.isLoading}
        onEdit={handleOpenEdit}
        onRetry={handleRetryList}
        onSelect={setSelectedId}
        questions={questions}
        selectedId={effectiveSelectedId}
      />

      <QuestionFormDialog
        errorMessage={formError ?? undefined}
        isSubmitting={isFormPending}
        mode={formTarget?.mode ?? null}
        onClose={handleCloseForm}
        onSubmit={handleFormSubmit}
        question={formTarget?.question ?? null}
        topicId={topicId}
      />
    </section>
  )
}
