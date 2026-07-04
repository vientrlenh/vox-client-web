import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  CalendarClock,
  Check,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  CircleCheck,
  Clock4,
  FilePenLine,
  Hash,
  Languages,
  ListChecks,
  PlayCircle,
  Rocket,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { useAppSelector } from '@/app/store/hooks'
import { useSchoolClassUsersQuery } from '@/features/classes/api/useSchoolClassUsersQuery'
import { useSchoolUsersForRequesterQuery } from '@/features/classes/api/useSchoolUsersForRequesterQuery'
import { formatNullableText as formatQuestionNullableText } from '@/features/question/types'
import { useConfirmationDialog } from '@/shared/ui/ConfirmationDialog'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { StatCard } from '@/shared/ui/StatCard'
import { StatusBadge as SharedStatusBadge } from '@/shared/ui/StatusBadge'
import { TabPillGroup } from '@/shared/ui/TabPill'
import { WorkflowStepper, type WorkflowStep } from '@/shared/ui/WorkflowStepper'
import { QuestionPicker } from '../components/QuestionPicker'
import { ScheduleTab } from '../components/schedule/ScheduleTab'
import { useExamScheduleState } from '../components/schedule/useExamScheduleState'
import { StudentsTab } from '../components/StudentsTab'
import {
  useAttachExamBlueprintMutation,
  useCreateExamMemberMutation,
  useCreateExamMutation,
  useCreateExamPaperMutation,
  useDeleteExamMemberMutation,
  useDeleteExamMutation,
  useDeleteExamPaperMutation,
  useUpdateExamMemberMutation,
  useUpdateExamMutation,
  useUpdateExamPaperItemMutation,
  useUpdateExamPaperStatusMutation,
  useUpdateExamStatusMutation,
} from '../api/useExamMutations'
import { examQueryKeys, useExamBlueprintQuery, useExamBlueprintsQuery, useExamQuery, useExamsQuery } from '../api/useExamQueries'
import type {
  CreateExamRequest,
  ExamBlueprintDto,
  ExamBlueprintVersionDto,
  CreateExamMemberRequest,
  ExamKind,
  ExamMemberRole,
  ExamStatus,
  UpdateExamPaperStatusRequest,
  UpdateExamStatusRequest,
} from '../types'
import {
  formatDateTime,
  formatNullableText,
  getExamPaperStatusDisplay,
  getExamStatusDisplay,
} from '../types'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10
const DEFAULT_LANGUAGE_ID = '00000000-0000-0000-0000-000000000001'
type ExamDetailTab = 'blueprint' | 'workflow' | 'papers' | 'people' | 'students' | 'schedule'

function getErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }

  return 'Không thể xử lý yêu cầu hiện tại.'
}

function StatusBadge({ status }: { status?: string | null }) {
  const display = getExamStatusDisplay(status)
  return <SharedStatusBadge label={display.label} tone={display.tone} />
}

function PaperStatusBadge({ status }: { status?: string | null }) {
  const display = getExamPaperStatusDisplay(status)
  return <SharedStatusBadge label={display.label} tone={display.tone} />
}

/** Derives the 4-step exam lifecycle (blueprint → version lock → papers → ops) shown as a WorkflowStepper. */
function getExamWorkflowSteps(exam: {
  blueprintId?: string | null
  blueprintVersionId?: string | null
  papers?: Array<{ status: string }> | null
  status: string
}): WorkflowStep[] {
  const hasBlueprint = Boolean(exam.blueprintId)
  const hasVersion = Boolean(exam.blueprintVersionId)
  const papers = exam.papers ?? []
  const papersReady = papers.length > 0 && papers.every((paper) => paper.status === 'LOCKED')
  const opsStarted = ['SCHEDULED', 'IN_PROGRESS', 'CLOSED', 'RESULTS_PUBLISHED'].includes(exam.status)

  const step1: WorkflowStep = {
    icon: hasBlueprint ? <Check size={18} /> : <ClipboardList size={18} />,
    label: 'Gắn blueprint',
    state: hasBlueprint ? 'done' : 'current',
    sublabel: hasBlueprint ? 'Hoàn tất' : undefined,
  }
  const step2: WorkflowStep = {
    icon: hasVersion ? <Check size={18} /> : <ListChecks size={18} />,
    label: 'Chốt phiên bản',
    state: hasVersion ? 'done' : hasBlueprint ? 'current' : 'upcoming',
    sublabel: hasVersion ? 'Đã chốt' : undefined,
  }
  const step3: WorkflowStep = {
    icon: papersReady ? <Check size={18} /> : <FilePenLine size={18} />,
    label: 'Soạn & duyệt đề',
    state: papersReady ? 'done' : hasVersion ? 'current' : 'upcoming',
    sublabel: papers.length ? `${papers.filter((paper) => paper.status === 'LOCKED').length} / ${papers.length} mã đề đã khóa` : undefined,
  }
  const step4: WorkflowStep = {
    icon: opsStarted ? <Check size={18} /> : <Rocket size={18} />,
    label: 'Vận hành thi',
    state: opsStarted ? 'done' : papersReady ? 'current' : 'upcoming',
  }

  return [step1, step2, step3, step4]
}

const EXAM_STATUS_FILTERS: Array<{ label: string; value: '' | ExamStatus }> = [
  { label: 'Tất cả', value: '' },
  { label: 'Bản nháp', value: 'DRAFT' },
  { label: 'Đã lên lịch', value: 'SCHEDULED' },
  { label: 'Đang diễn ra', value: 'IN_PROGRESS' },
  { label: 'Đã công bố kết quả', value: 'RESULTS_PUBLISHED' },
]

function getPublishedBlueprintVersion(blueprint: ExamBlueprintDto | null | undefined) {
  return [...(blueprint?.versions ?? [])]
    .reverse()
    .find((version) => version.status === 'PUBLISHED') ?? null
}

function getBlueprintVersionById(blueprint: ExamBlueprintDto | null | undefined, blueprintVersionId?: string | null) {
  if (!blueprintVersionId) {
    return null
  }

  return blueprint?.versions?.find((version) => version.id === blueprintVersionId) ?? null
}

