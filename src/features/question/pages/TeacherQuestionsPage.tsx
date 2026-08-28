import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { useAppSelector } from '@/app/store/hooks'
import { useQuestionBanksQuery } from '@/features/question-bank/api/useQuestionBanksQuery'
import type { QuestionModuleScope } from '@/features/question-bank/api/useQuestionBanksQuery'
import { useQuestionTopicsQuery } from '@/features/question-topic/api/useQuestionTopicsQuery'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { FilterChips } from '@/shared/ui/FilterChips'
import { exportQuestions } from '../api/useQuestionExport'
import { useBulkReviewQuestionMutation } from '../api/useQuestionReviewMutation'
import { useQuestionStatusCountsQuery } from '../api/useQuestionStatusCountsQuery'
import { useQuestionsQuery, type QuestionQueryFilters } from '../api/useQuestionsQuery'
import { formatSkipGroups, planBulkAction } from '../bulkStatus'
import type { BulkSelectionCandidate, BulkStatusResult } from '../bulkStatus'
import { BulkStatusResultDialog } from '../components/BulkStatusResultDialog'
import {
  QuestionBulkActionBar,
  type BulkActionOption,
} from '../components/QuestionBulkActionBar'
import { QuestionFiltersForm } from '../components/QuestionFiltersForm'
import { QuestionPageHeader } from '../components/QuestionPageHeader'
import { QuestionPagination } from '../components/QuestionPagination'
import { QuestionTable } from '../components/QuestionTable'
import {
  canCreateQuestion,
  canEditQuestion,
  getQuestionActorRole,
  getTeacherQuestionContext,
  isCreatedBy,
  type QuestionActorRole,
  type QuestionWorkflowAction,
} from '../permissions'
import type { QuestionDto, QuestionScope, QuestionStatus } from '../types'
import { questionQueryKeys } from '../api/useQuestionsQuery'
import { useConfirmationDialog } from '@/shared/ui/useConfirmationDialog'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10
const REFERENCE_OPTIONS_PAGE_SIZE = 100

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

type StatusTab = { label: string; value: '' | QuestionStatus }

/**
 * Trạng thái là "tab quy trình" của màn hình chứ không phải một bộ lọc ngang hàng với loại câu
 * hỏi: mỗi màn hình chỉ bày ra những trạng thái thuộc về công việc của nó. Hàng đợi duyệt mà cho
 * chọn "Bản nháp" thì nó không còn là hàng đợi, và thao tác duyệt hàng loạt sau đó trượt toàn bộ.
 */
const LIST_STATUS_TABS: StatusTab[] = [
  { label: 'Tất cả', value: '' },
  { label: 'Bản nháp', value: 'DRAFT' },
  { label: 'Yêu cầu sửa', value: 'REVISION_REQUESTED' },
  { label: 'Chờ duyệt', value: 'SUBMITTED_FOR_REVIEW' },
  { label: 'Đã duyệt', value: 'APPROVED' },
  { label: 'Đã xuất bản', value: 'PUBLISHED' },
  { label: 'Bị từ chối', value: 'REJECTED' },
  { label: 'Lưu trữ', value: 'ARCHIVED' },
]

const REVIEW_STATUS_TABS: StatusTab[] = [
  { label: 'Chờ duyệt', value: 'SUBMITTED_FOR_REVIEW' },
  { label: 'Đã duyệt', value: 'APPROVED' },
  { label: 'Yêu cầu sửa', value: 'REVISION_REQUESTED' },
  { label: 'Bị từ chối', value: 'REJECTED' },
]

/** Những thao tác chạy được theo lô — REJECT/REQUEST_REVISION bắt buộc nhập lý do riêng từng câu. */
type BulkCapableAction = Extract<QuestionWorkflowAction, 'APPROVE' | 'PUBLISH' | 'SUBMIT'>

