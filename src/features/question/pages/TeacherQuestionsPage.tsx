import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { useAppSelector } from '@/app/store/hooks'
import type { QuestionModuleScope } from '@/features/question-bank/api/useQuestionBanksQuery'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { exportQuestions } from '../api/useQuestionExport'
import { useReviewQuestionMutation } from '../api/useQuestionReviewMutation'
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
import { questionQueryKeys } from '../api/useQuestionsQuery'
import { useConfirmationDialog } from '@/shared/ui/ConfirmationDialog'

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
  { label: 'Tất cả trạng thái', value: '' },
  { label: 'Bản nháp', value: 'DRAFT' },
  { label: 'Submitted for review', value: 'SUBMITTED_FOR_REVIEW' },
  { label: 'Revision requested', value: 'REVISION_REQUESTED' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Published', value: 'PUBLISHED' },
  { label: 'Archived', value: 'ARCHIVED' },
]

const QUESTION_TYPE_OPTIONS: Array<{ label: string; value: '' | QuestionType }> = [
  { label: 'Tất cả loại', value: '' },
  { label: 'Read aloud', value: 'READ_ALOUD' },
  { label: 'Short answer', value: 'SHORT_ANSWER' },
  { label: 'Long answer', value: 'LONG_ANSWER' },
  { label: 'Opinion', value: 'OPINION' },
  { label: 'Description', value: 'DESCRIPTION' },
]

const QUESTION_SHARING_OPTIONS: Array<{ label: string; value: '' | QuestionSharing }> = [
  { label: 'Tất cả chia sẻ', value: '' },
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
    return 'Câu hỏi cần tôi duyệt'
  }

  if (teacherScopeTab === 'MINE') {
    return 'Câu hỏi của tôi'
  }

  if (teacherScopeTab === 'COLLABORATING') {
    return 'Câu hỏi được chia sẻ'
  }

  return 'Câu hỏi trong trường'
}

