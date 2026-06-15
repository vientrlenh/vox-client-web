import type { FormEvent } from 'react'
import { useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { useAppSelector } from '@/app/store/hooks'
import type { QuestionModuleScope } from '@/features/question-bank/api/useQuestionBanksQuery'
import { useQuestionQuery } from '../api/useQuestionQuery'
import {
  type QuestionQueryFilters,
  type QuestionListView,
  useQuestionsByTopicQuery,
  useQuestionsQuery,
} from '../api/useQuestionsQuery'
import { QuestionPageHeader } from '../components/QuestionPageHeader'
import { QuestionPagination } from '../components/QuestionPagination'
import { QuestionTable } from '../components/QuestionTable'
import {
  canCreateQuestion,
  canEditQuestion,
  getQuestionActorRole,
  getTeacherQuestionContext,
} from '../permissions'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10
const DEFAULT_FILTERS: QuestionQueryFilters = {
  includeArchived: false,
  keyword: '',
  scope: '',
  status: '',
  type: '',
}
const QUESTION_SCOPE_OPTIONS = [
  { label: 'Tat ca scope', value: '' },
  { label: 'Ngan hang cau hoi', value: 'QUESTION_BANK' },
  { label: 'Danh gia lop', value: 'CLASSROOM_ASSESSMENT' },
  { label: 'De thi nhap', value: 'CENTRAL_EXAM_DRAFT' },
  { label: 'De thi chinh thuc', value: 'CENTRAL_EXAM_PAPER' },
]
const QUESTION_STATUS_OPTIONS = [
  { label: 'Tat ca trang thai', value: '' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Submitted for review', value: 'SUBMITTED_FOR_REVIEW' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Published', value: 'PUBLISHED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Revision requested', value: 'REVISION_REQUESTED' },
  { label: 'Archived', value: 'ARCHIVED' },
]
const QUESTION_TYPE_OPTIONS = [
  { label: 'Tat ca loai', value: '' },
  { label: 'Read aloud', value: 'READ_ALOUD' },
  { label: 'Short answer', value: 'SHORT_ANSWER' },
  { label: 'Long answer', value: 'LONG_ANSWER' },
  { label: 'Opinion', value: 'OPINION' },
  { label: 'Description', value: 'DESCRIPTION' },
]

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
  const location = useLocation()
  const user = useAppSelector((state) => state.auth.user)
  const [searchParams] = useSearchParams()
  const bankId = searchParams.get('bankId') ?? ''
  const topicId = searchParams.get('topicId') ?? ''
  const topicName = searchParams.get('topicName') ?? ''
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draftFilters, setDraftFilters] = useState<QuestionQueryFilters>(DEFAULT_FILTERS)
  const [filters, setFilters] = useState<QuestionQueryFilters>(DEFAULT_FILTERS)

  const isTopicView = Boolean(bankId && topicId)
  const supportsFilters = isTopicView || view === 'all'
  const showScopeFilter = isTopicView || scope !== 'admin'
  const showTypeFilter = isTopicView || scope !== 'admin'
  const showIncludeArchived = scope === 'admin' && supportsFilters
  const activeFilters = supportsFilters ? filters : DEFAULT_FILTERS
  const listQuery = useQuestionsQuery(scope, view, page, pageSize, activeFilters)
  const topicQuery = useQuestionsByTopicQuery(
    scope,
    bankId,
    topicId,
    page,
    pageSize,
    activeFilters,
  )
  const questionsQuery = isTopicView ? topicQuery : listQuery
  const questions = questionsQuery.data?.content ?? []
  const flashMessage =
    (location.state as { successMessage?: string } | null)?.successMessage ?? null
  const actorRole = getQuestionActorRole(user?.roles)
  const teacherContext = getTeacherQuestionContext(view)
  const selectedListQuestion =
    questions.find((question) => question.id === selectedId) ??
    questions[0] ??
    null
  const effectiveSelectedId = selectedListQuestion?.id ?? null

  useQuestionQuery(effectiveSelectedId)

  if (view === 'my' && !allowMyView) {
    return null
  }

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSelectedId(null)
    setPage(DEFAULT_PAGE)
    setFilters(draftFilters)
  }

  function handleFilterReset() {
    setSelectedId(null)
    setPage(DEFAULT_PAGE)
    setDraftFilters(DEFAULT_FILTERS)
    setFilters(DEFAULT_FILTERS)
  }

  return (
    <section aria-labelledby="teacher-questions-title" className="grid gap-6">
      <QuestionPageHeader
        createLabel="Tao cau hoi"
        description={getQuestionViewDescription(view, topicName)}
        isCreateDisabled={false}
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
        onCreate={
          canCreateQuestion(actorRole)
            ? () => {
                const createUrl = new URL(`${window.location.origin}${basePath}/questions/create`)

                if (bankId) {
                  createUrl.searchParams.set('bankId', bankId)
                }

                const bankName = searchParams.get('bankName')
                if (bankName) {
                  createUrl.searchParams.set('bankName', bankName)
                }

                if (topicId) {
                  createUrl.searchParams.set('topicId', topicId)
                }

                if (topicName) {
                  createUrl.searchParams.set('topicName', topicName)
                }

                navigate(`${createUrl.pathname}${createUrl.search}`)
              }
            : undefined
        }
        onRefresh={() => {
          void questionsQuery.refetch()
        }}
        title={getQuestionViewTitle(view)}
      />

      {flashMessage ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {flashMessage}
        </div>
      ) : null}

      {supportsFilters ? (
        <form
          className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5"
          onSubmit={handleFilterSubmit}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-blue-950">Tim kiem question</h2>
              <p className="text-sm text-slate-600">
                Loc danh sach theo cac tham so backend ho tro.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Tu khoa
              <input
                className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    keyword: event.target.value,
                  }))
                }
                placeholder="Nhap ma, noi dung, prompt..."
                value={draftFilters.keyword}
              />
            </label>

            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Trang thai
              <select
                className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    status: event.target.value,
                  }))
                }
                value={draftFilters.status}
              >
                {QUESTION_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {showTypeFilter ? (
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Loai cau hoi
                <select
                  className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      type: event.target.value,
                    }))
                  }
                  value={draftFilters.type}
                >
                  {QUESTION_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {showScopeFilter ? (
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Scope
                <select
                  className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      scope: event.target.value,
                    }))
                  }
                  value={draftFilters.scope}
                >
                  {QUESTION_SCOPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {showIncludeArchived ? (
              <label className="inline-flex items-center gap-2 text-sm font-bold text-slate-700">
                <input
                  checked={draftFilters.includeArchived ?? false}
                  className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      includeArchived: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                Bao gom archived
              </label>
            ) : (
              <div />
            )}

            <div className="flex flex-wrap gap-3">
              <button
                className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                onClick={handleFilterReset}
                type="button"
              >
                Dat lai
              </button>
              <button
                className="inline-flex h-11 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700"
                type="submit"
              >
                Tim kiem
              </button>
            </div>
          </div>
        </form>
      ) : null}

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
        canEdit={(question) => canEditQuestion(question, actorRole, teacherContext)}
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
        onEdit={(question) => {
          navigate(`${basePath}/questions/${question.id}/edit`, {
            state: { fromView: view },
          })
        }}
        onRetry={() => {
          void questionsQuery.refetch()
        }}
        onSelect={(id) => {
          setSelectedId(id)
          navigate(`${basePath}/questions/${id}`, {
            state: { fromView: view },
          })
        }}
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
