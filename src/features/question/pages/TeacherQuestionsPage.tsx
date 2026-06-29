import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { useAppSelector } from '@/app/store/hooks'
import type { QuestionModuleScope } from '@/features/question-bank/api/useQuestionBanksQuery'
import { useQuestionsQuery, type QuestionQueryFilters } from '../api/useQuestionsQuery'
import { QuestionPageHeader } from '../components/QuestionPageHeader'
import { QuestionPagination } from '../components/QuestionPagination'
import { QuestionTable } from '../components/QuestionTable'
import {
  canCreateQuestion,
  canEditQuestion,
  getQuestionActorRole,
  getTeacherQuestionContext,
} from '../permissions'
import type {
  QuestionScope,
  QuestionSharing,
  QuestionStatus,
  QuestionType,
} from '../types'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10

const EMPTY_FILTERS: QuestionQueryFilters = {
  keyword: '',
  questionBankId: '',
  questionTopicId: '',
  scope: '',
  sharing: '',
  status: '',
  topicName: '',
  type: '',
}

const QUESTION_STATUS_OPTIONS: Array<{ label: string; value: '' | QuestionStatus }> = [
  { label: 'Tat ca trang thai', value: '' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Submitted for review', value: 'SUBMITTED_FOR_REVIEW' },
  { label: 'Revision requested', value: 'REVISION_REQUESTED' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Published', value: 'PUBLISHED' },
  { label: 'Archived', value: 'ARCHIVED' },
]

const QUESTION_TYPE_OPTIONS: Array<{ label: string; value: '' | QuestionType }> = [
  { label: 'Tat ca loai', value: '' },
  { label: 'Read aloud', value: 'READ_ALOUD' },
  { label: 'Short answer', value: 'SHORT_ANSWER' },
  { label: 'Long answer', value: 'LONG_ANSWER' },
  { label: 'Opinion', value: 'OPINION' },
  { label: 'Description', value: 'DESCRIPTION' },
]

const QUESTION_SHARING_OPTIONS: Array<{ label: string; value: '' | QuestionSharing }> = [
  { label: 'Tat ca chia se', value: '' },
  { label: 'Private', value: 'PRIVATE' },
  { label: 'School shared', value: 'SCHOOL_SHARED' },
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

function getTitle(view: QuestionListView, teacherScopeTab: QuestionScope) {
  if (view === 'review') {
    return 'Cau hoi can toi duyet'
  }

  if (teacherScopeTab === 'MINE') {
    return 'Cau hoi cua toi'
  }

  if (teacherScopeTab === 'COLLABORATING') {
    return 'Cau hoi duoc chia se'
  }

  return 'Cau hoi trong truong'
}

function getDescription(
  view: QuestionListView,
  teacherScopeTab: QuestionScope,
  topicName?: string,
) {
  if (topicName) {
    return `Danh sach cau hoi thuoc chu de ${topicName}.`
  }

  if (view === 'review') {
    return 'Hang doi cac cau hoi can ban duyet hoac phan hoi.'
  }

  if (teacherScopeTab === 'MINE') {
    return 'Tap hop cau hoi ban tao va dang quan ly.'
  }

  if (teacherScopeTab === 'COLLABORATING') {
    return 'Cau hoi duoc chia se rieng voi ban theo co che collaborator.'
  }

  return 'Tat ca cau hoi ban duoc phep xem trong truong.'
}

type QuestionListView = 'all' | 'my' | 'review'

type QuestionsPageProps = {
  allowTeacherTabs: boolean
  basePath: string
  scope: QuestionModuleScope
  view: QuestionListView
}

function QuestionsPage({
  allowTeacherTabs,
  basePath,
  scope,
  view,
}: QuestionsPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAppSelector((state) => state.auth.user)
  const [searchParams] = useSearchParams()
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [draftFilters, setDraftFilters] = useState<QuestionQueryFilters>({
    ...EMPTY_FILTERS,
    questionBankId: searchParams.get('bankId') ?? '',
    questionTopicId: searchParams.get('topicId') ?? '',
    topicName: searchParams.get('topicName') ?? '',
  })
  const [filters, setFilters] = useState<QuestionQueryFilters>({
    ...EMPTY_FILTERS,
    questionBankId: searchParams.get('bankId') ?? '',
    questionTopicId: searchParams.get('topicId') ?? '',
    topicName: searchParams.get('topicName') ?? '',
  })

  const teacherScopeTab = useMemo<QuestionScope>(() => {
    if (!allowTeacherTabs) {
      return 'ALL'
    }

    const tab = searchParams.get('tab')
    if (tab === 'collaborating') {
      return 'COLLABORATING'
    }
    if (tab === 'all') {
      return 'ALL'
    }
    return 'MINE'
  }, [allowTeacherTabs, searchParams])

  const actorRole = getQuestionActorRole(user?.roles)
  const teacherContext = getTeacherQuestionContext(view)

  const effectiveFilters: QuestionQueryFilters = {
    ...filters,
    scope:
      allowTeacherTabs && view !== 'review'
        ? teacherScopeTab
        : scope === 'teacher' && view === 'review'
          ? 'COLLABORATING'
          : filters.scope,
  }

  const questionsQuery = useQuestionsQuery(scope, view, page, pageSize, effectiveFilters)
  const flashMessage =
    (location.state as { successMessage?: string } | null)?.successMessage ?? null

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPage(DEFAULT_PAGE)
    setFilters(draftFilters)
  }

  function handleFilterReset() {
    const next = {
      ...EMPTY_FILTERS,
      questionBankId: searchParams.get('bankId') ?? '',
      questionTopicId: searchParams.get('topicId') ?? '',
      topicName: searchParams.get('topicName') ?? '',
    }
    setPage(DEFAULT_PAGE)
    setDraftFilters(next)
    setFilters(next)
  }

  return (
    <section aria-labelledby="questions-title" className="grid gap-6">
      <QuestionPageHeader
        createLabel="Tao cau hoi moi"
        description={getDescription(view, teacherScopeTab, filters.topicName)}
        isRefreshing={questionsQuery.isFetching}
        onBack={
          filters.questionBankId && filters.questionTopicId
            ? () => navigate(-1)
            : undefined
        }
        onCreate={
          canCreateQuestion(actorRole)
            ? () => {
                const url = new URL(
                  `${window.location.origin}${basePath}/questions/create`,
                )

                if (filters.questionBankId) {
                  url.searchParams.set('bankId', filters.questionBankId)
                }
                if (filters.questionTopicId) {
                  url.searchParams.set('topicId', filters.questionTopicId)
                }
                if (filters.topicName) {
                  url.searchParams.set('topicName', filters.topicName)
                }

                navigate(`${url.pathname}${url.search}`)
              }
            : undefined
        }
        onRefresh={() => {
          void questionsQuery.refetch()
        }}
        title={getTitle(view, teacherScopeTab)}
      />

      {flashMessage ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {flashMessage}
        </div>
      ) : null}

      {allowTeacherTabs && view !== 'review' ? (
        <div className="rounded-lg border border-slate-200 bg-white p-1">
          <div className="flex flex-wrap gap-2">
            <TabButton
              isActive={teacherScopeTab === 'MINE'}
              label="Cua toi"
              onClick={() => navigate(`${basePath}/questions/my?tab=mine`)}
            />
            <TabButton
              isActive={teacherScopeTab === 'COLLABORATING'}
              label="Duoc chia se"
              onClick={() => navigate(`${basePath}/questions/my?tab=collaborating`)}
            />
            <TabButton
              isActive={teacherScopeTab === 'ALL'}
              label="Toan truong"
              onClick={() => navigate(`${basePath}/questions/my?tab=all`)}
            />
          </div>
        </div>
      ) : null}

      <form
        className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5"
        onSubmit={handleFilterSubmit}
      >
        <div>
          <h2 className="text-base font-black text-blue-950">Tim kiem question</h2>
          <p className="text-sm text-slate-600">
            Loc danh sach theo trang thai, loai, chia se va tu khoa.
          </p>
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
              placeholder="Ma, noi dung, prompt..."
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
                  status: event.target.value as QuestionQueryFilters['status'],
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

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Loai cau hoi
            <select
              className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  type: event.target.value as QuestionQueryFilters['type'],
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

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Chia se
            <select
              className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  sharing: event.target.value as QuestionQueryFilters['sharing'],
                }))
              }
              value={draftFilters.sharing}
            >
              {QUESTION_SHARING_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap justify-end gap-3">
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
      </form>

      <QuestionTable
        canEdit={(question) =>
          canEditQuestion(question, actorRole, teacherContext, user?.userId)
        }
        errorMessage={getErrorMessage(questionsQuery.error)}
        footer={
          <QuestionPagination
            isDisabled={questionsQuery.isLoading || questionsQuery.isError}
            onPageChange={(nextPage) => {
              setPage(nextPage)
            }}
            onPageSizeChange={(nextPageSize) => {
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
          navigate(`${basePath}/questions/${id}`, {
            state: { fromView: view },
          })
        }}
        questions={questionsQuery.data?.content ?? []}
        selectedId={null}
      />
    </section>
  )
}

