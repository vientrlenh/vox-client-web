import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import type { QuestionModuleScope } from '@/features/question-bank/api/useQuestionBanksQuery'
import { useQuestionQuery } from '../api/useQuestionQuery'
import {
  type QuestionListView,
  useQuestionsByTopicQuery,
  useQuestionsQuery,
} from '../api/useQuestionsQuery'
import { QuestionPageHeader } from '../components/QuestionPageHeader'
import { QuestionPagination } from '../components/QuestionPagination'
import { QuestionTable } from '../components/QuestionTable'

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

function getQuestionViewTitle(view: QuestionListView) {
  switch (view) {
    case 'my':
      return 'Câu hỏi của tôi'
    case 'review':
      return 'Duyệt câu hỏi'
    default:
      return 'Tất cả câu hỏi'
  }
}

function getQuestionViewDescription(view: QuestionListView, topicName?: string) {
  if (topicName) {
    return `Danh sách câu hỏi thuộc chủ đề: ${topicName}`
  }

  switch (view) {
    case 'my':
      return 'Danh sách câu hỏi do bạn tạo hoặc sở hữu.'
    case 'review':
      return 'Danh sách câu hỏi đang chờ duyệt theo quyền hiện tại.'
    default:
      return 'Danh sách câu hỏi bạn được phép xem trong hệ thống.'
  }
}

type QuestionsPageProps = {
  allowMyView: boolean
  basePath: string
  scope: QuestionModuleScope
  view: QuestionListView
}

function QuestionsPage({
  allowMyView,
  basePath,
  scope,
  view,
}: QuestionsPageProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const bankId = searchParams.get('bankId') ?? ''
  const topicId = searchParams.get('topicId') ?? ''
  const topicName = searchParams.get('topicName') ?? ''
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const isTopicView = Boolean(bankId && topicId)
  const listQuery = useQuestionsQuery(scope, view, page, pageSize)
  const topicQuery = useQuestionsByTopicQuery(scope, bankId, topicId, page, pageSize)
  const questionsQuery = isTopicView ? topicQuery : listQuery
  const questions = questionsQuery.data?.content ?? []
  const selectedListQuestion =
    questions.find((question) => question.id === selectedId) ??
    questions[0] ??
    null
  const effectiveSelectedId = selectedListQuestion?.id ?? null

  useQuestionQuery(effectiveSelectedId)

  if (view === 'my' && !allowMyView) {
    return null
  }

  return (
    <section aria-labelledby="teacher-questions-title" className="grid gap-6">
      <QuestionPageHeader
        description={getQuestionViewDescription(view, topicName)}
        isRefreshing={questionsQuery.isFetching}
        onBack={
          isTopicView
            ? () => {
                navigate(
                  `${basePath}/question-topics?bankId=${bankId}&bankName=${searchParams.get('bankName') ?? ''}`,
                )
              }
            : undefined
        }
        onRefresh={() => {
          void questionsQuery.refetch()
        }}
        title={getQuestionViewTitle(view)}
      />

      <div className="rounded-lg border border-slate-200 bg-white p-1">
        <div className="flex flex-wrap gap-2">
          {allowMyView ? (
            <button
              className={[
                'rounded-lg px-4 py-2 text-sm font-bold transition',
                view === 'my'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:bg-slate-50',
              ].join(' ')}
              onClick={() => navigate(`${basePath}/questions/my`)}
              type="button"
            >
              My question
            </button>
          ) : null}
          <button
            className={[
              'rounded-lg px-4 py-2 text-sm font-bold transition',
              view === 'all'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 hover:bg-slate-50',
            ].join(' ')}
            onClick={() => navigate(`${basePath}/questions/all`)}
            type="button"
          >
            Question tổng
          </button>
          <button
            className={[
              'rounded-lg px-4 py-2 text-sm font-bold transition',
              view === 'review'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 hover:bg-slate-50',
            ].join(' ')}
            onClick={() => navigate(`${basePath}/questions/review`)}
            type="button"
          >
            Duyệt question
          </button>
        </div>
      </div>

      <QuestionTable
        errorMessage={getErrorMessage(questionsQuery.error)}
        footer={
          <QuestionPagination
            isDisabled={questionsQuery.isLoading || questionsQuery.isError}
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
            totalElements={questionsQuery.data?.totalElements ?? 0}
            totalPages={questionsQuery.data?.totalPages ?? 0}
          />
        }
        isError={questionsQuery.isError}
        isLoading={questionsQuery.isLoading}
        onRetry={() => {
          void questionsQuery.refetch()
        }}
        onSelect={setSelectedId}
        questions={questions}
        selectedId={effectiveSelectedId}
      />
    </section>
  )
}

export function TeacherMyQuestionsPage() {
  return (
    <QuestionsPage
      allowMyView
      basePath="/teacher"
      scope="teacher"
      view="my"
    />
  )
}

export function TeacherQuestionsPage() {
  return (
    <QuestionsPage
      allowMyView
      basePath="/teacher"
      scope="teacher"
      view="all"
    />
  )
}

export function TeacherReviewQuestionsPage() {
  return (
    <QuestionsPage
      allowMyView
      basePath="/teacher"
      scope="teacher"
      view="review"
    />
  )
}

export function SchoolAdminQuestionsPage() {
  return (
    <QuestionsPage
      allowMyView={false}
      basePath="/school-admin"
      scope="school"
      view="all"
    />
  )
}

export function SchoolAdminReviewQuestionsPage() {
  return (
    <QuestionsPage
      allowMyView={false}
      basePath="/school-admin"
      scope="school"
      view="review"
    />
  )
}

export function SystemAdminQuestionsPage() {
  return (
    <QuestionsPage
      allowMyView={false}
      basePath="/system-admin"
      scope="admin"
      view="all"
    />
  )
}

export function SystemAdminReviewQuestionsPage() {
  return (
    <QuestionsPage
      allowMyView={false}
      basePath="/system-admin"
      scope="admin"
      view="review"
    />
  )
}
