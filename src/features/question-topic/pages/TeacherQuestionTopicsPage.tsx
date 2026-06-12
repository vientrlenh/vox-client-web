import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router'
import {
  useCreateQuestionTopicMutation,
  useUpdateQuestionTopicMutation,
} from '../api/useQuestionTopicMutations'
import { useQuestionTopicQuery } from '../api/useQuestionTopicQuery'
import {
  questionTopicQueryKeys,
  useQuestionTopicsQuery,
} from '../api/useQuestionTopicsQuery'
import type { QuestionTopicFormMode } from '../components/QuestionTopicFormDialog'
import { QuestionTopicFormDialog } from '../components/QuestionTopicFormDialog'
import { QuestionTopicPageHeader } from '../components/QuestionTopicPageHeader'
import { QuestionTopicPagination } from '../components/QuestionTopicPagination'
import { QuestionTopicTable } from '../components/QuestionTopicTable'
import type {
  CreateQuestionTopicRequest,
  QuestionTopicDto,
  UpdateQuestionTopicRequest,
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
  mode: QuestionTopicFormMode
  questionTopic: QuestionTopicDto | null
}

type PageMessage = {
  text: string
  tone: 'error' | 'success'
}

export function TeacherQuestionTopicsPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const bankId = searchParams.get('bankId') ?? ''
  const bankName = searchParams.get('bankName') ?? ''
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [pageMessage, setPageMessage] = useState<PageMessage | null>(null)
  const createMutation = useCreateQuestionTopicMutation()
  const updateMutation = useUpdateQuestionTopicMutation()
  const questionTopicsQuery = useQuestionTopicsQuery(bankId, page, pageSize)
  const questionTopics = questionTopicsQuery.data?.content ?? []
  const selectedListTopic =
    questionTopics.find((topic) => topic.id === selectedId) ??
    questionTopics[0] ??
    null
  const effectiveSelectedId = selectedListTopic?.id ?? null
  const questionTopicQuery = useQuestionTopicQuery(effectiveSelectedId)
  const totalElements = questionTopicsQuery.data?.totalElements ?? 0
  const totalPages = questionTopicsQuery.data?.totalPages ?? 0
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
    void questionTopicsQuery.refetch()
  }

  function handleRetryList() {
    void questionTopicsQuery.refetch()
  }

  function handleViewQuestions(topic: QuestionTopicDto) {
    navigate(
      `/teacher/questions?topicId=${topic.id}`,
    )
  }

  function handleBack() {
    navigate('/teacher/question-banks')
  }

  function handleOpenCreate() {
    setFormError(null)
    setFormTarget({ mode: 'create', questionTopic: null })
  }

  function handleOpenEdit(topic: QuestionTopicDto) {
    setSelectedId(topic.id)
    setFormError(null)
    setFormTarget({ mode: 'edit', questionTopic: topic })
  }

  function handleCloseForm() {
    if (isFormPending) {
      return
    }

    setFormError(null)
    setFormTarget(null)
  }

  async function handleFormSubmit(
    mode: QuestionTopicFormMode,
    payload: CreateQuestionTopicRequest | UpdateQuestionTopicRequest,
  ) {
    if (!formTarget) {
      return
    }

    try {
      setFormError(null)

      let message: string

      if (mode === 'create') {
        message = await createMutation.mutateAsync(
          payload as CreateQuestionTopicRequest,
        )
      } else {
        if (!formTarget.questionTopic) {
          return
        }

        message = await updateMutation.mutateAsync({
          id: formTarget.questionTopic.id,
          payload: payload as UpdateQuestionTopicRequest,
        })
      }

      await queryClient.invalidateQueries({
        queryKey: questionTopicQueryKeys.all,
      })

      setFormTarget(null)
      setPageMessage({
        text: message,
        tone: 'success',
      })
    } catch (error) {
      setFormError(
        getErrorMessage(error) ??
          'Không thể xử lý chủ đề. Vui lòng thử lại.',
      )
    }
  }

  const pageMessageClassName =
    pageMessage?.tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-red-200 bg-red-50 text-red-700'

  if (!bankId) {
    return (
      <section className="grid gap-6">
        <div className="flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center">
          <p className="text-sm font-bold text-red-600">
            Không tìm thấy ngân hàng câu hỏi. Vui lòng chọn một ngân hàng trước.
          </p>
          <button
            className="mt-4 inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
            onClick={handleBack}
            type="button"
          >
            Quay lại danh sách ngân hàng
          </button>
        </div>
      </section>
    )
  }

  return (
    <section
      className="grid gap-6"
      aria-labelledby="teacher-question-topics-title"
    >
      <QuestionTopicPageHeader
        bankName={bankName}
        isRefreshing={questionTopicsQuery.isFetching}
        onBack={handleBack}
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

      <QuestionTopicTable
        errorMessage={getErrorMessage(questionTopicsQuery.error)}
        footer={
          <QuestionTopicPagination
            isDisabled={
              questionTopicsQuery.isLoading || questionTopicsQuery.isError
            }
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            page={page}
            pageSize={pageSize}
            totalElements={totalElements}
            totalPages={totalPages}
          />
        }
        isError={questionTopicsQuery.isError}
        isLoading={questionTopicsQuery.isLoading}
        onEdit={handleOpenEdit}
        onRetry={handleRetryList}
        onSelect={setSelectedId}
        onViewQuestions={handleViewQuestions}
        questionTopics={questionTopics}
        selectedId={effectiveSelectedId}
      />

      <QuestionTopicFormDialog
        bankId={bankId}
        errorMessage={formError ?? undefined}
        isSubmitting={isFormPending}
        mode={formTarget?.mode ?? null}
        onClose={handleCloseForm}
        onSubmit={handleFormSubmit}
        questionTopic={formTarget?.questionTopic ?? null}
      />
    </section>
  )
}