function TabButton({
  isActive,
  label,
  onClick,
}: {
  isActive: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      className={[
        'rounded-lg px-4 py-2 text-sm font-bold transition',
        isActive ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50',
      ].join(' ')}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  )
}

export function TeacherMyQuestionsPage() {
  return (
    <QuestionsPage
      allowTeacherTabs
      basePath="/teacher"
      scope="teacher"
      view="my"
    />
  )
}

export function TeacherQuestionsPage() {
  return (
    <QuestionsPage
      allowTeacherTabs
      basePath="/teacher"
      scope="teacher"
      view="all"
    />
  )
}

export function TeacherReviewQuestionsPage() {
  return (
    <QuestionsPage
      allowTeacherTabs={false}
      basePath="/teacher"
      scope="teacher"
      view="review"
    />
  )
}

export function SchoolAdminQuestionsPage() {
  return (
    <QuestionsPage
      allowTeacherTabs={false}
      basePath="/school-admin"
      scope="school"
      view="all"
    />
  )
}

export function SchoolAdminReviewQuestionsPage() {
  return (
    <QuestionsPage
      allowTeacherTabs={false}
      basePath="/school-admin"
      scope="school"
      view="review"
    />
  )
}

export function SystemAdminQuestionsPage() {
  return (
    <QuestionsPage
      allowTeacherTabs={false}
      basePath="/system-admin"
      scope="admin"
      view="all"
    />
  )
}

export function SystemAdminReviewQuestionsPage() {
  return (
    <QuestionsPage
      allowTeacherTabs={false}
      basePath="/system-admin"
      scope="admin"
      view="review"
    />
  )
}