const BULK_ACTION_DEFINITIONS: Record<BulkCapableAction, BulkActionOption> = {
  APPROVE: {
    action: 'APPROVE',
    buttonLabel: 'Duyệt hàng loạt',
    confirmVerb: 'duyệt',
    label: 'Duyệt',
    successVerb: 'duyệt',
  },
  PUBLISH: {
    action: 'PUBLISH',
    buttonLabel: 'Xuất bản hàng loạt',
    confirmVerb: 'xuất bản',
    label: 'Xuất bản',
    successVerb: 'xuất bản',
  },
  SUBMIT: {
    action: 'SUBMIT',
    buttonLabel: 'Gửi duyệt hàng loạt',
    confirmVerb: 'gửi duyệt',
    label: 'Gửi duyệt',
    successVerb: 'gửi duyệt',
  },
}

/**
 * Thao tác hàng loạt được chia theo *việc của màn hình*, không chỉ theo vai trò.
 *
 * Trang danh sách là không gian của tác giả (gửi duyệt bài mình), trang duyệt là không gian của
 * người duyệt. Trước đây cả hai màn hình cùng bày đủ Gửi duyệt / Duyệt / Xuất bản, nên trên hàng
 * đợi duyệt — vốn lọc sẵn "Chờ duyệt" — chọn nhầm "Xuất bản" là hỏng toàn bộ lô. Riêng giáo viên
 * không có "Duyệt" ở trang danh sách: backend không cho tác giả tự duyệt bài mình (SELF_REVIEW),
 * nên nút đó chắc chắn thất bại.
 */
const BULK_ACTIONS_BY_ROLE: Record<
  Exclude<QuestionActorRole, null>,
  { list: BulkCapableAction[]; review: BulkCapableAction[] }
> = {
  SCHOOL_ADMIN: { list: ['PUBLISH'], review: ['APPROVE', 'PUBLISH'] },
  SYSTEM_ADMIN: { list: ['SUBMIT', 'PUBLISH'], review: ['APPROVE', 'PUBLISH'] },
  TEACHER: { list: ['SUBMIT', 'PUBLISH'], review: ['APPROVE'] },
}

function getBulkActionOptions(role: QuestionActorRole, view: QuestionListView) {
  if (!role) {
    return []
  }

  return BULK_ACTIONS_BY_ROLE[role][view === 'review' ? 'review' : 'list'].map(
    (action) => BULK_ACTION_DEFINITIONS[action],
  )
}

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
    return 'Hàng đợi các câu hỏi bạn có quyền duyệt hoặc phản hồi.'
  }

  if (teacherScopeTab === 'MINE') {
    return 'Tập hợp câu hỏi bạn tạo và đang quản lý.'
  }

  if (teacherScopeTab === 'COLLABORATING') {
    return 'Câu hỏi được chia sẻ riêng với bạn theo cơ chế cộng tác.'
  }

  return 'Tất cả câu hỏi bạn được phép xem trong trường.'
}

/**
 * Chụp lại những gì cần để dự đoán kết quả thao tác hàng loạt ngay lúc người dùng tích chọn:
 * lựa chọn được giữ xuyên trang nên câu đã chọn có thể không còn nằm trong trang đang hiển thị.
 */