function getDescription(
  view: QuestionListView,
  teacherScopeTab: QuestionScope,
  topicName?: string,
) {
  if (topicName) {
    return `Danh sách câu hỏi thuộc chủ đề ${topicName}.`
  }

  if (view === 'review') {
    return 'Hàng đợi các câu hỏi cần bạn duyệt hoặc phản hồi.'
  }

  if (teacherScopeTab === 'MINE') {
    return 'Tập hợp câu hỏi bạn tạo và đang quản lý.'
  }

  if (teacherScopeTab === 'COLLABORATING') {
    return 'Câu hỏi được chia sẻ riêng với bạn theo cơ chế cộng tác.'
  }

  return 'Tất cả câu hỏi bạn được phép xem trong trường.'
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
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAppSelector((state) => state.auth.user)
  const [searchParams] = useSearchParams()
  const reviewMutation = useReviewQuestionMutation()
  const { confirm, dialog } = useConfirmationDialog()
  const initialStatus: '' | QuestionStatus =
    view === 'review' ? 'SUBMITTED_FOR_REVIEW' : ''
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [isExporting, setIsExporting] = useState(false)
  const [isBulkApproving, setIsBulkApproving] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [bulkSelection, setBulkSelection] = useState<string[]>([])
  const [draftFilters, setDraftFilters] = useState<QuestionQueryFilters>({
    ...EMPTY_FILTERS,
    questionBankId: searchParams.get('bankId') ?? '',
    questionTopicId: searchParams.get('topicId') ?? '',
    status: initialStatus,
    topicName: searchParams.get('topicName') ?? '',
  })
  const [filters, setFilters] = useState<QuestionQueryFilters>({
    ...EMPTY_FILTERS,
    questionBankId: searchParams.get('bankId') ?? '',
    questionTopicId: searchParams.get('topicId') ?? '',
    status: initialStatus,
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
    if (tab === 'mine') {
      return 'MINE'
    }
    // Khong co param tab (vd link tu Topic detail sang /teacher/questions/all?bankId=...&topicId=...)
    // thi mac dinh theo dung danh tinh cua route: trang "/all" phai mac dinh la ALL, khong roi ve MINE.
    return view === 'all' ? 'ALL' : 'MINE'
  }, [allowTeacherTabs, searchParams, view])

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
  const [toastMessage, setToastMessage] = useState<string | null>(flashMessage)

  useEffect(() => {
    if (!flashMessage) {
      return
    }

    setToastMessage(flashMessage)
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [flashMessage, location.pathname, location.search, navigate])

  useEffect(() => {
    setBulkSelection((current) =>
      current.filter((id) => questionsQuery.data?.content.some((question) => question.id === id)),
    )
  }, [questionsQuery.data?.content])

  async function handleExport() {
    setIsExporting(true)
    setExportError(null)
    try {
      await exportQuestions(effectiveFilters)
    } catch (error) {
      setExportError(getErrorMessage(error) ?? 'Không thể xuất file. Vui lòng thử lại.')
    } finally {
      setIsExporting(false)
    }
  }

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
      status: initialStatus,
      topicName: searchParams.get('topicName') ?? '',
    }
    setPage(DEFAULT_PAGE)
    setDraftFilters(next)
    setFilters(next)
  }

  async function handleBulkApprove() {
    const selectedQuestions = (questionsQuery.data?.content ?? []).filter((question) =>
      bulkSelection.includes(question.id),
    )

    if (!selectedQuestions.length) {
      setExportError('Hãy chọn ít nhất một câu hỏi để duyệt hàng loạt.')
      return
    }

    if (
      !(await confirm({
        message: `Bạn có chắc muốn duyệt ${selectedQuestions.length} câu hỏi đã chọn không?`,
      }))
    ) {
      return
    }

    setIsBulkApproving(true)
    setExportError(null)

    let successCount = 0
    const failedCodes: string[] = []

    try {
      for (const question of selectedQuestions) {
        try {
          await reviewMutation.mutateAsync({
            payload: { action: 'APPROVE', note: null },
            questionId: question.id,
          })
          successCount += 1
        } catch {
          failedCodes.push(question.code)
        }
      }

      await queryClient.invalidateQueries({ queryKey: questionQueryKeys.all })
      setBulkSelection([])

      if (failedCodes.length) {
        setExportError(
          `Đã duyệt ${successCount}/${selectedQuestions.length} câu hỏi. Thất bại: ${failedCodes.join(', ')}`,
        )
      } else {
        setToastMessage(`Đã duyệt hàng loạt ${successCount} câu hỏi.`)
      }
    } finally {
      setIsBulkApproving(false)
    }
  }

  return (
    <section aria-labelledby="questions-title" className="grid gap-6">
      <QuestionPageHeader
        createLabel="Tạo câu hỏi mới"
        description={getDescription(view, teacherScopeTab, filters.topicName)}
        isExporting={isExporting}
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
        onExport={() => {
          void handleExport()
        }}
        onImport={
          canCreateQuestion(actorRole) && view !== 'review'
            ? () => navigate(`${basePath}/questions/import`)
            : undefined
        }
        onRefresh={() => {
          void questionsQuery.refetch()
        }}
        title={getTitle(view, teacherScopeTab)}
      />

      <FeedbackToast
        message={toastMessage}
        onClose={() => setToastMessage(null)}
        tone="success"
      />
      <FeedbackToast
        message={exportError}
        onClose={() => setExportError(null)}
        tone="error"
      />
      {dialog}

      {allowTeacherTabs && view !== 'review' ? (
        <div className="rounded-lg border border-slate-200 bg-white p-1">
          <div className="flex flex-wrap gap-2">
            <TabButton
              isActive={teacherScopeTab === 'MINE'}
              label="Của tôi"
              onClick={() => navigate(`${basePath}/questions/my?tab=mine`)}
            />
            <TabButton
              isActive={teacherScopeTab === 'COLLABORATING'}
              label="Được chia sẻ"
              onClick={() => navigate(`${basePath}/questions/my?tab=collaborating`)}
            />
            <TabButton
              isActive={teacherScopeTab === 'ALL'}
              label="Tất cả tôi thấy"
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
          <h2 className="text-base font-black text-blue-950">Tìm kiếm câu hỏi</h2>
          <p className="text-sm text-slate-600">
            Lọc danh sách theo trạng thái, loại, chia sẻ và từ khóa.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Từ khóa
            <input
              className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  keyword: event.target.value,
                }))
              }
              placeholder="Mã, nội dung, prompt..."
              value={draftFilters.keyword}
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Trạng thái
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
            Loại câu hỏi
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
            Chia sẻ
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
            Tìm kiếm
          </button>
        </div>
      </form>

      {view === 'review' ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3">
          <div className="text-sm font-semibold text-indigo-900">
            Đang chọn {bulkSelection.length} câu hỏi trên trang hiện tại để duyệt hàng loạt.
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex h-10 items-center justify-center rounded-lg border border-indigo-200 bg-white px-4 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-60"
              disabled={!bulkSelection.length}
              onClick={() => setBulkSelection([])}
              type="button"
            >
              Bo chon
            </button>
            <button
              className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:bg-slate-300"
              disabled={!bulkSelection.length || isBulkApproving}
              onClick={() => {
                void handleBulkApprove()
              }}
              type="button"
            >
              {isBulkApproving ? 'Dang approve...' : 'Bulk approve'}
            </button>
          </div>
        </div>
      ) : null}

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
        isBulkSelectable={view === 'review'}
        isError={questionsQuery.isError}
        isLoading={questionsQuery.isLoading}
        onEdit={(question) => {
          navigate(`${basePath}/questions/${question.id}/edit`, {
            state: { fromView: view },
          })
        }}
        onSelectAllQuestions={(checked) => {
          if (!checked) {
            setBulkSelection([])
            return
          }

          setBulkSelection((questionsQuery.data?.content ?? []).map((question) => question.id))
        }}
        onRetry={() => {
          void questionsQuery.refetch()
        }}
        onSelect={(id) => {
          navigate(`${basePath}/questions/${id}`, {
            state: { fromView: view },
          })
        }}
        onToggleQuestionSelection={(questionId, checked) => {
          setBulkSelection((current) =>
            checked
              ? [...current, questionId].filter((value, index, array) => array.indexOf(value) === index)
              : current.filter((id) => id !== questionId),
          )
        }}
        questions={questionsQuery.data?.content ?? []}
        selectedIds={bulkSelection}
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