function getBlockingFixedSlots(version: ExamBlueprintVersionDto | null) {
  return version?.sections.flatMap((section) =>
    section.slots.filter(
      (slot) =>
        slot.slotType === 'FIXED' &&
        slot.fixedQuestion &&
        slot.fixedQuestion.status !== 'PUBLISHED',
    ),
  ) ?? []
}

function getExamActionLabel(action: UpdateExamStatusRequest['action']) {
  switch (action) {
    case 'SCHEDULE':
      return 'Lên lịch thi'
    case 'START':
      return 'Bắt đầu thi'
    case 'CLOSE':
      return 'Đóng kỳ thi'
    case 'PUBLISH_RESULTS':
      return 'Công bố kết quả'
    case 'CANCEL':
      return 'Hủy kỳ thi'
    default:
      return action
  }
}

type ExamListPageProps = {
  allowCreate: boolean
  basePath: string
  kind?: ExamKind
  readOnly?: boolean
  title: string
}

function ExamListPage({ allowCreate, basePath, kind, readOnly = false, title }: ExamListPageProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const user = useAppSelector((state) => state.auth.user)
  const [page, setPage] = useState(DEFAULT_PAGE)
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<'' | ExamStatus>('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const { confirm, dialog } = useConfirmationDialog()
  const examsQuery = useExamsQuery({
    kind,
    keyword,
    page,
    schoolId: user?.schoolId,
    size: DEFAULT_PAGE_SIZE,
    status: status || undefined,
  })
  const totalCountQuery = useExamsQuery({ kind, page: 1, schoolId: user?.schoolId, size: 1 })
  const inProgressCountQuery = useExamsQuery({ kind, page: 1, schoolId: user?.schoolId, size: 1, status: 'IN_PROGRESS' })
  const draftCountQuery = useExamsQuery({ kind, page: 1, schoolId: user?.schoolId, size: 1, status: 'DRAFT' })
  const publishedCountQuery = useExamsQuery({ kind, page: 1, schoolId: user?.schoolId, size: 1, status: 'RESULTS_PUBLISHED' })
  const createExamMutation = useCreateExamMutation()
  const deleteExamMutation = useDeleteExamMutation()

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.all })
  }

  return (
    <section className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-blue-950">{title}</h1>
          <p className="mt-2 text-sm font-medium text-slate-600">
            Theo dõi danh sách kỳ thi và mở chi tiết để thao tác.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            onClick={() => void examsQuery.refetch()}
            type="button"
          >
            Làm mới
          </button>
          {allowCreate ? (
            <button
              className="inline-flex h-11 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700"
              onClick={() => setShowCreate((current) => !current)}
              type="button"
            >
              {showCreate ? 'Đóng form' : 'Tạo kỳ thi'}
            </button>
          ) : null}
        </div>
      </div>

      <FeedbackToast message={message} onClose={() => setMessage(null)} tone="success" />
      <FeedbackToast message={error} onClose={() => setError(null)} tone="error" />
      {dialog}

      {showCreate ? (
        <CreateExamCard
          isSubmitting={createExamMutation.isPending}
          onCancel={() => setShowCreate(false)}
          onSubmit={async (payload) => {
            if (!(await confirm({ message: 'Bạn có chắc muốn tạo kỳ thi này không?' }))) {
              return
            }
            try {
              const result = await createExamMutation.mutateAsync(payload)
              await refresh()
              setShowCreate(false)
              setMessage(result)
              setError(null)
            } catch (submitError) {
              setError(getErrorMessage(submitError))
            }
          }}
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={<ClipboardList size={19} />} iconTone="indigo" label="Tổng kỳ thi" value={totalCountQuery.data?.totalElements ?? '-'} />
        <StatCard icon={<PlayCircle size={19} />} iconTone="violet" label="Đang diễn ra" value={inProgressCountQuery.data?.totalElements ?? '-'} />
        <StatCard icon={<Clock4 size={19} />} iconTone="amber" label="Chờ xử lý" value={draftCountQuery.data?.totalElements ?? '-'} />
        <StatCard icon={<CircleCheck size={19} />} iconTone="emerald" label="Đã công bố" value={publishedCountQuery.data?.totalElements ?? '-'} />
      </div>

      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-[minmax(0,1fr)_auto]">
        <Field label="Từ khóa" value={keyword} onChange={setKeyword} />
        <div className="flex flex-wrap items-end gap-2">
          {EXAM_STATUS_FILTERS.map((filter) => (
            <button
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                status === filter.value
                  ? 'bg-indigo-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
              key={filter.value}
              onClick={() => setStatus(filter.value)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3.5">
        {examsQuery.data?.content.map((exam) => {
          const steps = getExamWorkflowSteps(exam)
          const barToneClassName: Record<string, string> = {
            DRAFT: 'bg-amber-500',
            SCHEDULED: 'bg-blue-500',
            IN_PROGRESS: 'bg-violet-600',
            CLOSED: 'bg-slate-400',
            RESULTS_PUBLISHED: 'bg-emerald-500',
            CANCELLED: 'bg-red-500',
          }

          return (
            <div
              className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg"
              key={exam.id}
            >
              <div className={`w-1.5 ${barToneClassName[exam.status] ?? 'bg-slate-300'}`} />
              <button
                className="flex flex-1 flex-wrap items-center gap-5 px-5 py-4 text-left"
                onClick={() => navigate(`${basePath}/${exam.id}`)}
                type="button"
              >
                <div className="min-w-60 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-base font-bold text-slate-900">{exam.name}</span>
                    <StatusBadge status={exam.status} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3.5 text-[13px] font-medium text-slate-500">
                    <span className="font-mono font-semibold">{exam.code}</span>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock size={15} />
                      {formatDateTime(exam.openAt)} → {formatDateTime(exam.closeAt)}
                    </span>
                  </div>
                </div>
                <WorkflowStepper steps={steps} variant="compact" />
                <ChevronRight className="text-slate-300" size={20} />
              </button>
              {!readOnly ? (
                <button
                  className="border-l border-slate-100 px-4 text-sm font-bold text-red-600 transition hover:bg-red-50"
                  onClick={() => {
                    void (async () => {
                      try {
                        const result = await deleteExamMutation.mutateAsync(exam.id)
                        await refresh()
                        setMessage(result)
                        setError(null)
                      } catch (deleteError) {
                        setError(getErrorMessage(deleteError))
                      }
                    })()
                  }}
                  type="button"
                >
                  Xóa
                </button>
              ) : null}
            </div>
          )
        })}
        {examsQuery.data?.content.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">
            Không có kỳ thi phù hợp.
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600">
        <span>
          {examsQuery.data?.totalElements ?? 0} kỳ thi, trang {examsQuery.data?.page ?? 1}/{examsQuery.data?.totalPages ?? 1}
        </span>
        <div className="flex gap-2">
          <button
            className="h-9 rounded-lg border border-slate-200 px-3 disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
            type="button"
          >
            Trước
          </button>
          <button
            className="h-9 rounded-lg border border-slate-200 px-3 disabled:opacity-50"
            disabled={page >= (examsQuery.data?.totalPages ?? 1)}
            onClick={() => setPage((current) => current + 1)}
            type="button"
          >
            Sau
          </button>
        </div>
      </div>
    </section>
  )
}

type ExamDetailPageProps = {
  basePath: string
  blueprintBasePath: string
  canManageMembers: boolean
  canManagePapers: boolean
  canManageStatus: boolean
  canUpdateInfo: boolean
  title: string
}

function ExamDetailPage({
  basePath,
  blueprintBasePath,
  canManageMembers,
  canManagePapers,
  canManageStatus,
  canUpdateInfo,
  title,
}: ExamDetailPageProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const user = useAppSelector((state) => state.auth.user)
  const { examId } = useParams()
  const examQuery = useExamQuery(examId ?? null)
  const exam = examQuery.data
  const blueprintQuery = useExamBlueprintQuery(exam?.blueprintId ?? null)
  const blueprint = blueprintQuery.data
  const availableBlueprintsQuery = useExamBlueprintsQuery({
    examKind: exam?.kind,
    isActive: true,
    keyword: '',
    page: 1,
    schoolId: exam?.schoolId ?? user?.schoolId,
    size: 50,
  })
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ExamDetailTab>('blueprint')
  const updateExamMutation = useUpdateExamMutation()
  const attachBlueprintMutation = useAttachExamBlueprintMutation()
  const updateStatusMutation = useUpdateExamStatusMutation()
  const createMemberMutation = useCreateExamMemberMutation()
  const updateMemberMutation = useUpdateExamMemberMutation()
  const deleteMemberMutation = useDeleteExamMemberMutation()
  const createPaperMutation = useCreateExamPaperMutation()
  const updatePaperItemMutation = useUpdateExamPaperItemMutation()
  const updatePaperStatusMutation = useUpdateExamPaperStatusMutation()
  const deletePaperMutation = useDeleteExamPaperMutation()
  const [draftName, setDraftName] = useState('')
  const [draftDescription, setDraftDescription] = useState('')
  const [memberUserId, setMemberUserId] = useState('')
  const [memberRole, setMemberRole] = useState<ExamMemberRole>('AUTHOR')
  const [memberSearch, setMemberSearch] = useState('')
  const [memberPage, setMemberPage] = useState(1)
  const [memberListPage, setMemberListPage] = useState(1)
  const [selectedBlueprintId, setSelectedBlueprintId] = useState('')
  const [selectedBlueprintVersionId, setSelectedBlueprintVersionId] = useState('')
  const { confirm, dialog } = useConfirmationDialog()
  const schoolUsersQuery = useSchoolUsersForRequesterQuery(memberPage, 8, {
    schoolId: user?.schoolId ?? '',
    search: memberSearch,
  })
  const selectedBlueprintQuery = useExamBlueprintQuery(selectedBlueprintId || null)
  const classUsersQuery = useSchoolClassUsersQuery(exam?.schoolClassId ?? null, 1, 200)
  const students = classUsersQuery.data?.content ?? []
  const scheduleState = useExamScheduleState()

  useEffect(() => {
    scheduleState.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam?.id])

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.all })
  }

  if (examQuery.isLoading) {
    return <section className="rounded-lg border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-600">Đang tải chi tiết kỳ thi...</section>
  }

  if (!exam) {
    return <section className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">Không tìm thấy kỳ thi.</section>
  }

  const finalizedBlueprintVersion = getBlueprintVersionById(blueprint, exam.blueprintVersionId)
  const finalizedBlockingFixedSlots = getBlockingFixedSlots(finalizedBlueprintVersion)
  const canUsePaperActions = Boolean(exam.blueprintVersionId && finalizedBlueprintVersion) && finalizedBlockingFixedSlots.length === 0
  const hasBlueprint = Boolean(exam.blueprintId && blueprint)
  const isSchoolAdmin = user?.roles?.includes('SCHOOL_ADMIN') ?? false
  const viewerRoles = exam.members
    ?.filter((member) => member.userId === user?.userId)
    .map((member) => member.role) ?? []
  const isAuthor = viewerRoles.includes('AUTHOR')
  const isChair = viewerRoles.includes('CHAIR')
  const hasAuthor = exam.members?.some((member) => member.role === 'AUTHOR') ?? false
  const hasReviewerOrChair = exam.members?.some((member) => member.role === 'REVIEWER' || member.role === 'CHAIR') ?? false
  const hasChair = exam.members?.some((member) => member.role === 'CHAIR') ?? false
  const canAttachBlueprint = exam.kind === 'CENTRALIZED' && isAuthor
  const canFinalizeBlueprintVersion = exam.kind === 'CENTRALIZED' && isChair
  const canShowExamWorkflow = canManageStatus && exam.kind === 'CENTRALIZED' && isSchoolAdmin
  const selectedBlueprint = selectedBlueprintQuery.data
  const selectedBlueprintPublishedVersion = getPublishedBlueprintVersion(selectedBlueprint)
  const publishedVersions = [...(blueprint?.versions ?? [])].filter((version) => version.status === 'PUBLISHED')
  const examStatusActions: UpdateExamStatusRequest['action'][] = ['SCHEDULE', 'START', 'CLOSE', 'PUBLISH_RESULTS', 'CANCEL']
  const paperStatusActions: UpdateExamPaperStatusRequest['action'][] = ['SUBMIT', 'APPROVE', 'REQUEST_REVISION', 'LOCK']
  const pagedMembers = (exam.members ?? []).slice((memberListPage - 1) * 6, memberListPage * 6)
  const totalMemberPages = Math.max(1, Math.ceil((exam.members?.length ?? 0) / 6))
  const papers = exam.papers ?? []
  const scheduleLocked = papers.length === 0 || !papers.every((paper) => paper.status === 'LOCKED')
  const paperCodes = papers.map((paper) => paper.code)

  return (
    <section className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button
            className="mb-3 inline-flex items-center gap-1 text-sm font-bold text-indigo-600 transition hover:text-indigo-800"
            onClick={() => navigate(-1)}
            type="button"
          >
            Quay lại
          </button>
          <h1 className="text-3xl font-black text-blue-950">{title}</h1>
          <p className="mt-2 text-sm font-medium text-slate-600">
            Theo dõi thông tin kỳ thi, thành viên và đề thi trong cùng một màn.
          </p>
        </div>
      </div>

      <FeedbackToast message={message} onClose={() => setMessage(null)} tone="success" />
      <FeedbackToast message={error} onClose={() => setError(null)} tone="error" />
      {dialog}

      <div className="rounded-[18px] border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">{exam.name}</h2>
              <StatusBadge status={exam.status} />
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-4 text-[13px] font-medium text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Hash size={15} />
                {exam.code}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ClipboardCheck size={15} />
                {exam.kind}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Languages size={15} />
                {formatNullableText(exam.languageId)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock size={15} />
                {formatDateTime(exam.openAt)} – {formatDateTime(exam.closeAt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[18px] border border-slate-200 bg-white p-6">
        <WorkflowStepper steps={getExamWorkflowSteps(exam)} />
      </div>

      <TabPillGroup
        items={[
          { value: 'blueprint', label: 'Blueprint' },
          { value: 'workflow', label: 'Vận hành' },
          { value: 'papers', label: 'Đề thi' },
          { value: 'people', label: 'Phân công' },
          { value: 'students', label: 'Học sinh' },
          { value: 'schedule', label: 'Phân lịch' },
        ]}
        onChange={setActiveTab}
        value={activeTab}
      />

      {activeTab === 'students' ? (
        <StudentsTab
          assignmentByStudentId={scheduleState.assignmentByStudentId}
          hasSchoolClass={Boolean(exam.schoolClassId)}
          isLoading={classUsersQuery.isLoading}
          students={students}
        />
      ) : null}

      {activeTab === 'schedule' ? (
        <ScheduleTab
          locked={scheduleLocked}
          onGoToPapers={() => setActiveTab('papers')}
          paperCodes={paperCodes}
          scheduleState={scheduleState}
          students={students}
        />
      ) : null}

      {activeTab === 'blueprint' ? (
        <div className="grid gap-4">
          <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6">
            <div>
              <h2 className="text-lg font-black text-slate-950">Sẵn sàng quy trình</h2>
              <p className="mt-1 text-sm font-medium text-slate-600">
                AUTHOR gan blueprint, REVIEWER/CHAIR doi trang thai version, CHAIR chot version su dung.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <WorkflowReadinessItem isReady={hasAuthor} readyLabel="AUTHOR ready" missingLabel="Missing AUTHOR" />
              <WorkflowReadinessItem isReady={hasReviewerOrChair} readyLabel="Version reviewer ready" missingLabel="Missing REVIEWER or CHAIR" />
              <WorkflowReadinessItem isReady={hasChair} readyLabel="CHAIR ready" missingLabel="Missing CHAIR" />
              <WorkflowReadinessItem
                isReady={Boolean(exam.blueprintVersionId)}
                readyLabel="Paper flow ready"
                missingLabel="Paper flow locked until blueprintVersionId is chosen"
              />
            </div>
          </div>

          {!hasBlueprint ? (
            <form
              className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault()
                void (async () => {
                  if (!selectedBlueprintId) {
                    setError('Hay chon blueprint truoc khi gan vao exam.')
                    return
                  }

                  if (!(await confirm({ message: 'Ban co chac muon gan blueprint nay vao exam khong?' }))) {
                    return
                  }

                  try {
                    const result = await attachBlueprintMutation.mutateAsync({
                      blueprintId: selectedBlueprintId,
                      blueprintVersionId: null,
                      examId: exam.id,
                    })
                    await refresh()
                    setMessage(result)
                    setError(null)
                  } catch (submitError) {
                    setError(getErrorMessage(submitError))
                  }
                })()
              }}
            >
              <div className="md:col-span-2">
                <h2 className="text-lg font-black text-slate-950">Gan blueprint cho exam</h2>
                <p className="mt-1 text-sm font-medium text-slate-600">
                  Buoc 1: AUTHOR gan blueprint vao exam. Chua can co version PUBLISHED o buoc nay.
                </p>
              </div>
              {canAttachBlueprint ? (
                <>
                  <SelectField
                    label="Blueprint"
                    onChange={setSelectedBlueprintId}
                    options={[
                      { label: 'Chon blueprint', value: '' },
                      ...((availableBlueprintsQuery.data?.content ?? []).map((candidate) => ({
                        label: `${candidate.code} - ${candidate.name}`,
                        value: candidate.id,
                      }))),
                    ]}
                    value={selectedBlueprintId}
                  />
                  <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Trang thai blueprint da chon</p>
                    <p className="text-sm font-black text-slate-950">
                      {selectedBlueprint
                        ? `${selectedBlueprint.code} - ${selectedBlueprint.name}`
                        : 'Chua chon blueprint'}
                    </p>
                    <p className="text-sm font-medium text-slate-600">
                      {selectedBlueprintId
                        ? selectedBlueprintPublishedVersion
                          ? 'Blueprint nay da co version PUBLISHED, CHAIR co the chot version sau khi gan.'
                          : 'Blueprint nay chua co version PUBLISHED. REVIEWER/CHAIR se doi trang thai version o buoc tiep theo.'
                        : 'Chi hien blueprint dang hoat dong trong truong hien tai.'}
                    </p>
                  </div>
                </>
              ) : (
                <div className="md:col-span-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                  Chi AUTHOR cua exam duoc gan blueprint.
                </div>
              )}
              <div className="md:col-span-2 flex justify-end">
                <button
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white"
                  disabled={!canAttachBlueprint || !selectedBlueprintId}
                  type="submit"
                >
                  AUTHOR gan blueprint
                </button>
              </div>
            </form>
          ) : null}

          {hasBlueprint && !exam.blueprintVersionId ? (
            <div className="grid gap-4">
              <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 md:grid-cols-2">
                <InfoItem label="Ten blueprint" value={blueprint?.name ?? '-'} />
                <InfoItem label="Code" value={blueprint?.code ?? '-'} />
                <InfoItem label="Blueprint ID" value={formatNullableText(exam.blueprintId)} />
                <InfoItem label="Version dang duoc chot" value="Chua chot" />
              </div>

              {!hasReviewerOrChair ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                  Exam nay chua co actor doi trang thai version.
                </div>
              ) : null}

              {!hasChair ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                  Exam nay chua co CHAIR de chot version su dung.
                </div>
              ) : null}

              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
                Buoc 2: REVIEWER/CHAIR doi trang thai version trong blueprint detail. Buoc 3: CHAIR quay lai exam nay de chot version su dung.
              </div>

              <div className="flex flex-wrap justify-between gap-3">
                <button
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700"
                  onClick={() => navigate(`${blueprintBasePath}/${blueprint?.id}`)}
                  type="button"
                >
                  Mo blueprint de doi trang thai version
                </button>
              </div>

              {canFinalizeBlueprintVersion ? (
                <form
                  className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 md:grid-cols-2"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void (async () => {
                      if (!selectedBlueprintVersionId) {
                        setError('Hay chon version PUBLISHED truoc khi chot.')
                        return
                      }

                      if (!(await confirm({ message: 'Ban co chac muon chot version nay cho exam khong?' }))) {
                        return
                      }

                      try {
                        const result = await attachBlueprintMutation.mutateAsync({
                          blueprintId: null,
                          blueprintVersionId: selectedBlueprintVersionId,
                          examId: exam.id,
                        })
                        await refresh()
                        setMessage(result)
                        setError(null)
                      } catch (submitError) {
                        setError(getErrorMessage(submitError))
                      }
                    })()
                  }}
                >
                  <div className="md:col-span-2">
                    <h2 className="text-lg font-black text-slate-950">Chot version su dung</h2>
                    <p className="mt-1 text-sm font-medium text-slate-600">
                      Buoc 3: CHAIR chot blueprintVersionId. Exam paper chi mo sau khi CHAIR chot version.
                    </p>
                  </div>
                  <SelectField
                    label="Version PUBLISHED"
                    onChange={setSelectedBlueprintVersionId}
                    options={[
                      { label: 'Chon version PUBLISHED', value: '' },
                      ...publishedVersions.map((version) => ({
                        label: `Version ${version.version} - ${version.code}`,
                        value: version.id,
                      })),
                    ]}
                    value={selectedBlueprintVersionId}
                  />
                  <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Readiness chot version</p>
                    <p className="text-sm font-black text-slate-950">
                      {selectedBlueprintVersionId
                        ? `Version duoc chon: ${publishedVersions.find((version) => version.id === selectedBlueprintVersionId)?.code ?? selectedBlueprintVersionId}`
                        : 'Chua chon version'}
                    </p>
                    <p className="text-sm font-medium text-slate-600">
                      {publishedVersions.length
                        ? 'Chi liet ke cac version dang PUBLISHED.'
                        : 'Chua co version PUBLISHED de CHAIR chot.'}
                    </p>
                  </div>
                  <div className="md:col-span-2 flex justify-end">
                    <button
                      className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white"
                      disabled={!selectedBlueprintVersionId || !publishedVersions.length}
                      type="submit"
                    >
                      CHAIR chot version su dung
                    </button>
                  </div>
                </form>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                  Chi CHAIR cua exam duoc chot version su dung.
                </div>
              )}
            </div>
          ) : null}

          {hasBlueprint && exam.blueprintVersionId ? (
            <div className="grid gap-4">
              <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 md:grid-cols-2">
                <InfoItem label="Ten blueprint" value={blueprint?.name ?? '-'} />
                <InfoItem label="Code" value={blueprint?.code ?? '-'} />
                <InfoItem
                  label="Version dang duoc chot"
                  value={finalizedBlueprintVersion ? `Version ${finalizedBlueprintVersion.version} - ${finalizedBlueprintVersion.code}` : 'Khong tim thay version'}
                />
                <InfoItem label="Blueprint version ID" value={formatNullableText(exam.blueprintVersionId)} />
              </div>

              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                Version nay dang duoc su dung de tao exam paper.
              </div>

              {!finalizedBlueprintVersion ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  Khong tai duoc version da chot tu blueprint hien tai. Hay mo blueprint de kiem tra lai version.
                </div>
              ) : null}

              {finalizedBlockingFixedSlots.length ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  Version da chot van co slot FIXED tro toi question chua PUBLISHED, nen paper flow dang bi khoa.
                </div>
              ) : null}

              <div className="flex justify-end">
                <button
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white"
                  onClick={() => navigate(`${blueprintBasePath}/${blueprint?.id}`)}
                  type="button"
                >
                  Mo chi tiet blueprint
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === 'blueprint' && hasBlueprint && canUpdateInfo ? (
        <form
          className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault()
            void (async () => {
              if (!(await confirm({ message: 'Ban co chac muon luu thong tin exam nay khong?' }))) {
                return
              }
              try {
                const result = await updateExamMutation.mutateAsync({
                  examId: exam.id,
                  payload: {
                    description: draftDescription || exam.description || null,
                    name: draftName || exam.name,
                  },
                })
                await refresh()
                setMessage(result)
                setError(null)
              } catch (submitError) {
                setError(getErrorMessage(submitError))
              }
            })()
          }}
        >
          <Field label="Ten exam" value={draftName} onChange={setDraftName} placeholder={exam.name} />
          <Field label="Mo ta" value={draftDescription} onChange={setDraftDescription} placeholder={exam.description ?? ''} />
          <div className="md:col-span-2 flex justify-end">
            <button className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white" type="submit">
              Luu thong tin
            </button>
          </div>
        </form>
      ) : null}

      {activeTab === 'workflow' ? (
        <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-black text-slate-950">Workflow exam</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <WorkflowReadinessItem isReady readyLabel="DRAFT" missingLabel="DRAFT" />
            <WorkflowReadinessItem isReady={exam.status === 'SCHEDULED' || exam.status === 'IN_PROGRESS' || exam.status === 'CLOSED' || exam.status === 'RESULTS_PUBLISHED'} readyLabel="SCHEDULED" missingLabel="SCHEDULED" />
            <WorkflowReadinessItem isReady={exam.status === 'IN_PROGRESS' || exam.status === 'CLOSED' || exam.status === 'RESULTS_PUBLISHED'} readyLabel="IN_PROGRESS" missingLabel="IN_PROGRESS" />
            <WorkflowReadinessItem isReady={exam.status === 'CLOSED' || exam.status === 'RESULTS_PUBLISHED'} readyLabel="CLOSED" missingLabel="CLOSED" />
            <WorkflowReadinessItem isReady={exam.status === 'RESULTS_PUBLISHED'} readyLabel="RESULTS_PUBLISHED" missingLabel={exam.status === 'CANCELLED' ? 'CANCELLED' : 'RESULTS_PUBLISHED'} />
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
            {'Flow chuan: DRAFT -> SCHEDULED -> IN_PROGRESS -> CLOSED -> RESULTS_PUBLISHED. Can popup xac nhan truoc khi chuyen trang thai.'}
          </div>
          {canShowExamWorkflow ? (
          <div className="flex flex-wrap gap-3">
            {examStatusActions.map((action) => (
              <button
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                key={action}
                onClick={() => {
                  void (async () => {
                    try {
                      if (!(await confirm({ message: `Báº¡n cÃ³ cháº¯c muá»‘n ${getExamActionLabel(action).toLowerCase()}?` }))) {
                        return
                      }
                      const result = await updateStatusMutation.mutateAsync({
                        examId: exam.id,
                        payload: { action },
                      })
                      await refresh()
                      setMessage(result)
                      setError(null)
                    } catch (submitError) {
                      setError(getErrorMessage(submitError))
                    }
                  })()
                }}
                type="button"
              >
                {getExamActionLabel(action)}
              </button>
            ))}
          </div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              Chá»‰ SCHOOL_ADMIN Ä‘Æ°á»£c Ä‘iá»u khiá»ƒn workflow exam táº­p trung.
            </div>
          )}
        </div>
      ) : null}

      <div className="grid gap-6">
        {activeTab === 'people' ? (
        <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-950">Thanh vien exam</h2>
          </div>
          {canManageMembers ? (
            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault()
                void (async () => {
                  if (!(await confirm({ message: 'Ban co chac muon them thanh vien vao exam nay khong?' }))) {
                    return
                  }
                  try {
                    const payload: CreateExamMemberRequest = {
                      role: memberRole,
                      userId: memberUserId,
                    }
                    const result = await createMemberMutation.mutateAsync({ examId: exam.id, payload })
                    await refresh()
                    setMemberUserId('')
                    setMessage(result)
                    setError(null)
                  } catch (submitError) {
                    setError(getErrorMessage(submitError))
                  }
                })()
              }}
            >
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]">
                <Field
                  label="Tim giao vien"
                  value={memberSearch}
                  onChange={(value) => {
                    setMemberSearch(value)
                    setMemberPage(1)
                  }}
                  placeholder="Nhap ten hoac email"
                />
                <SelectField
                  label="Role"
                  value={memberRole}
                  onChange={(value) => setMemberRole(value as ExamMemberRole)}
                  options={[
                    { label: 'Chair', value: 'CHAIR' },
                    { label: 'Author', value: 'AUTHOR' },
                    { label: 'Reviewer', value: 'REVIEWER' },
                  ]}
                />
                <div className="self-end">
                  <button className="inline-flex h-11 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:bg-slate-300" disabled={!memberUserId} type="submit">
                    Them
                  </button>
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                Chon giao vien o danh sach ben duoi, sau do chon role va bam Them. Exam can du AUTHOR, REVIEWER va CHAIR de workflow chay dung.
              </div>
              {memberUserId ? (
                <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700">
                  Da chon user: {memberUserId}
                </div>
              ) : null}
              <div className="grid gap-3">
                {schoolUsersQuery.data?.content.map((schoolUser) => {
                  const displayName = schoolUser.user?.fullName?.trim() || schoolUser.user?.email || schoolUser.userId || 'Unknown'
                  const displayUserId = schoolUser.userId ?? schoolUser.user?.id ?? ''
                  return (
                    <button
                      className={`grid gap-1 rounded-lg border px-4 py-3 text-left transition ${memberUserId === displayUserId ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}
                      key={schoolUser.id}
                      onClick={() => setMemberUserId(displayUserId)}
                      type="button"
                    >
                      <span className="text-sm font-black text-slate-950">{displayName}</span>
                      <span className="text-xs font-semibold text-slate-500">{schoolUser.user?.email ?? displayUserId}</span>
                    </button>
                  )
                })}
              </div>
              <div className="flex items-center justify-between text-sm font-semibold text-slate-600">
                <span>
                  {schoolUsersQuery.data?.totalElements ?? 0} giao vien, trang {schoolUsersQuery.data?.page ?? 1}/{schoolUsersQuery.data?.totalPages ?? 1}
                </span>
                <div className="flex gap-2">
                  <button
                    className="h-9 rounded-lg border border-slate-200 px-3 transition hover:bg-slate-50 disabled:opacity-50"
                    disabled={memberPage <= 1}
                    onClick={() => setMemberPage((current) => current - 1)}
                    type="button"
                  >
                    Truoc
                  </button>
                  <button
                    className="h-9 rounded-lg border border-slate-200 px-3 transition hover:bg-slate-50 disabled:opacity-50"
                    disabled={memberPage >= (schoolUsersQuery.data?.totalPages ?? 1)}
                    onClick={() => setMemberPage((current) => current + 1)}
                    type="button"
                  >
                    Sau
                  </button>
                </div>
              </div>
            </form>
          ) : null}

          <div className="grid gap-3">
            {pagedMembers.map((member) => (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-4" key={member.id}>
                <div>
                  <p className="text-sm font-black text-slate-950">
                    {member.user?.fullName?.trim() || member.user?.email || member.userId}
                  </p>
                  <p className="text-xs font-medium text-slate-500">
                    {member.user?.email ?? member.userId} - {member.role}
                  </p>
                </div>
                {canManageMembers ? (
                  <div className="flex gap-2">
                    <select
                      className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 transition focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                      onChange={(event) => {
                        const nextRole = event.target.value as ExamMemberRole

                        if (nextRole === member.role) {
                          return
                        }

                        void (async () => {
                          try {
                            if (!(await confirm({ message: `Ban co chac muon doi role thanh ${nextRole}?` }))) {
                              return
                            }
                            const result = await updateMemberMutation.mutateAsync({
                              examId: exam.id,
                              memberId: member.id,
                              payload: { role: nextRole },
                            })
                            await refresh()
                            setMessage(result)
                            setError(null)
                          } catch (submitError) {
                            setError(getErrorMessage(submitError))
                          }
                        })()
                      }}
                      value={member.role}
                    >
                      <option value="AUTHOR">Author</option>
                      <option value="REVIEWER">Reviewer</option>
                      <option value="CHAIR">Chair</option>
                    </select>
                    <button
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 px-3 text-sm font-bold text-red-600 transition hover:bg-red-50"
                      onClick={() => {
                        void (async () => {
                          try {
                            if (!(await confirm({ message: 'Ban co chac muon go thanh vien nay khoi exam khong?' }))) {
                              return
                            }
                            const result = await deleteMemberMutation.mutateAsync({
                              examId: exam.id,
                              memberId: member.id,
                            })
                            await refresh()
                            setMessage(result)
                            setError(null)
                          } catch (submitError) {
                            setError(getErrorMessage(submitError))
                          }
                        })()
                      }}
                      type="button"
                    >
                      Xoa
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-sm font-semibold text-slate-600">
            <span>
              {exam.members?.length ?? 0} Thành viên, trang {memberListPage}/{totalMemberPages}
            </span>
            <div className="flex gap-2">
              <button
                className="h-9 rounded-lg border border-slate-200 px-3 transition hover:bg-slate-50 disabled:opacity-50"
                disabled={memberListPage <= 1}
                onClick={() => setMemberListPage((current) => current - 1)}
                type="button"
              >
                Truoc
              </button>
              <button
                className="h-9 rounded-lg border border-slate-200 px-3 transition hover:bg-slate-50 disabled:opacity-50"
                disabled={memberListPage >= totalMemberPages}
                onClick={() => setMemberListPage((current) => current + 1)}
                type="button"
              >
                Sau
              </button>
            </div>
          </div>
        </div>
        ) : null}

        {activeTab === 'papers' ? (
        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Đề thi / Mã đề</h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Exam paper chỉ mở sau khi CHAIR chốt phiên bản blueprint sử dụng.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className={`inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-semibold ${canUsePaperActions ? 'border-slate-200 text-slate-700 hover:bg-slate-50' : 'border-slate-200 text-slate-400'}`}
                disabled={!canUsePaperActions}
                onClick={() => navigate(`${basePath}/${exam.id}/papers`)}
                type="button"
              >
                Mở danh sách mã đề
              </button>
              {canManagePapers ? (
                <button
                  className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold text-white ${canUsePaperActions ? 'bg-linear-to-r from-indigo-600 to-cyan-500' : 'bg-slate-300'}`}
                  disabled={!canUsePaperActions}
                  onClick={() => {
                    void (async () => {
                      if (!canUsePaperActions) {
                        return
                      }
                      try {
                        const result = await createPaperMutation.mutateAsync(exam.id)
                        await refresh()
                        setMessage(result)
                        setError(null)
                      } catch (submitError) {
                        setError(getErrorMessage(submitError))
                      }
                    })()
                  }}
                  type="button"
                >
                  Tạo mã đề
                </button>
              ) : null}
            </div>
          </div>
          {!exam.blueprintVersionId ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              CHAIR cần chốt phiên bản blueprint trước khi tạo mã đề.
            </div>
          ) : null}
          {exam.blueprintVersionId && !finalizedBlueprintVersion ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              Không tải được phiên bản đã chốt từ blueprint hiện tại, nên luồng mã đề đang bị khóa.
            </div>
          ) : null}
          {finalizedBlockingFixedSlots.length ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              Phiên bản đã chốt vẫn còn ô câu hỏi cố định trỏ tới câu hỏi chưa xuất bản, nên thao tác với mã đề đang bị khóa.
            </div>
          ) : null}
          <div className="grid gap-4">
            {exam.papers?.map((paper) => (
              <div className="grid gap-4 rounded-2xl border border-slate-200 p-5" key={paper.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-indigo-50 text-indigo-600">
                      <FilePenLine size={20} />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{paper.code} · Variant {paper.variant}</p>
                      <div className="mt-1"><PaperStatusBadge status={paper.status} /></div>
                    </div>
                  </div>
                  {canManagePapers ? (
                    <div className="flex flex-wrap gap-2">
                      {paperStatusActions.map((action) => (
                        <button
                          className={`inline-flex h-9 items-center justify-center rounded-full border px-3 text-xs font-bold ${canUsePaperActions ? 'border-slate-200 text-slate-700 hover:bg-slate-50' : 'border-slate-200 text-slate-400'}`}
                          disabled={!canUsePaperActions}
                          key={action}
                          onClick={() => {
                            void (async () => {
                              if (!canUsePaperActions) {
                                return
                              }
                              try {
                                const result = await updatePaperStatusMutation.mutateAsync({
                                  paperId: paper.id,
                                  payload: { action },
                                })
                                await refresh()
                                setMessage(result)
                                setError(null)
                              } catch (submitError) {
                                setError(getErrorMessage(submitError))
                              }
                            })()
                          }}
                          type="button"
                        >
                          {action}
                        </button>
                      ))}
                      <button
                        className={`inline-flex h-9 items-center justify-center rounded-full border px-3 text-xs font-bold ${canUsePaperActions ? 'border-slate-200 text-slate-700 hover:bg-slate-50' : 'border-slate-200 text-slate-400'}`}
                        disabled={!canUsePaperActions}
                        onClick={() => navigate(`${basePath}/${exam.id}/papers/${paper.id}`)}
                        type="button"
                      >
                        Chi tiết mã đề
                      </button>
                      <button
                        className={`inline-flex h-9 items-center justify-center rounded-full border px-3 text-xs font-bold ${canUsePaperActions ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-slate-200 text-slate-400'}`}
                        disabled={!canUsePaperActions}
                        onClick={() => {
                          void (async () => {
                            if (!canUsePaperActions) {
                              return
                            }
                            try {
                              const result = await deletePaperMutation.mutateAsync(paper.id)
                              await refresh()
                              setMessage(result)
                              setError(null)
                            } catch (submitError) {
                              setError(getErrorMessage(submitError))
                            }
                          })()
                        }}
                        type="button"
                      >
                        Xóa mã đề
                      </button>
                    </div>
                  ) : (
                    <button
                      className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      onClick={() => navigate(`${basePath}/${exam.id}/papers/${paper.id}`)}
                      type="button"
                    >
                      Chi tiết mã đề
                    </button>
                  )}
                </div>

                {paper.sections.map((section) => (
                  <div className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4" key={section.id}>
                    <p className="text-sm font-black text-slate-950">
                      Section {section.order}: {formatNullableText(section.title)}
                    </p>
                    {section.items.map((item) => (
                      <PaperItemEditor
                        canEdit={canManagePapers && canUsePaperActions}
                        item={item}
                        key={item.id}
                        onSave={async (questionId) => {
                          try {
                            const result = await updatePaperItemMutation.mutateAsync({
                              itemId: item.id,
                              paperId: paper.id,
                              payload: { questionId },
                            })
                            await refresh()
                            setMessage(result)
                            setError(null)
                          } catch (submitError) {
                            setError(getErrorMessage(submitError))
                          }
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        ) : null}
      </div>
    </section>
  )
}

function CreateExamCard({
  isSubmitting,
  onCancel,
  onSubmit,
}: {
  isSubmitting: boolean
  onCancel: () => void
  onSubmit: (payload: CreateExamRequest) => void
}) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  return (
    <form
      className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 md:grid-cols-3"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit({
          code,
          description: description || null,
          languageId: DEFAULT_LANGUAGE_ID,
          name,
        })
      }}
    >
      <Field label="Code" value={code} onChange={setCode} />
      <Field label="Ten exam" value={name} onChange={setName} />
      <Field label="Mo ta" value={description} onChange={setDescription} />
      <div className="md:col-span-3 flex justify-end gap-3">
        <button className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700" onClick={onCancel} type="button">
          Huy
        </button>
        <button className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white" disabled={isSubmitting} type="submit">
          Tao exam
        </button>
      </div>
    </form>
  )
}

function PaperItemEditor({
  canEdit,
  item,
  onSave,
}: {
  canEdit: boolean
  item: { id: string; order: number; question?: { code?: string | null; id: string; questionText?: string | null } | null; questionId?: string | null }
  onSave: (questionId: string) => void
}) {
  const [questionId, setQuestionId] = useState(item.questionId ?? item.question?.id ?? '')
  const questionCode = (item.question?.code ?? questionId) || 'Chua gan cau hoi'

  useEffect(() => {
    setQuestionId(item.questionId ?? item.question?.id ?? '')
  }, [item.id, item.question?.id, item.questionId])

  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className="text-sm font-black text-slate-950">Item {item.order}</div>
      <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">Question hien tai</p>
        <p className="mt-2 text-sm font-black text-slate-950">{questionCode}</p>
        <p className="mt-1 text-sm font-medium text-slate-600">{formatQuestionNullableText(item.question?.questionText)}</p>
      </div>
      {canEdit ? (
        <QuestionPicker
          allowStatusChange={false}
          basePath="/teacher"
          canEditQuestion={() => true}
          fixedStatus="PUBLISHED"
          mode="single"
          onSelect={(question) => {
            setQuestionId(question.id)
            onSave(question.id)
          }}
          selectedQuestionIds={questionId ? [questionId] : []}
          title="Chon cau hoi published"
        />
      ) : null}
    </div>
  )
}

function Field({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string
  onChange: (value: string) => void
  placeholder?: string
  value: string
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  )
}

function SelectField({
  label,
  onChange,
  options,
  value,
}: {
  label: string
  onChange: (value: string) => void
  options: Array<{ label: string; value: string }>
  value: string
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <select
        className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-950"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function InfoItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <div className="mt-2 text-sm font-bold text-slate-950">{value}</div>
    </div>
  )
}

function WorkflowReadinessItem({
  isReady,
  missingLabel,
  readyLabel,
}: {
  isReady: boolean
  missingLabel: string
  readyLabel: string
}) {
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm font-black ${isReady ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
      {isReady ? readyLabel : missingLabel}
    </div>
  )
}

export function SchoolAdminExamsPage() {
  return <ExamListPage allowCreate basePath="/school-admin/exams" kind="CENTRALIZED" title="Kiem tra tap trung" />
}

export function SchoolAdminExamDetailPage() {
  return (
    <ExamDetailPage
      basePath="/school-admin/exams"
      blueprintBasePath="/school-admin/blueprints"
      canManageMembers
      canManagePapers={false}
      canManageStatus
      canUpdateInfo
      title="Chi tiet kiem tra tap trung"
    />
  )
}

export function TeacherExamsPage() {
  return <ExamListPage allowCreate={false} basePath="/teacher/exams" kind="CENTRALIZED" title="Kiem tra tap trung cua toi" />
}

export function TeacherExamDetailPage() {
  return (
    <ExamDetailPage
      basePath="/teacher/exams"
      blueprintBasePath="/teacher/blueprints"
      canManageMembers={false}
      canManagePapers
      canManageStatus={false}
      canUpdateInfo={false}
      title="Chi tiet exam duoc giao"
    />
  )
}

export function SystemAdminExamsPage() {
  return <ExamListPage allowCreate={false} basePath="/system-admin/exams" kind="CENTRALIZED" readOnly title="Giam sat exam" />
}

export function SystemAdminExamDetailPage() {
  return (
    <ExamDetailPage
      basePath="/system-admin/exams"
      blueprintBasePath="/system-admin/blueprints"
      canManageMembers={false}
      canManagePapers={false}
      canManageStatus={false}
      canUpdateInfo={false}
      title="Chi tiet exam"
    />
  )
}