function toBulkCandidate(
  question: QuestionDto,
  userId?: string | null,
  email?: string | null,
): BulkSelectionCandidate {
  return {
    code: question.code ?? null,
    editorCollaborator:
      question.collaborators?.some(
        (collaborator) =>
          collaborator.userId === userId && collaborator.permission === 'CAN_EDIT',
      ) ?? false,
    id: question.id,
    owner: isCreatedBy(question.createdBy, userId, email),
    status: question.status,
  }
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
  const bulkReviewMutation = useBulkReviewQuestionMutation()
  const { confirm, dialog } = useConfirmationDialog()

  const statusTabs = view === 'review' ? REVIEW_STATUS_TABS : LIST_STATUS_TABS
  const defaultStatus: '' | QuestionStatus = statusTabs[0].value

  const urlBankId = searchParams.get('bankId') ?? ''
  const urlTopicId = searchParams.get('topicId') ?? ''
  const urlTopicName = searchParams.get('topicName') ?? ''
  const isScopedToTopic = Boolean(urlBankId && urlTopicId)

  const [page, setPage] = useState(DEFAULT_PAGE)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [isExporting, setIsExporting] = useState(false)
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)
  const [bulkResult, setBulkResult] = useState<BulkStatusResult | null>(null)
  const [bulkSelection, setBulkSelection] = useState<
    Record<string, BulkSelectionCandidate>
  >({})
  const [status, setStatus] = useState<'' | QuestionStatus>(defaultStatus)
  const [bulkAction, setBulkAction] = useState<QuestionWorkflowAction | null>(null)
  const [draftFilters, setDraftFilters] = useState<QuestionQueryFilters>({
    ...EMPTY_FILTERS,
    questionBankId: urlBankId,
    questionTopicId: urlTopicId,
    topicName: urlTopicName,
  })
  const [filters, setFilters] = useState<QuestionQueryFilters>({
    ...EMPTY_FILTERS,
    questionBankId: urlBankId,
    questionTopicId: urlTopicId,
    topicName: urlTopicName,
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

  // Hai khối dưới đây là mẫu "điều chỉnh state khi giá trị dẫn xuất đổi" của React: chạy ngay trong
  // lúc render thay vì useEffect, để không tốn thêm một vòng render với dữ liệu cũ.

  // Điều hướng tới cùng route với chủ đề khác (vd từ trang chủ đề B sang chủ đề C) không remount
  // component, nên phải đồng bộ lại thủ công. Chỉ chạy khi giá trị trên URL *đổi* để không ghi đè
  // thao tác người dùng vừa làm trên form.
  const urlFilterKey = `${urlBankId}|${urlTopicId}|${urlTopicName}`
  const [lastUrlFilterKey, setLastUrlFilterKey] = useState(urlFilterKey)

  if (lastUrlFilterKey !== urlFilterKey) {
    const fromUrl = {
      questionBankId: urlBankId,
      questionTopicId: urlTopicId,
      topicName: urlTopicName,
    }
    setLastUrlFilterKey(urlFilterKey)
    setPage(DEFAULT_PAGE)
    setDraftFilters((current) => ({ ...current, ...fromUrl }))
    setFilters((current) => ({ ...current, ...fromUrl }))
  }

  // Đổi tab phạm vi (Của tôi / Được chia sẻ / Tất cả) mà giữ nguyên số trang thì rất dễ rơi vào
  // trang trống: tab mới thường có ít câu hơn tab cũ.
  const [lastScopeTab, setLastScopeTab] = useState(teacherScopeTab)

  if (lastScopeTab !== teacherScopeTab) {
    setLastScopeTab(teacherScopeTab)
    setPage(DEFAULT_PAGE)
  }

  const actorRole = getQuestionActorRole(user?.roles)
  const teacherContext = getTeacherQuestionContext(view)
  const bulkActionOptions = useMemo(
    () => getBulkActionOptions(actorRole, view),
    [actorRole, view],
  )
  const selectedBulkAction =
    bulkActionOptions.find((option) => option.action === bulkAction) ??
    bulkActionOptions[0] ??
    null

  const effectiveFilters: QuestionQueryFilters = {
    ...filters,
    scope:
      allowTeacherTabs && view !== 'review'
        ? teacherScopeTab
        : scope === 'teacher' && view === 'review'
          ? 'REVIEWING'
          : filters.scope,
    status,
  }

  const questionsQuery = useQuestionsQuery(scope, view, page, pageSize, effectiveFilters)
  const questions = useMemo(
    () => questionsQuery.data?.content ?? [],
    [questionsQuery.data],
  )

  const statusCountsQuery = useQuestionStatusCountsQuery(scope, view, effectiveFilters)
  const statusCounts = statusCountsQuery.data
  // Chỉ gắn số khi đã có dữ liệu: nhãn nhảy từ "Chờ duyệt (0)" sang "Chờ duyệt (12)" trong lúc tải
  // còn khó chịu hơn là chưa hiện số.
  const statusTabItems = useMemo(
    () =>
      statusTabs.map((tab) => {
        if (!statusCounts) {
          return tab
        }

        const count =
          tab.value === '' ? statusCounts.total : statusCounts.byStatus[tab.value] ?? 0

        return { label: `${tab.label} (${count})`, value: tab.value }
      }),
    [statusCounts, statusTabs],
  )

  // Trang 1, KHÔNG phải 0 -- backend đếm trang từ 1 rồi tự trừ đi 1 trước khi dựng PageRequest.
  const banksQuery = useQuestionBanksQuery(scope, 1, REFERENCE_OPTIONS_PAGE_SIZE)
  const topicsQuery = useQuestionTopicsQuery(
    scope,
    draftFilters.questionBankId ?? '',
    1,
    REFERENCE_OPTIONS_PAGE_SIZE,
    Boolean(draftFilters.questionBankId),
  )
  const topics = useMemo(() => topicsQuery.data?.content ?? [], [topicsQuery.data])
  const selectedTopicName =
    topics.find((topic) => topic.id === filters.questionTopicId)?.name ??
    filters.topicName

  const flashMessage =
    (location.state as { successMessage?: string } | null)?.successMessage ?? null
  const [toastMessage, setToastMessage] = useState<string | null>(flashMessage)

  useEffect(() => {
    if (!flashMessage) {
      return
    }

    navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [flashMessage, location.pathname, location.search, navigate])

  const selectedCandidates = useMemo(
    () => Object.values(bulkSelection),
    [bulkSelection],
  )
  const selectedOnPageCount = questions.filter(
    (question) => bulkSelection[question.id],
  ).length
  const plan = useMemo(
    () =>
      planBulkAction(
        selectedBulkAction?.action ?? 'SUBMIT',
        actorRole,
        selectedCandidates,
      ),
    [actorRole, selectedBulkAction, selectedCandidates],
  )
  // Số câu hợp lệ của từng thao tác, để người dùng thấy ngay "Duyệt (8/20 câu)" mà không phải
  // chọn thử từng thao tác rồi đọc cảnh báo.
  const actionOptionsWithCount = useMemo(
    () =>
      bulkActionOptions.map((option) => ({
        ...option,
        eligibleCount: planBulkAction(option.action, actorRole, selectedCandidates)
          .eligible.length,
      })),
    [actorRole, bulkActionOptions, selectedCandidates],
  )

  function selectQuestions(nextQuestions: QuestionDto[], checked: boolean) {
    setBulkSelection((current) => {
      const next = { ...current }

      nextQuestions.forEach((question) => {
        if (checked) {
          next[question.id] = toBulkCandidate(question, user?.userId, user?.email)
          return
        }

        delete next[question.id]
      })

      return next
    })
  }

  async function handleExport() {
    setIsExporting(true)
    setFeedbackError(null)
    try {
      await exportQuestions(effectiveFilters)
    } catch (error) {
      setFeedbackError(getErrorMessage(error) ?? 'Không thể xuất file. Vui lòng thử lại.')
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
    // Xoá sạch, kể cả chủ đề đến từ URL: trước đây "Đặt lại" đọc lại searchParams nên người dùng
    // vào từ trang chủ đề thì không có cách nào bỏ được bộ lọc chủ đề.
    setPage(DEFAULT_PAGE)
    setStatus(defaultStatus)
    setDraftFilters(EMPTY_FILTERS)
    setFilters(EMPTY_FILTERS)
  }

  async function handleBulkAction() {
    if (!selectedBulkAction) {
      setFeedbackError('Không có thao tác hàng loạt phù hợp cho vai trò hiện tại.')
      return
    }

    if (!plan.eligible.length) {
      setFeedbackError(
        `Không có câu hỏi nào ${selectedBulkAction.confirmVerb} được trong lựa chọn hiện tại.`,
      )
      return
    }

    const confirmMessage =
      plan.skipped.length > 0
        ? `Bạn có chắc muốn ${selectedBulkAction.confirmVerb} ${plan.eligible.length} câu hỏi không? ${plan.skipped.length} câu còn lại trong lựa chọn sẽ được giữ nguyên: ${formatSkipGroups(plan.skippedGroups)}.`
        : `Bạn có chắc muốn ${selectedBulkAction.confirmVerb} ${plan.eligible.length} câu hỏi đã chọn không?`

    if (!(await confirm({ message: confirmMessage }))) {
      return
    }

    setIsBulkProcessing(true)
    setFeedbackError(null)

    try {
      // Chỉ gửi những câu đã biết là chạy được. Gửi cả câu sai trạng thái chỉ làm bảng lỗi trả về
      // lẫn lộn giữa lỗi đã cảnh báo trước và lỗi thật sự cần người dùng xử lý.
      const result = await bulkReviewMutation.mutateAsync({
        payload: {
          action: selectedBulkAction.action,
          note: null,
          questionIds: plan.eligible.map((candidate) => candidate.id),
        },
      })

      await queryClient.invalidateQueries({ queryKey: questionQueryKeys.all })
      // Bỏ khỏi vùng chọn đúng những câu đã đổi trạng thái; phần còn lại (bị bỏ qua hoặc thất bại)
      // vẫn ở đó để người dùng đổi thao tác và chạy tiếp mà không phải dò lại từ đầu.
      const updatedIds = new Set(result.updated.map((question) => question.id))
      setBulkSelection((current) =>
        Object.fromEntries(
          Object.entries(current).filter(([questionId]) => !updatedIds.has(questionId)),
        ),
      )

      if (result.updated.length > 0) {
        setToastMessage(
          `Đã ${selectedBulkAction.successVerb} ${result.updated.length} câu hỏi.`,
        )
      }

      if (result.failed.length > 0) {
        setBulkResult({
          actionVerb: selectedBulkAction.successVerb,
          failed: result.failed,
          totalCount: plan.eligible.length,
          updatedCount: result.updated.length,
        })
      }
    } catch (error) {
      setFeedbackError(
        getErrorMessage(error) ?? 'Không thể cập nhật trạng thái hàng loạt. Vui lòng thử lại.',
      )
    } finally {
      setIsBulkProcessing(false)
    }
  }

  return (
    <section aria-labelledby="questions-title" className="grid gap-6">
      <QuestionPageHeader
        createLabel="Tạo câu hỏi mới"
        description={getDescription(view, teacherScopeTab, selectedTopicName)}
        isExporting={isExporting}
        isRefreshing={questionsQuery.isFetching}
        onBack={isScopedToTopic ? () => navigate(-1) : undefined}
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
                if (selectedTopicName) {
                  url.searchParams.set('topicName', selectedTopicName)
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
        message={feedbackError}
        onClose={() => setFeedbackError(null)}
        tone="error"
      />
      <BulkStatusResultDialog onClose={() => setBulkResult(null)} result={bulkResult} />
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

      {/* FilterChips tự có mt-6 cho layout không dùng gap; ở đây parent đã là grid gap-6. */}
      <div className="[&>div]:mt-0">
        <FilterChips
          items={statusTabItems}
          onChange={(value) => {
            setStatus(value)
            setPage(DEFAULT_PAGE)
          }}
          value={status}
        />
      </div>

      <QuestionFiltersForm
        banks={banksQuery.data?.content ?? []}
        draftFilters={draftFilters}
        isBanksLoading={banksQuery.isLoading}
        isTopicsLoading={topicsQuery.isLoading}
        onDraftChange={setDraftFilters}
        onReset={handleFilterReset}
        onSubmit={handleFilterSubmit}
        topics={topics}
      />

      {bulkActionOptions.length > 0 ? (
        <QuestionBulkActionBar
          actionOptions={actionOptionsWithCount}
          isProcessing={isBulkProcessing}
          onActionChange={setBulkAction}
          onClear={() => setBulkSelection({})}
          onKeepEligible={() =>
            setBulkSelection(
              Object.fromEntries(
                plan.eligible.map((candidate) => [candidate.id, candidate]),
              ),
            )
          }
          onRun={() => {
            void handleBulkAction()
          }}
          plan={plan}
          selectedAction={selectedBulkAction}
          selectedCount={selectedCandidates.length}
          selectedOnPageCount={selectedOnPageCount}
        />
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
        isBulkSelectable={bulkActionOptions.length > 0}
        isError={questionsQuery.isError}
        isLoading={questionsQuery.isLoading}
        onEdit={(question) => {
          navigate(`${basePath}/questions/${question.id}/edit`, {
            state: { fromView: view },
          })
        }}
        onSelectAllQuestions={(checked) => {
          selectQuestions(questions, checked)
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
          const question = questions.find((item) => item.id === questionId)

          if (question) {
            selectQuestions([question], checked)
          }
        }}
        questions={questions}
        selectedIds={Object.keys(bulkSelection)}
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
