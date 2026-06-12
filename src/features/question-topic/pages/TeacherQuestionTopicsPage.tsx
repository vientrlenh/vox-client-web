import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import type { QuestionModuleScope } from '@/features/question-bank/api/useQuestionBanksQuery'
import { useQuestionTopicQuery } from '../api/useQuestionTopicQuery'
import { useQuestionTopicsQuery } from '../api/useQuestionTopicsQuery'
import { QuestionTopicPageHeader } from '../components/QuestionTopicPageHeader'
import { QuestionTopicPagination } from '../components/QuestionTopicPagination'
import { QuestionTopicTable } from '../components/QuestionTopicTable'

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

type QuestionTopicsPageProps = {
  basePath: string
  scope: QuestionModuleScope
  title?: string
}

function QuestionTopicsPage({
  basePath,
  scope,
  title = 'Chủ đề câu hỏi',
}: QuestionTopicsPageProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const bankId = searchParams.get('bankId') ?? ''
  const bankName = searchParams.get('bankName') ?? ''
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const questionTopicsQuery = useQuestionTopicsQuery(scope, bankId, page, pageSize)
  const questionTopics = questionTopicsQuery.data?.content ?? []
  const selectedListTopic =
    questionTopics.find((topic) => topic.id === selectedId) ??
    questionTopics[0] ??
    null
  const effectiveSelectedId = selectedListTopic?.id ?? null

  useQuestionTopicQuery(scope, effectiveSelectedId)

  function handleBack() {
    navigate(`${basePath}/question-banks`)
  }

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
      aria-labelledby="teacher-question-topics-title"
      className="grid gap-6"
    >
      <QuestionTopicPageHeader
        bankName={bankName}
        description="Danh sách chủ đề thuộc ngân hàng câu hỏi theo quyền của bạn."
        isRefreshing={questionTopicsQuery.isFetching}
        onBack={handleBack}
        onRefresh={() => {
          void questionTopicsQuery.refetch()
        }}
        title={title}
      />

      <QuestionTopicTable
        errorMessage={getErrorMessage(questionTopicsQuery.error)}
        footer={
          <QuestionTopicPagination
            isDisabled={questionTopicsQuery.isLoading || questionTopicsQuery.isError}
            onPageChange={(nextPage) => {
              setSelectedId(null)
              setPage(nextPage)
            }}
            onPageSizeChange={(nextPageSize) => {
              setSelectedId(null)
              setPage(DEFAULT_PAGE)
              setPageSize(nextPageSize)
            }}
            page={page}
            pageSize={pageSize}
            totalElements={questionTopicsQuery.data?.totalElements ?? 0}
            totalPages={questionTopicsQuery.data?.totalPages ?? 0}
          />
        }
        isError={questionTopicsQuery.isError}
        isLoading={questionTopicsQuery.isLoading}
        onRetry={() => {
          void questionTopicsQuery.refetch()
        }}
        onSelect={setSelectedId}
        onViewQuestions={(topic) => {
          navigate(
            `${basePath}/questions/all?bankId=${bankId}&topicId=${topic.id}&topicName=${encodeURIComponent(topic.name)}`,
          )
        }}
        questionTopics={questionTopics}
        selectedId={effectiveSelectedId}
      />
    </section>
  )
}

export function TeacherQuestionTopicsPage() {
  return <QuestionTopicsPage basePath="/teacher" scope="teacher" />
}

export function SchoolAdminQuestionTopicsPage() {
  return <QuestionTopicsPage basePath="/school-admin" scope="school" />
}

export function SystemAdminQuestionTopicsPage() {
  return <QuestionTopicsPage basePath="/system-admin" scope="admin" />
}
