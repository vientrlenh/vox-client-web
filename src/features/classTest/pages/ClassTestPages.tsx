import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  BookOpenCheck,
  Calendar,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  Eye,
  FilePenLine,
  Hash,
  Languages,
  LayoutList,
  Lock,
  Megaphone,
  Pencil,
  PlayCircle,
  Plus,
  RefreshCw,
  ScrollText,
  Timer,
  Trash2,
  Users,
  NotebookPen,
} from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { useAppSelector } from '@/app/store/hooks'
import { useMySchoolClassesQuery } from '@/features/classes/api/useMySchoolClassesQuery'
import { useSchoolClassesQuery } from '@/features/classes/api/useSchoolClassesQuery'
import type { SchoolClass } from '@/features/classes/types'
import type { QuestionDto } from '@/features/question/types'
import { toApiError } from '@/shared/api'
import { autoDistributeWeights } from '@/shared/weightDistribution'
import { Pagination } from '@/shared/components/Pagination'
import { useConfirmationDialog } from '@/shared/ui/useConfirmationDialog'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { StatCard } from '@/shared/ui/StatCard'
import { TabPillGroup } from '@/shared/ui/TabPill'
import type { WorkflowStep } from '@/shared/ui/WorkflowStepper'
import { DetailHeaderCard } from '@/shared/ui/DetailHeaderCard'
import { FilterChips } from '@/shared/ui/FilterChips'
import { CandidatesTab } from '@/features/examCore/components/CandidatesTab'
import { ExamListRow } from '@/features/examCore/components/ExamListRow'
import { ExamStreamSetupField } from '@/features/examCore/components/ExamStreamSetupField'
import { QuestionPicker } from '@/features/examCore/components/QuestionPicker'
import { RubricPolicyPicker, type RubricPolicySelection } from '@/features/examCore/components/RubricPolicyPicker'
import { RoomPickerModal } from '@/features/examCore/components/schedule/RoomPickerModal'
import { ScheduleTab } from '@/features/examCore/components/schedule/ScheduleTab'
import { WorkflowTrackerCard } from '@/features/examCore/components/WorkflowTrackerCard'
import {
  examQueryKeys,
  useExamBlueprintSummaryQuery,
  useExamBlueprintsQuery,
  useExamCandidatesQuery,
  useExamQuery,
  useExamSchedulesQuery,
} from '@/features/examCore/api/queries'
import {
  useCreateExamPaperMutation,
  useDeleteExamPaperMutation,
  useSetExamDeliveryModeMutation,
  useUpdateExamPaperStatusMutation,
} from '@/features/examCore/api/mutations'
import { useMatchingTeacherAssessmentPoliciesQuery } from '@/features/examCore/api/assessmentPolicyQueries'
import { buildTimeQuotaWarning, getQuestionAttemptSeconds } from '@/features/examCore/utils/timeQuota'
import { useMySubscriptionQuery } from '@/features/subscription_school/api/useMySubscriptionQuery'
import {
  formatDate,
  formatDateTime,
  formatDurationSeconds,
  formatNullableText,
  getAssessmentPolicyStrictnessLabel,
  getExamChairName,
  getResultDecisionMethodDisplay,
  isExamLockedForEditing,
  RESULT_DECISION_METHODS,
  toDateTimeLocalValue,
  toExamStreamSetup,
  toIsoDateTime,
  toUpdateStreamPayload,
  type ExamBlueprintDto,
  type ExamCandidateDto,
  type ExamDeliveryMode,
  type ExamDto,
  type ExamScheduleDto,
  type ExamStatus,
  type ResultDecisionMethod,
  type SchoolRoomLite,
} from '@/features/examCore/types'
import { useClassTestStatsQuery, useClassTestsQuery } from '../api/useClassTestQueries'
import {
  useChangeClassTestBlueprintMutation,
  useCreateClassTestMutation,
  useDeleteClassTestMutation,
  useDeleteClassTestSectionMutation,
  useUpdateClassTestMutation,
  useUpdateClassTestQuestionsMutation,
  useUpdateClassTestStatusMutation,
} from '../api/useClassTestMutations'
import { EXAM_STREAM_SETUP_PAYLOAD, getClassTestStatusDisplay, type ExamStreamSetup } from '../types'
import { ClassTestPaperAccordionItem } from '../components/ClassTestPaperAccordionItem'
import { ClassTestPaperComposer } from '../components/ClassTestPaperComposer'
import {
  parseOptionalSectionWeight,
  sectionWeightInputValue,
  validateOptionalSectionWeights,
} from '../sectionDraft'

const STATUS_FILTERS: Array<{ label: string; value: '' | ExamStatus }> = [
  { label: 'Tất cả', value: '' },
  { label: 'Bản nháp', value: 'DRAFT' },
  { label: 'Đã lên lịch', value: 'SCHEDULED' },
  { label: 'Đang mở', value: 'IN_PROGRESS' },
  { label: 'Đã đóng', value: 'CLOSED' },
  { label: 'Đã chốt kết quả', value: 'RESULTS_PUBLISHED' },
]

/**
 * Trạng thái mà bài đã có (hoặc đã từng có) bài nộp — trước đó không có gì để chấm,
 * hiện nút chấm bài chỉ dẫn tới một màn rỗng.
 */
const GRADABLE_STATUSES: ExamStatus[] = ['IN_PROGRESS', 'CLOSED', 'RESULTS_PUBLISHED']

function canStartClassTestManually(exam: ExamDto, nowMs: number) {
  if (exam.status !== 'SCHEDULED') {
    return false
  }
  const closeAtMs = exam.closeAt ? new Date(exam.closeAt).getTime() : Number.POSITIVE_INFINITY
  return nowMs < closeAtMs
}

/**
 * Điều kiện backend chặn action SCHEDULE của bài trên lớp: mọi ca thi phải có phòng và giám khảo,
 * mọi học sinh phải đã được xếp ca và có đề. Tính lại ở FE để hiện lý do trước khi bấm, thay vì
 * để giáo viên ăn lỗi 400.
 */
function getClassTestScheduleReadiness(schedules: ExamScheduleDto[], candidates: ExamCandidateDto[]) {
  const missingRoom = schedules.filter((schedule) => !schedule.schoolRoomId).length
  const missingProctor = schedules.filter((schedule) => schedule.proctors.length === 0).length
  const unassignedCandidates = candidates.filter((candidate) => !candidate.scheduleId).length
  const withoutPaper = candidates.filter((candidate) => !candidate.assignedPaperId).length

  const blockingReason =
    schedules.length === 0
      ? 'Bài kiểm tra chưa có ca thi.'
      : missingRoom > 0
        ? 'Ca thi chưa được chọn phòng.'
        : missingProctor > 0
          ? 'Ca thi chưa có giám khảo.'
          : unassignedCandidates > 0
            ? `Còn ${unassignedCandidates} học sinh chưa được xếp vào ca thi.`
            : withoutPaper > 0
              ? `Còn ${withoutPaper} học sinh chưa được gán đề.`
              : null

  return { blockingReason, ready: blockingReason === null }
}

/**
 * `schedules`/`candidates` chỉ có ở trang chi tiết. Trang danh sách bỏ trống để khỏi phải gọi thêm
 * một cặp request cho mỗi dòng — khi đó suy bước "phòng thi & học sinh" từ trạng thái bài: backend
 * chặn SCHEDULE khi chưa đủ điều kiện, nên bài đã rời DRAFT chắc chắn đã qua bước này.
 */
function getClassTestWorkflowSteps(
  exam: ExamDto,
  schedules?: ExamScheduleDto[],
  candidates?: ExamCandidateDto[],
): { completedCount: number; steps: WorkflowStep[] } {
  // Bài trên lớp không còn tự gắn blueprint lúc tạo, và mã đề soạn tay cũng không sinh blueprint ẩn
  // nào — nên exam.blueprintId không nói được đề đã có nội dung thật hay chưa. Đếm trên câu hỏi.
  const papersWithQuestions = exam.papers.filter((paper) => paper.sections.some((section) => section.items.length > 0))
  const hasQuestions = papersWithQuestions.length > 0
  // Phân đề (nhiều mã đề) yêu cầu mọi mã đề đã khoá; một mã đề thì hệ thống tự gán, không cần khoá trước.
  const unlockedPapers = exam.papers.filter((paper) => paper.status !== 'LOCKED').length
  const isScheduled = exam.status !== 'DRAFT' && exam.status !== 'CANCELLED'
  const readiness = schedules && candidates ? getClassTestScheduleReadiness(schedules, candidates) : null
  const blockingReason = readiness?.blockingReason ?? null
  const roomAndStudentsReady = readiness ? readiness.ready : isScheduled

  const step1Done = hasQuestions
  const step2Done = step1Done && roomAndStudentsReady
  const step3Done = isScheduled

  const assignedCandidates = (candidates ?? []).filter((candidate) => candidate.scheduleId).length

  const steps: WorkflowStep[] = [
    {
      icon: step1Done ? <Check size={26} /> : <LayoutList size={24} />,
      label: 'Đề bài',
      state: step1Done ? 'done' : 'current',
      sublabel: !step1Done
        ? 'Chưa có mã đề nào có câu hỏi'
        : exam.papers.length > 1
          ? unlockedPapers > 0
            ? `${exam.papers.length} mã đề · còn ${unlockedPapers} mã đề chưa khoá để phân đề`
            : `${exam.papers.length} mã đề đã khoá, sẵn sàng phân đề`
          : 'Đã có câu hỏi trong đề',
    },
    {
      icon: step2Done ? <Check size={26} /> : <FilePenLine size={24} />,
      label: 'Phòng thi & học sinh',
      state: !step1Done ? 'upcoming' : step2Done ? 'done' : 'current',
      sublabel: step2Done
        ? assignedCandidates > 0
          ? `${assignedCandidates} học sinh đã xếp ca`
          : 'Đã xếp phòng và học sinh'
        : (blockingReason ?? 'Chọn phòng và xếp học sinh vào ca thi'),
    },
    {
      icon: step3Done ? <Check size={26} /> : <PlayCircle size={24} />,
      label: 'Lên lịch & chấm',
      state: !step2Done ? 'upcoming' : step3Done ? 'done' : 'current',
      sublabel: step3Done ? 'Đã lên lịch, bài tự mở khi tới giờ' : 'Bấm lên lịch để chốt ca thi',
    },
  ]

  return { completedCount: [step1Done, step2Done, step3Done].filter(Boolean).length, steps }
}

type ClassTestListPageProps = {
  allowCreate: boolean
  basePath: string
  title: string
}

function ClassTestListPage({ allowCreate, basePath, title }: ClassTestListPageProps) {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<'' | ExamStatus>('')
  const statsQuery = useClassTestStatsQuery()
  const classTestsQuery = useClassTestsQuery({ page, size: 10, status })

  return (
    <section className="mx-auto max-w-290">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-extrabold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-2 text-[15px] text-slate-500">
            Bài kiểm tra, bài luyện và bài về nhà giáo viên tự giao cho lớp mình dạy.
          </p>
        </div>
        {allowCreate ? (
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-linear-to-r from-indigo-600 to-cyan-500 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:opacity-90"
            onClick={() => navigate('/teacher/class-tests/create')}
            type="button"
          >
            <Plus aria-hidden="true" className="size-4.5" />
            Tạo bài trên lớp
          </button>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <StatCard icon={<NotebookPen size={19} />} iconTone="indigo" label="Tổng bài" value={statsQuery.data?.total ?? '-'} />
        <StatCard icon={<PlayCircle size={19} />} iconTone="violet" label="Đang mở" value={statsQuery.data?.open ?? '-'} />
        <StatCard icon={<BookOpenCheck size={19} />} iconTone="amber" label="Chờ chấm" value={statsQuery.data?.pendingGrade ?? '-'} />
        <StatCard icon={<CheckCircle2 size={19} />} iconTone="emerald" label="Đã chốt kết quả" value={statsQuery.data?.graded ?? '-'} />
      </div>

      <FilterChips
        items={STATUS_FILTERS}
        onChange={(value) => {
          setStatus(value)
          setPage(1)
        }}
        value={status}
      />

      <div className="mt-5 grid gap-3.5">
        {classTestsQuery.data?.content.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
            Không có bài trên lớp phù hợp.
          </div>
        ) : (
          classTestsQuery.data?.content.map((exam) => {
            const statusDisplay = getClassTestStatusDisplay(exam.status)
            const { steps } = getClassTestWorkflowSteps(exam)
            const hasContent = exam.papers.some((paper) => paper.sections.some((section) => section.items.length > 0))
            const metaItems = [
              { icon: <Hash aria-hidden="true" className="size-3.5" />, label: exam.code },
              hasContent
                ? { icon: <LayoutList aria-hidden="true" className="size-3.5" />, label: formatNullableText(exam.description) }
                : { icon: <Clock aria-hidden="true" className="size-3.5" />, label: 'Chưa soạn đề bài', tone: 'warning' as const },
            ]
            return (
              <ExamListRow
                key={exam.id}
                metaItems={metaItems}
                onClick={() => navigate(`${basePath}/${exam.id}`)}
                statusLabel={statusDisplay.label}
                statusTone={statusDisplay.tone}
                steps={steps}
                title={exam.name}
              />
            )
          })
        )}
      </div>

      {classTestsQuery.data ? (
        <Pagination
          currentPage={page}
          itemName="bài trên lớp"
          onPageChange={setPage}
          totalElements={classTestsQuery.data.totalElements}
          totalPages={classTestsQuery.data.totalPages}
        />
      ) : null}
    </section>
  )
}

export function TeacherClassTestsPage() {
  return <ClassTestListPage allowCreate basePath="/teacher/class-tests" title="Bài trên lớp" />
}

export function SchoolAdminClassTestsPage() {
  return <ClassTestListPage allowCreate={false} basePath="/school-admin/class-tests" title="Giám sát bài trên lớp" />
}

function ClassPickerTable({
  classes,
  emptyMessage,
  onChange,
  onSearchChange,
  search,
  value,
}: {
  classes: SchoolClass[]
  emptyMessage: string
  onChange: (schoolClassId: string, schoolClassName: string) => void
  onSearchChange: (s: string) => void
  search: string
  value: string
}) {
  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <input
        className="h-10 rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-indigo-400"
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Tìm lớp học"
        value={search}
      />
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="min-w-full text-left">
          <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Chọn</th>
              <th className="px-4 py-2.5">Lớp học</th>
              <th className="px-4 py-2.5">Mã lớp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {classes.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={3}>
                  {emptyMessage}
                </td>
              </tr>
            ) : null}
            {classes.map((schoolClass) => (
              <tr className={value === schoolClass.id ? 'bg-indigo-50' : ''} key={schoolClass.id}>
                <td className="px-4 py-2.5">
                  <button
                    className={[
                      'inline-flex h-8 items-center justify-center rounded-full px-3 text-xs font-bold transition',
                      value === schoolClass.id
                        ? 'bg-indigo-600 text-white'
                        : 'border border-slate-200 text-slate-700 hover:bg-slate-50',
                    ].join(' ')}
                    onClick={() => onChange(schoolClass.id, schoolClass.name)}
                    type="button"
                  >
                    {value === schoolClass.id ? 'Đã chọn' : 'Chọn'}
                  </button>
                </td>
                <td className="px-4 py-2.5 text-sm font-bold text-slate-900">{schoolClass.name}</td>
                <td className="px-4 py-2.5 text-sm text-slate-500">{schoolClass.code}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * `mySchoolClasses` không nhận tham số tìm kiếm ở BE và bảng này không có nút chuyển trang, nên nạp
 * trọn một trang lớn rồi lọc tại chỗ. Trước đây nhánh giáo viên lấy 10 lớp/trang mà `setPage` chỉ
 * được gọi để reset về 1 — giáo viên dạy hơn 10 lớp không có cách nào chọn lớp thứ 11 trở đi, và ô
 * tìm kiếm thì không được truyền xuống query nên gõ vào không lọc gì cả.
 */
const TEACHER_CLASS_PAGE_SIZE = 100

function ClassPicker({ onChange, value }: { onChange: (id: string, name: string) => void; value: string }) {
  const user = useAppSelector((state) => state.auth.user)
  const isTeacher = user?.roles.includes('TEACHER') ?? false
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const teacherClassesQuery = useMySchoolClassesQuery(
    1,
    TEACHER_CLASS_PAGE_SIZE,
    isTeacher ? user?.schoolId ?? '' : '',
    'ACTIVE',
  )
  // Nhánh school-admin giữ nguyên tìm kiếm phía server (query này có nhận `search`).
  const adminClassesQuery = useSchoolClassesQuery(
    page,
    10,
    { languageId: '', schoolGradeId: '', search, status: 'ACTIVE' },
    { enabled: !isTeacher },
  )

  const keyword = search.trim().toLowerCase()
  const teacherClasses = useMemo(() => {
    const all = teacherClassesQuery.data?.content ?? []
    if (!keyword) {
      return all
    }
    return all.filter(
      (schoolClass) =>
        schoolClass.name.toLowerCase().includes(keyword) || schoolClass.code.toLowerCase().includes(keyword),
    )
  }, [teacherClassesQuery.data, keyword])

  const activeQuery = isTeacher ? teacherClassesQuery : adminClassesQuery
  const classes = isTeacher ? teacherClasses : adminClassesQuery.data?.content ?? []

  function handleSearchChange(next: string) {
    setSearch(next)
    if (!isTeacher) {
      setPage(() => 1)
    }
  }

  return (
    <ClassPickerTable
      classes={classes}
      emptyMessage={
        activeQuery.isPending
          ? 'Đang tải danh sách lớp…'
          : keyword
            ? 'Không có lớp nào khớp từ khoá.'
            : 'Bạn chưa được phân vào lớp nào đang hoạt động.'
      }
      onChange={onChange}
      onSearchChange={handleSearchChange}
      search={search}
      value={value}
    />
  )
}

type SelectedRubricVersion = { code: string; id: string; languageId: string; name: string; version: number }

/** Chỉ metadata: soạn đề đã chuyển hẳn sang trang chi tiết nên không còn gì về đề để mang theo. */
type ClassTestCreateDraft = {
  closeAt: string
  deliveryMode: ExamDeliveryMode
  description: string
  maxAttempt: string
  name: string
  openAt: string
  requiresOtp: boolean
  resultDecisionMethod: ResultDecisionMethod
  schoolClassId: string
  schoolClassName: string
  schoolRoom: SchoolRoomLite | null
  streamSetup: ExamStreamSetup
}

type ClassTestCreateLocationState = {
  draft?: ClassTestCreateDraft
  selectedRubricVersion?: SelectedRubricVersion
} | null

export function TeacherClassTestCreatePage() {
  const location = useLocation()
  // key={location.key} forces a full remount whenever navigate() lands here with a fresh
  // history entry (e.g. returning from the rubric-version picker), so the useState
  // initializers below can pick up the new location.state instead of going stale.
  return <ClassTestCreateForm key={location.key} locationState={location.state as ClassTestCreateLocationState} />
}

function ClassTestCreateForm({ locationState }: { locationState: ClassTestCreateLocationState }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const createMutation = useCreateClassTestMutation()
  const createLockedRef = useRef(false)
  const draft = locationState?.draft
  const [name, setName] = useState(draft?.name ?? '')
  const [description, setDescription] = useState(draft?.description ?? '')
  const [schoolClassId, setSchoolClassId] = useState(draft?.schoolClassId ?? '')
  const [schoolClassName, setSchoolClassName] = useState(draft?.schoolClassName ?? '')
  const [openAt, setOpenAt] = useState(draft?.openAt ?? '')
  const [closeAt, setCloseAt] = useState(draft?.closeAt ?? '')
  const [maxAttempt, setMaxAttempt] = useState(draft?.maxAttempt ?? '1')
  const [resultDecisionMethod, setResultDecisionMethod] = useState<ResultDecisionMethod>(draft?.resultDecisionMethod ?? 'HIGHEST')
  // Bài trên lớp cũng thi trong phòng: mặc định học sinh dùng máy của mình, trường nào thi ở
  // phòng máy thì đổi sang LAB. Phòng có thể chọn sau ở tab Xếp lịch nhưng phải có trước khi lên lịch.
  const [deliveryMode, setDeliveryMode] = useState<ExamDeliveryMode>(draft?.deliveryMode ?? 'DEVICE')
  const [schoolRoom, setSchoolRoom] = useState<SchoolRoomLite | null>(draft?.schoolRoom ?? null)
  const [showRoomPicker, setShowRoomPicker] = useState(false)
  // Mặc định mức giám sát đầy đủ, không phải "không giám sát": lựa chọn này không sửa được sau khi
  // tạo bài, và bỏ trống nghĩa là học sinh không vào thi được nếu ứng dụng thi vẫn xin stream token.
  const [streamSetup, setStreamSetup] = useState<ExamStreamSetup>(draft?.streamSetup ?? 'BOTH_REQUIRED')
  const [requiresOtp, setRequiresOtp] = useState(draft?.requiresOtp ?? false)
  const { confirm, dialog } = useConfirmationDialog()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [selectedRubricVersion, setSelectedRubricVersion] = useState<SelectedRubricVersion | null>(
    locationState?.selectedRubricVersion ?? null,
  )
  const [manualPolicyId, setManualPolicyId] = useState<string | null>(null)
  const matchingPoliciesQuery = useMatchingTeacherAssessmentPoliciesQuery({
    languageId: selectedRubricVersion?.languageId,
    rubricVersionId: selectedRubricVersion?.id,
  })
  const matchingPolicies = matchingPoliciesQuery.data ?? []
  // Chỉ 1 chính sách khớp -> tự dùng luôn; nhiều chính sách khớp -> chờ người dùng chọn tay.
  const assessmentPolicyId = matchingPolicies.length === 1 ? matchingPolicies[0].id : manualPolicyId
  const isResolvingPolicy = Boolean(selectedRubricVersion) && matchingPoliciesQuery.isLoading
  const hasNoMatchingPolicy = Boolean(selectedRubricVersion) && !isResolvingPolicy && matchingPolicies.length === 0
  const hasAmbiguousPolicy = Boolean(selectedRubricVersion) && !isResolvingPolicy && matchingPolicies.length > 1 && !manualPolicyId
  // Rubric version là bắt buộc: nó là đường duy nhất suy ra assessmentPolicyId, mà thiếu policy thì
  // ExamSessionResultCalculator ném khi tính kết quả — tức là không có gì để chấm.
  const canSubmitPolicy = Boolean(selectedRubricVersion) && Boolean(assessmentPolicyId) && !isResolvingPolicy && !hasAmbiguousPolicy

  function goToSelectRubricVersion() {
    navigate('/teacher/rubric-versions/select', {
      state: {
        draft: {
          closeAt,
          deliveryMode,
          description,
          maxAttempt,
          name,
          openAt,
          requiresOtp,
          resultDecisionMethod,
          schoolClassId,
          schoolClassName,
          schoolRoom,
          streamSetup,
        } satisfies ClassTestCreateDraft,
        returnTo: '/teacher/class-tests/create',
      },
    })
  }

  function clearSelectedRubricVersion() {
    setSelectedRubricVersion(null)
    setManualPolicyId(null)
  }

  async function handleSubmit() {
    setErrorMessage(null)
    if (!name.trim() || !schoolClassId) {
      setErrorMessage('Vui lòng nhập tên bài và chọn lớp học.')
      return
    }
    if (!selectedRubricVersion) {
      setErrorMessage('Vui lòng chọn phiên bản thang đánh giá (Rubric Version) trước khi tạo.')
      return
    }
    if (isResolvingPolicy) {
      setErrorMessage('Đang tìm chính sách đánh giá phù hợp, vui lòng đợi.')
      return
    }
    if (hasNoMatchingPolicy) {
      setErrorMessage('Phiên bản thang đánh giá này chưa có chính sách đánh giá đã xuất bản. Vui lòng chọn phiên bản khác.')
      return
    }
    if (hasAmbiguousPolicy) {
      setErrorMessage('Vui lòng chọn một chính sách đánh giá phù hợp trước khi tạo.')
      return
    }
    if (!openAt || !closeAt) {
      setErrorMessage('Vui lòng nhập đầy đủ thời gian mở bài và đóng bài.')
      return
    }
    const openAtIso = toIsoDateTime(openAt)
    const closeAtIso = toIsoDateTime(closeAt)
    if (!openAtIso || !closeAtIso) {
      setErrorMessage('Thời gian mở bài hoặc đóng bài không hợp lệ.')
      return
    }
    if (new Date(openAtIso).getTime() >= new Date(closeAtIso).getTime()) {
      setErrorMessage('Thời gian mở bài phải nhỏ hơn thời gian đóng bài.')
      return
    }
    if (createLockedRef.current || createMutation.isPending) {
      return
    }
    createLockedRef.current = true
    if (!(await confirm({ message: 'Bạn có chắc muốn tạo bài trên lớp này không?' }))) {
      createLockedRef.current = false
      return
    }
    try {
      const created = await createMutation.mutateAsync({
        payload: {
          assessmentPolicyId,
          closeAt: closeAtIso,
          deliveryMode: deliveryMode === 'DEVICE' ? 'STUDENT_DEVICE' : 'LAB',
          description: description || null,
          maxAttempt: Number(maxAttempt) || 1,
          name,
          openAt: openAtIso,
          requiresOtp,
          resultDecisionMethod,
          schoolRoomId: schoolRoom?.id ?? null,
          // Qua bảng map, không gán tay hai trường: server chỉ nhận đúng 5 tổ hợp và mọi tổ hợp
          // khác trả về 400.
          ...EXAM_STREAM_SETUP_PAYLOAD[streamSetup],
          schoolClassId,
        },
        schoolClassName,
      })

      // Không await: kết quả refetch của trang danh sách bị vứt đi ngay khi điều hướng, await chỉ làm
      // giáo viên chờ thêm một vòng mạng.
      void queryClient.invalidateQueries({ queryKey: examQueryKeys.all })
      // Vào thẳng trang chi tiết: bài vừa tạo chưa có mã đề nào, soạn đề là việc tiếp theo.
      navigate(`/teacher/class-tests/${created.exam.id}`, {
        state: {
          successMessage: created.candidateCount > 0
            ? `Đã tạo bài trên lớp với ${created.candidateCount} học sinh. Bước tiếp theo: soạn mã đề ở tab Đề bài.`
            : 'Đã tạo bài trên lớp. Lớp chưa có học sinh nào — thêm học sinh ở tab Học sinh trước khi lên lịch.',
        },
      })
    } catch (error) {
      setErrorMessage(toApiError(error).message)
    } finally {
      createLockedRef.current = false
    }
  }

  return (
    <section className="mx-auto max-w-220">
      <h1 className="text-[26px] font-extrabold text-slate-900">Tạo bài trên lớp</h1>
      <p className="mt-1.5 text-sm text-slate-500">
        Nhập thông tin bài kiểm tra. Sau khi tạo, bạn soạn một hoặc nhiều mã đề ngay ở trang chi tiết.
      </p>
      {dialog}

      <FeedbackToast message={errorMessage} onClose={() => setErrorMessage(null)} tone="error" />

      <div className="mt-5 grid gap-4 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-bold text-slate-700">
            Tên bài trên lớp
            <input
              className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-900"
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-slate-700">
            Mô tả
            <input
              className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-900"
              onChange={(event) => setDescription(event.target.value)}
              value={description}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-slate-700">
            Mở lúc
            <input
              className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-900"
              onChange={(event) => setOpenAt(event.target.value)}
              required
              type="datetime-local"
              value={openAt}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-slate-700">
            Đóng lúc
            <input
              className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-900"
              onChange={(event) => setCloseAt(event.target.value)}
              required
              type="datetime-local"
              value={closeAt}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-slate-700">
            Số lượt thi tối đa
            <input
              className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-900"
              min={1}
              onChange={(event) => setMaxAttempt(event.target.value)}
              type="number"
              value={maxAttempt}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-slate-700">
            Cách chốt điểm
            <select
              className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-900"
              onChange={(event) => setResultDecisionMethod(event.target.value as ResultDecisionMethod)}
              value={resultDecisionMethod}
            >
              {RESULT_DECISION_METHODS.map((method) => (
                <option key={method} value={method}>
                  {getResultDecisionMethodDisplay(method)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3.5 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div>
            <span className="text-sm font-bold text-slate-700">Tổ chức thi</span>
            <p className="text-xs text-slate-500">
              Bài trên lớp thi ngay tại phòng có giám khảo. Bạn là giám khảo mặc định của ca thi và có thể thêm
              giáo viên khác sau ở tab Xếp lịch.
            </p>
          </div>

          <div className="grid gap-1.5">
            <span className="text-[13px] font-bold text-slate-700">Thiết bị làm bài</span>
            <div className="flex flex-wrap gap-2.5">
              {(
                [
                  { hint: 'Học sinh làm bài trên máy cá nhân mang tới lớp.', label: 'Thiết bị học sinh', value: 'DEVICE' },
                  { hint: 'Học sinh làm bài trên máy của phòng máy nhà trường.', label: 'Thiết bị nhà trường', value: 'LAB' },
                ] as const
              ).map((option) => (
                <button
                  className={[
                    'min-w-55 flex-1 rounded-xl border p-3.5 text-left transition',
                    deliveryMode === option.value ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:bg-slate-50',
                  ].join(' ')}
                  key={option.value}
                  onClick={() => setDeliveryMode(option.value)}
                  type="button"
                >
                  <span className="text-[13px] font-bold text-slate-900">{option.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-600">{option.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-1.5">
            <span className="text-[13px] font-bold text-slate-700">Phòng thi</span>
            {schoolRoom ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-indigo-200 bg-white p-3">
                <p className="text-[13px] text-slate-700">
                  <b className="text-slate-900">{schoolRoom.name}</b> ({schoolRoom.code})
                </p>
                <div className="flex shrink-0 items-center gap-3">
                  <button className="text-xs font-bold text-indigo-600" onClick={() => setShowRoomPicker(true)} type="button">
                    Đổi phòng
                  </button>
                  <button className="text-xs font-bold text-slate-400 hover:text-red-600" onClick={() => setSchoolRoom(null)} type="button">
                    Bỏ chọn
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="inline-flex h-9.5 w-fit items-center justify-center rounded-full border border-indigo-200 bg-white px-4 text-[13px] font-bold text-indigo-600 hover:bg-indigo-50"
                onClick={() => setShowRoomPicker(true)}
                type="button"
              >
                Chọn phòng thi
              </button>
            )}
            <p className="text-xs text-slate-500">
              Có thể chọn sau ở tab Xếp lịch, nhưng phải có phòng thì mới lên lịch được.
            </p>
          </div>

          <ExamStreamSetupField
            description="Quyết định học sinh phải chia sẻ những gì trong lúc làm bài."
            onChange={setStreamSetup}
            value={streamSetup}
          />

          <label className="inline-flex w-fit items-center gap-2 text-[13px] font-medium text-slate-700">
            <input checked={requiresOtp} onChange={(event) => setRequiresOtp(event.target.checked)} type="checkbox" />
            Bắt học sinh nhập mã OTP của ca thi khi vào bài
          </label>
        </div>

        <div className="grid gap-1.5 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <span className="text-sm font-bold text-slate-700">
            Phiên bản thang đánh giá (Rubric Version) <span className="text-red-600">*</span>
          </span>
          <p className="text-xs text-slate-500">
            Bắt buộc — quyết định chính sách đánh giá dùng để chấm bài. Thiếu nó thì bài không chấm được.
          </p>

          {!selectedRubricVersion ? (
            <button
              className="mt-1.5 inline-flex h-9.5 w-fit items-center justify-center rounded-full border border-indigo-200 bg-white px-4 text-[13px] font-bold text-indigo-600 hover:bg-indigo-50"
              onClick={goToSelectRubricVersion}
              type="button"
            >
              Chọn phiên bản thang đánh giá
            </button>
          ) : (
            <div className="mt-1.5 grid gap-2 rounded-lg border border-indigo-200 bg-white p-3.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[13px] text-slate-700">
                  Đã chọn <b className="text-slate-900">{selectedRubricVersion.name}</b> ({selectedRubricVersion.code} · v
                  {selectedRubricVersion.version})
                </p>
                <div className="flex shrink-0 items-center gap-3">
                  <button className="text-xs font-bold text-indigo-600" onClick={goToSelectRubricVersion} type="button">
                    Đổi phiên bản
                  </button>
                  <button
                    className="text-xs font-bold text-slate-400 hover:text-red-600"
                    onClick={clearSelectedRubricVersion}
                    type="button"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>

              {isResolvingPolicy ? <p className="text-xs text-slate-400">Đang tìm chính sách đánh giá phù hợp…</p> : null}

              {hasNoMatchingPolicy ? (
                <p className="text-xs font-semibold text-red-700">
                  Chưa có chính sách đánh giá đã xuất bản cho phiên bản này — không tạo bài được. Vui lòng chọn phiên
                  bản khác.
                </p>
              ) : null}

              {matchingPolicies.length > 1 ? (
                <div className="grid gap-1.5">
                  <p className="text-xs font-semibold text-slate-600">Có {matchingPolicies.length} chính sách khớp — chọn một:</p>
                  {matchingPolicies.map((policy) => (
                    <button
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-xs font-semibold ${
                        manualPolicyId === policy.id
                          ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                      key={policy.id}
                      onClick={() => setManualPolicyId(policy.id)}
                      type="button"
                    >
                      <span>
                        Phiên bản {policy.version} · {getAssessmentPolicyStrictnessLabel(policy.strictness)} · Điểm đạt{' '}
                        {policy.passingScore ?? '-'}
                      </span>
                      <span>
                        {formatDate(policy.effectiveFrom)}
                        {policy.effectiveTo ? ` – ${formatDate(policy.effectiveTo)}` : ''}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}

              {assessmentPolicyId && matchingPolicies.length === 1 ? (
                <p className="text-xs font-semibold text-emerald-700">
                  Sẽ gắn chính sách đánh giá: {getAssessmentPolicyStrictnessLabel(matchingPolicies[0].strictness)} · Điểm đạt{' '}
                  {matchingPolicies[0].passingScore ?? '-'}
                </p>
              ) : null}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-[15px] font-extrabold text-slate-900">Chọn lớp học</h2>
          <div className="mt-2">
            <ClassPicker
              onChange={(id, className) => {
                setSchoolClassId(id)
                setSchoolClassName(className)
              }}
              value={schoolClassId}
            />
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-4">
          <p className="text-[13px] font-bold text-slate-700">Soạn đề ở bước sau</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Sau khi tạo, bạn vào tab <b>Đề bài</b> của bài này để soạn mã đề — chọn câu hỏi trực tiếp, sinh từ blueprint
            có sẵn, hoặc sao chép mã đề đã có. Tạo nhiều mã đề thì phân đề cho học sinh ở tab Xếp lịch.
          </p>
        </div>

        <div className="flex justify-end">
          <button
            className="inline-flex h-10.5 items-center justify-center rounded-full bg-indigo-600 px-5 text-sm font-bold text-white disabled:opacity-60"
            disabled={createMutation.isPending || !canSubmitPolicy}
            onClick={handleSubmit}
            title={
              !selectedRubricVersion
                ? 'Chọn phiên bản thang đánh giá trước khi tạo'
                : hasNoMatchingPolicy
                  ? 'Phiên bản thang đánh giá này chưa có chính sách đánh giá đã xuất bản'
                  : hasAmbiguousPolicy
                    ? 'Chọn một chính sách đánh giá phù hợp trước khi tạo'
                    : undefined
            }
            type="button"
          >
            {createMutation.isPending ? 'Đang tạo…' : 'Tạo bài trên lớp'}
          </button>
        </div>
      </div>

      {showRoomPicker ? (
        <RoomPickerModal
          onClose={() => setShowRoomPicker(false)}
          onSelect={(room) => {
            setSchoolRoom(room)
            setShowRoomPicker(false)
          }}
        />
      ) : null}
    </section>
  )
}

type ClassTestBlueprintTabProps = {
  blueprintId?: string | null
  blueprintVersionId?: string | null
  canEdit: boolean
  canManage: boolean
  examId: string
  onChanged: () => void
}

function ClassTestBlueprintTab({ blueprintId, blueprintVersionId, canEdit, canManage, examId, onChanged }: ClassTestBlueprintTabProps) {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [browsingBlueprint, setBrowsingBlueprint] = useState<ExamBlueprintDto | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const currentBlueprintQuery = useExamBlueprintSummaryQuery(blueprintId ?? null)
  const blueprintsQuery = useExamBlueprintsQuery({ isActive: true, keyword, page, size: 8 })
  const subscriptionQuery = useMySubscriptionQuery()
  const changeMutation = useChangeClassTestBlueprintMutation()
  const { confirm, dialog } = useConfirmationDialog()

  const currentBlueprint = currentBlueprintQuery.data
  const currentVersion = currentBlueprint?.versions.find((version) => version.id === blueprintVersionId)
  const maxTimePerAttemptMin = subscriptionQuery.data?.plan?.maxTimePerAttemptMin ?? null

  async function handleSwitch(newBlueprintId: string, newVersionId: string) {
    const version = browsingBlueprint?.versions.find((candidate) => candidate.id === newVersionId)
    const quotaWarning = buildTimeQuotaWarning(
      `Phiên bản blueprint ${version?.code ?? ''}`.trim(),
      version?.totalTimeLimitSeconds,
      maxTimePerAttemptMin,
    )
    if (quotaWarning) {
      setErrorMessage(`${quotaWarning} Không thể gắn blueprint này.`)
      return
    }
    if (
      !(await confirm({
        message: 'Đổi blueprint sẽ xóa toàn bộ câu hỏi hiện tại của mã đề và tạo lại theo blueprint mới. Tiếp tục?',
      }))
    ) {
      return
    }
    try {
      await changeMutation.mutateAsync({ examId, payload: { blueprintId: newBlueprintId, blueprintVersionId: newVersionId } })
      setShowPicker(false)
      setBrowsingBlueprint(null)
      onChanged()
    } catch (error) {
      setErrorMessage(toApiError(error).message)
    }
  }

  async function handleDetach() {
    if (
      !(await confirm({
        message: 'Gỡ blueprint sẽ xóa toàn bộ câu hỏi hiện tại của mã đề — bạn sẽ cần soạn lại từ đầu. Tiếp tục?',
      }))
    ) {
      return
    }
    try {
      await changeMutation.mutateAsync({ examId, payload: { blueprintId: null, blueprintVersionId: null } })
      onChanged()
    } catch (error) {
      setErrorMessage(toApiError(error).message)
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5.5">
      <FeedbackToast message={errorMessage} onClose={() => setErrorMessage(null)} tone="error" />
      {dialog}
      {!showPicker ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-extrabold text-slate-900">Blueprint (tuỳ chọn)</h3>
            {currentBlueprint && currentVersion ? (
              <p className="mt-1 text-[13px] text-slate-500">
                Đang dùng <b className="text-slate-900">{currentBlueprint.name}</b> · {currentBlueprint.code} · phiên bản{' '}
                {currentVersion.code}
              </p>
            ) : (
              <p className="mt-1 text-[13px] text-slate-500">
                Bài này đang soạn câu hỏi trực tiếp, không dùng blueprint dùng chung nào.
              </p>
            )}
          </div>
          {canManage ? (
            <div className="flex items-center gap-2">
              {currentBlueprint ? (
                <button
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  onClick={() => navigate(`/teacher/blueprints/${currentBlueprint.id}`)}
                  type="button"
                >
                  <Eye aria-hidden="true" className="size-3.5" />
                  Xem chi tiết
                </button>
              ) : null}
              {canEdit ? (
                <>
                  <button
                    className="inline-flex h-9 items-center justify-center rounded-full bg-indigo-600 px-4 text-xs font-bold text-white hover:bg-indigo-700"
                    onClick={() => setShowPicker(true)}
                    type="button"
                  >
                    Đổi blueprint khác
                  </button>
                  {currentBlueprint ? (
                    <button
                      className="text-xs font-bold text-slate-400 hover:text-red-600"
                      onClick={() => void handleDetach()}
                      type="button"
                    >
                      Gỡ blueprint
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : browsingBlueprint ? (
        <div>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[13px] font-extrabold text-slate-900">
              Chọn phiên bản đã xuất bản của {browsingBlueprint.name}
            </h3>
            <button
              className="shrink-0 text-xs font-bold text-slate-400 hover:text-slate-600"
              onClick={() => setBrowsingBlueprint(null)}
              type="button"
            >
              Quay lại
            </button>
          </div>
          <div className="mt-2.5 grid gap-2">
            {browsingBlueprint.versions.filter((version) => version.status === 'PUBLISHED').length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 px-4 py-4 text-center text-xs text-slate-400">
                Blueprint này chưa có phiên bản nào được xuất bản.
              </div>
            ) : (
              browsingBlueprint.versions
                .filter((version) => version.status === 'PUBLISHED')
                .map((version) => {
                  const quotaWarning = buildTimeQuotaWarning(
                    `Phiên bản blueprint ${version.code}`,
                    version.totalTimeLimitSeconds,
                    maxTimePerAttemptMin,
                  )
                  return (
                    <button
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-left text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={Boolean(quotaWarning)}
                      key={version.id}
                      onClick={() => void handleSwitch(browsingBlueprint.id, version.id)}
                      title={quotaWarning ?? undefined}
                      type="button"
                    >
                      <span>
                        <span className="font-bold text-slate-900">{version.code}</span>
                        {quotaWarning ? <span className="mt-1 block text-[11px] font-bold text-red-600">{quotaWarning}</span> : null}
                      </span>
                      <span className="text-xs text-slate-500">{version.sectionCount ?? version.sections?.length ?? 0} phần</span>
                    </button>
                  )
                })
            )}
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[13px] font-extrabold text-slate-900">Chọn blueprint</h3>
            <button
              className="shrink-0 text-xs font-bold text-slate-400 hover:text-slate-600"
              onClick={() => setShowPicker(false)}
              type="button"
            >
              Hủy
            </button>
          </div>
          <input
            className="mt-2.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-indigo-400"
            onChange={(event) => {
              setKeyword(event.target.value)
              setPage(1)
            }}
            placeholder="Tìm blueprint theo mã hoặc tên…"
            value={keyword}
          />
          <div className="mt-2.5 grid gap-2">
            {blueprintsQuery.data?.content.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 px-4 py-4 text-center text-xs text-slate-400">
                Không tìm thấy blueprint phù hợp.
              </div>
            ) : (
              blueprintsQuery.data?.content.map((blueprint) => (
                <button
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-left text-sm hover:bg-slate-50"
                  key={blueprint.id}
                  onClick={() => setBrowsingBlueprint(blueprint)}
                  type="button"
                >
                  <span>
                    <span className="font-bold text-slate-900">{blueprint.name}</span>{' '}
                    <span className="text-xs text-slate-500">· {blueprint.code}</span>
                  </span>
                  <span className="text-xs text-slate-500">{blueprint.versionCount ?? 0} phiên bản</span>
                </button>
              ))
            )}
          </div>
          {blueprintsQuery.data && blueprintsQuery.data.totalElements > 0 ? (
            <div className="mt-2.5 flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>{blueprintsQuery.data.totalElements} blueprint</span>
              <div className="flex gap-2">
                <button
                  className="h-8 rounded-lg border border-slate-200 px-3 disabled:opacity-40"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                  type="button"
                >
                  Trước
                </button>
                <button
                  className="h-8 rounded-lg border border-slate-200 px-3 disabled:opacity-40"
                  disabled={page >= blueprintsQuery.data.totalPages}
                  onClick={() => setPage((current) => current + 1)}
                  type="button"
                >
                  Sau
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

type ClassTestDetailPageProps = {
  canManage: boolean
}

type DetailTab = 'blueprint' | 'papers' | 'schedule' | 'students'

function ClassTestDetailPage({ canManage }: ClassTestDetailPageProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { examId } = useParams()
  const examQuery = useExamQuery(examId ?? null)
  const exam = examQuery.data
  // Cùng queryKey với ScheduleTab/CandidatesTab nên TanStack Query dùng chung cache, không gọi thêm request.
  const schedulesQuery = useExamSchedulesQuery(examId ?? null)
  const candidatesQuery = useExamCandidatesQuery(examId ?? null)
  const subscriptionQuery = useMySubscriptionQuery()
  const updateQuestionsMutation = useUpdateClassTestQuestionsMutation()
  const updateExamMutation = useUpdateClassTestMutation()
  const updateStatusMutation = useUpdateClassTestStatusMutation()
  const deleteMutation = useDeleteClassTestMutation()
  const deleteSectionMutation = useDeleteClassTestSectionMutation()
  const setDeliveryModeMutation = useSetExamDeliveryModeMutation()
  const createPaperMutation = useCreateExamPaperMutation()
  const updatePaperStatusMutation = useUpdateExamPaperStatusMutation()
  const deletePaperMutation = useDeleteExamPaperMutation()
  const [tab, setTab] = useState<DetailTab>('papers')
  const [selectedPaperId, setSelectedPaperId] = useState<string | null>(null)
  const [showPaperComposer, setShowPaperComposer] = useState(false)
  const [copyFromPaperId, setCopyFromPaperId] = useState('')
  const paperActionLockedRef = useRef(false)
  const [message, setMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [pickerMode, setPickerMode] = useState<{ kind: 'existing'; sectionIndex: number } | { kind: 'new'; title: string } | null>(null)
  const [showEditInfo, setShowEditInfo] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editOpenAt, setEditOpenAt] = useState('')
  const [editCloseAt, setEditCloseAt] = useState('')
  const [editMaxAttempt, setEditMaxAttempt] = useState('1')
  const [editResultDecisionMethod, setEditResultDecisionMethod] = useState<ResultDecisionMethod>('HIGHEST')
  const [editRequiresOtp, setEditRequiresOtp] = useState(false)
  const [editStreamSetup, setEditStreamSetup] = useState<ExamStreamSetup>('BOTH_REQUIRED')
  const [editPolicySelection, setEditPolicySelection] = useState<RubricPolicySelection>({
    assessmentPolicyId: null,
    isBlocked: false,
  })
  const [editingSectionIndex, setEditingSectionIndex] = useState<number | null>(null)
  const [editSectionTitle, setEditSectionTitle] = useState('')
  const [editSectionInstruction, setEditSectionInstruction] = useState('')
  const [editSectionWeight, setEditSectionWeight] = useState('')
  const [nowMs, setNowMs] = useState(() => Date.now())
  const { confirm, dialog } = useConfirmationDialog()

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 30000)
    return () => window.clearInterval(intervalId)
  }, [])

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.all })
  }

  // Bài trên lớp giờ có thể có nhiều mã đề. Trình soạn thảo bên dưới luôn thao tác trên đúng mã đề
  // đang chọn — đoán "mã đề đầu tiên" là sửa nhầm đề mà giáo viên không hề biết.
  const papers = exam?.papers ?? []
  const selectedPaper = papers.find((paper) => paper.id === selectedPaperId) ?? papers[0] ?? null
  const paperSections = selectedPaper?.sections ?? []
  // Phân đề chỉ mở khi mọi mã đề đã khoá — đếm ở đây để chỉ đúng việc còn thiếu, thay vì để giáo
  // viên sang tab Xếp lịch rồi mới gặp thông báo chặn.
  const unlockedPaperCount = papers.filter((paper) => paper.status !== 'LOCKED').length
  const maxTimePerAttemptMin = subscriptionQuery.data?.plan?.maxTimePerAttemptMin ?? null

  function currentSectionsPayload() {
    return paperSections.map((section) => ({
      instruction: section.instruction ?? null,
      questionIds: (section.items.map((item) => item.questionId).filter(Boolean) as string[]),
      questionWeights: Object.fromEntries(
        section.items.filter((item) => item.questionId).map((item) => [item.questionId as string, item.weight ?? null]),
      ) as Record<string, number | null>,
      weight: section.weight ?? null,
      title: section.title?.trim() || 'Part',
    }))
  }

  // Không có UI nhập weight riêng ở khu vực quản lý nhanh này (khác wizard tạo mới) - mỗi khi
  // danh sách câu hỏi trong section đổi, chia lại đều theo đúng thuật toán H.6 (0.5-đầu khi
  // trống hết), giữ nguyên weight của câu đã có nếu chỉ thêm/bớt 1 câu.
  function toApiSections(sections: Array<ReturnType<typeof currentSectionsPayload>[number]>) {
    return sections.map(({ instruction, questionIds, questionWeights, title, weight }) => {
      const resolved = autoDistributeWeights(questionIds.map((id) => questionWeights[id] ?? null))
      return {
        instruction,
        questions: questionIds.map((id, index) => ({ questionId: id, weight: resolved[index] })),
        title,
        weight,
      }
    })
  }

  function openEditInfo() {
    if (!exam) {
      return
    }
    setEditName(exam.name)
    setEditDescription(exam.description ?? '')
    setEditOpenAt(toDateTimeLocalValue(exam.openAt))
    setEditCloseAt(toDateTimeLocalValue(exam.closeAt))
    setEditMaxAttempt(String(exam.maxAttempt ?? 1))
    setEditResultDecisionMethod(exam.resultDecisionMethod ?? 'HIGHEST')
    setEditRequiresOtp(exam.requiresOtp)
    setEditStreamSetup(toExamStreamSetup(exam.requiredStreamType, exam.streamTypePermission))
    setEditPolicySelection({ assessmentPolicyId: null, isBlocked: false })
    setShowEditInfo(true)
  }

  async function handleSaveInfo() {
    if (!exam) {
      return
    }
    if (!editOpenAt || !editCloseAt) {
      setErrorMessage('Vui lòng nhập đầy đủ thời gian mở bài và đóng bài.')
      return
    }
    const openAtIso = toIsoDateTime(editOpenAt)
    const closeAtIso = toIsoDateTime(editCloseAt)
    if (!openAtIso || !closeAtIso) {
      setErrorMessage('Thời gian mở bài hoặc đóng bài không hợp lệ.')
      return
    }
    if (new Date(openAtIso).getTime() >= new Date(closeAtIso).getTime()) {
      setErrorMessage('Thời gian mở bài phải nhỏ hơn thời gian đóng bài.')
      return
    }
    try {
      await updateExamMutation.mutateAsync({
        examId: exam.id,
        payload: {
          // Không đổi chính sách thì bỏ hẳn field: API sửa hiểu vắng mặt là "giữ nguyên".
          ...(editPolicySelection.assessmentPolicyId
            ? { assessmentPolicyId: editPolicySelection.assessmentPolicyId }
            : {}),
          closeAt: closeAtIso,
          description: editDescription.trim() || null,
          maxAttempt: Number(editMaxAttempt) || 1,
          name: editName.trim(),
          openAt: openAtIso,
          requiresOtp: editRequiresOtp,
          resultDecisionMethod: editResultDecisionMethod,
          ...toUpdateStreamPayload(editStreamSetup),
        },
      })
      await invalidate()
      setShowEditInfo(false)
    } catch (error) {
      setErrorMessage(toApiError(error).message)
    }
  }

  function startEditingSection(sectionIndex: number) {
    const section = paperSections[sectionIndex]
    setEditingSectionIndex(sectionIndex)
    setEditSectionTitle(section?.title ?? '')
    setEditSectionInstruction(section?.instruction ?? '')
    setEditSectionWeight(sectionWeightInputValue(section?.weight))
  }

  async function handleSaveSectionMeta(sectionIndex: number) {
    if (!exam) {
      return
    }
    const nextWeight = parseOptionalSectionWeight(editSectionWeight)
    if (Number.isNaN(nextWeight)) {
      setErrorMessage('Trọng số section phải là số hợp lệ.')
      return
    }
    const next = currentSectionsPayload().map((section, index) =>
      index === sectionIndex
        ? { ...section, instruction: editSectionInstruction.trim() || null, title: editSectionTitle.trim() || section.title, weight: nextWeight }
        : section,
    )
    const sectionWeightError = validateOptionalSectionWeights(next.map((section) => section.weight ?? null))
    if (sectionWeightError) {
      setErrorMessage(sectionWeightError)
      return
    }
    try {
      await updateQuestionsMutation.mutateAsync({
        examId: exam.id,
        payload: { paperId: selectedPaper?.id ?? null, sections: toApiSections(next) },
      })
      await invalidate()
      setEditingSectionIndex(null)
    } catch (error) {
      setErrorMessage(toApiError(error).message)
    }
  }

  function handleOpenAddSection() {
    setPickerMode({ kind: 'new', title: `Part ${paperSections.length + 1}` })
  }

  async function handlePickQuestion(question: QuestionDto) {
    if (!exam || !pickerMode) {
      return
    }
    const candidateDurationSeconds = (selectedPaper?.timeDurationSeconds ?? 0) + getQuestionAttemptSeconds(question)
    const quotaWarning = buildTimeQuotaWarning('Mã đề trên lớp', candidateDurationSeconds, maxTimePerAttemptMin)
    if (quotaWarning) {
      setErrorMessage(`${quotaWarning} Không thể gán thêm câu hỏi này.`)
      return
    }
    const current = currentSectionsPayload()
    const next =
      pickerMode.kind === 'new'
        ? [...current, { instruction: null, questionIds: [question.id], questionWeights: {}, title: pickerMode.title, weight: null }]
        : current.map((section, index) =>
            index === pickerMode.sectionIndex && !section.questionIds.includes(question.id)
              ? { ...section, questionIds: [...section.questionIds, question.id] }
              : section,
          )
    try {
      await updateQuestionsMutation.mutateAsync({
        examId: exam.id,
        payload: { paperId: selectedPaper?.id ?? null, sections: toApiSections(next) },
      })
      await invalidate()
      setPickerMode(null)
      setMessage('Đã cập nhật câu hỏi.')
    } catch (error) {
      setErrorMessage(toApiError(error).message)
    }
  }

  async function handleRemoveQuestion(sectionIndex: number, questionId: string) {
    if (!exam) {
      return
    }
    const current = currentSectionsPayload()
    const next = current.map((section, index) =>
      index === sectionIndex ? { ...section, questionIds: section.questionIds.filter((id) => id !== questionId) } : section,
    )
    try {
      await updateQuestionsMutation.mutateAsync({
        examId: exam.id,
        payload: { paperId: selectedPaper?.id ?? null, sections: toApiSections(next) },
      })
      await invalidate()
    } catch (error) {
      setErrorMessage(toApiError(error).message)
    }
  }

  async function handleRemoveSection(sectionIndex: number) {
    if (!exam) {
      return
    }
    const current = currentSectionsPayload()
    if (current.length <= 1) {
      setErrorMessage('Bài phải có ít nhất 1 phần — không thể xóa phần cuối cùng.')
      return
    }
    if (!(await confirm({ message: 'Xóa phần này? Toàn bộ câu hỏi trong phần cũng sẽ bị xóa.' }))) {
      return
    }
    try {
      await deleteSectionMutation.mutateAsync({ examId: exam.id, sectionId: paperSections[sectionIndex].id })
      await invalidate()
    } catch (error) {
      setErrorMessage(toApiError(error).message)
    }
  }

  /**
   * Tạo thêm một mã đề. `blueprint` chỉ dùng được khi bài đã gắn blueprint dùng chung; `copy` nhân
   * bản một mã đề đã có. Soạn câu hỏi trực tiếp đi qua ClassTestPaperComposer.
   */
  async function handleCreatePaper(source: 'blueprint' | 'copy', fromPaperId: string | null) {
    if (!exam || paperActionLockedRef.current || createPaperMutation.isPending) {
      return
    }
    paperActionLockedRef.current = true
    try {
      const created = await createPaperMutation.mutateAsync({
        examId: exam.id,
        payload: { copyFromPaperId: fromPaperId, source },
      })
      await invalidate()
      setSelectedPaperId(created.id)
      setCopyFromPaperId('')
      setMessage('Đã tạo mã đề mới.')
    } catch (error) {
      setErrorMessage(toApiError(error).message)
    } finally {
      paperActionLockedRef.current = false
    }
  }

  /**
   * Phân đề yêu cầu mọi mã đề đã khoá. Bài trên lớp không có luồng duyệt nên khoá là một bước.
   */
  async function handleUpdatePaperStatus(paperId: string, action: 'LOCK' | 'REOPEN') {
    const confirmMessage =
      action === 'LOCK'
        ? 'Khoá mã đề này? Sau khi khoá bạn mới phân đề được cho học sinh. Vẫn có thể mở lại để sửa.'
        : 'Mở lại mã đề này để sửa? Bạn sẽ phải khoá lại trước khi phân đề.'
    if (!(await confirm({ message: confirmMessage }))) {
      return
    }
    try {
      await updatePaperStatusMutation.mutateAsync({ paperId, payload: { action } })
      await invalidate()
      setMessage(action === 'LOCK' ? 'Đã khoá mã đề.' : 'Đã mở lại mã đề.')
    } catch (error) {
      setErrorMessage(toApiError(error).message)
    }
  }

  async function handleDeletePaper(paperId: string) {
    if (!(await confirm({ message: 'Xoá mã đề này? Toàn bộ phần và câu hỏi trong mã đề cũng bị xoá.' }))) {
      return
    }
    try {
      await deletePaperMutation.mutateAsync(paperId)
      await invalidate()
      setSelectedPaperId(null)
      setMessage('Đã xoá mã đề.')
    } catch (error) {
      setErrorMessage(toApiError(error).message)
    }
  }

  async function handlePrimaryStatusAction(action: 'CANCEL' | 'CLOSE' | 'PUBLISH_RESULTS' | 'SCHEDULE' | 'START') {
    if (!exam) {
      return
    }
    if (
      action === 'START' &&
      !(await confirm({
        message: 'Mở bài ngay sẽ chuyển bài sang trạng thái đang mở, khóa đề và học sinh có thể bắt đầu làm bài. Bạn có chắc muốn tiếp tục?',
      }))
    ) {
      return
    }
    // Điểm đã hiện cho học sinh ngay khi từng kết quả sang RELEASED ở bước "Chốt sổ" bên
    // trang chấm bài — thao tác này KHÔNG trả điểm, mà chốt đậu/rớt và đóng bài vĩnh viễn.
    if (
      action === 'PUBLISH_RESULTS' &&
      !(await confirm({
        message:
          'Chốt kết quả sẽ chốt đậu/rớt cho toàn bộ học sinh và đóng bài vĩnh viễn — sau đó không dỡ cấm, buộc kết thúc hay chấm lại được nữa. Điểm đã được trả cho học sinh từ lúc bấm "Chốt sổ" ở trang chấm bài, thao tác này không đổi điểm. Bạn có chắc muốn tiếp tục?',
        title: 'Xác nhận chốt kết quả',
      }))
    ) {
      return
    }
    try {
      await updateStatusMutation.mutateAsync({ examId: exam.id, payload: { action } })
      await invalidate()
      setMessage(
        {
          CANCEL: 'Đã hủy bài kiểm tra.',
          CLOSE: 'Đã đóng bài kiểm tra.',
          PUBLISH_RESULTS: 'Đã chốt kết quả bài trên lớp.',
          SCHEDULE: 'Đã lên lịch bài kiểm tra. Bài sẽ tự mở khi tới giờ bắt đầu.',
          START: 'Đã mở bài kiểm tra.',
        }[action],
      )
    } catch (error) {
      setErrorMessage(toApiError(error).message)
    }
  }

  if (examQuery.isLoading) {
    return <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Đang tải…</section>
  }

  if (!exam) {
    return <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">Không tìm thấy bài trên lớp.</section>
  }

  const statusDisplay = getClassTestStatusDisplay(exam.status)
  const schedules = schedulesQuery.data ?? []
  const candidates = candidatesQuery.data ?? []
  const { completedCount, steps } = getClassTestWorkflowSteps(exam, schedules, candidates)
  const scheduleReadiness = getClassTestScheduleReadiness(schedules, candidates)
  // Tab Xếp lịch phải mở ngay khi đề đã có câu hỏi — đó chính là nơi giáo viên chọn phòng và xếp
  // học sinh, nên không thể chờ bước đó hoàn tất mới cho vào.
  const unlockedSchedule = completedCount >= 1
  const roleBasePath = canManage ? '/teacher' : '/school-admin'
  // Khớp rule backend: nội dung/ngày giờ chỉ khóa khi bài đã bắt đầu.
  const canEditContent = canManage && (exam.status === 'DRAFT' || exam.status === 'SCHEDULED')
  // Chỉ soạn câu hỏi trực tiếp được khi KHÔNG có blueprint dùng chung nào đang gắn (dùng "Đổi blueprint khác" nếu có).
  const canEditFreeQuestions = canEditContent && !exam.blueprintId
  const canManualStart = canManage && canStartClassTestManually(exam, nowMs)
  const primaryStatusAction =
    exam.status === 'DRAFT' && scheduleReadiness.ready
      ? { action: 'SCHEDULE' as const, icon: <Calendar aria-hidden="true" className="size-4.5" />, label: 'Lên lịch bài kiểm tra' }
      : canManualStart
        ? { action: 'START' as const, icon: <PlayCircle aria-hidden="true" className="size-4.5" />, label: 'Mở bài ngay' }
      : exam.status === 'IN_PROGRESS'
          ? { action: 'CLOSE' as const, icon: <Lock aria-hidden="true" className="size-4.5" />, label: 'Đóng bài kiểm tra' }
          : exam.status === 'CLOSED'
            ? { action: 'PUBLISH_RESULTS' as const, icon: <Megaphone aria-hidden="true" className="size-4.5" />, label: 'Chốt kết quả' }
            : null

  const nextAction =
    completedCount === 0
      ? {
          ctaLabel: 'Soạn đề bài',
          description: 'Bấm "Thêm câu hỏi" ở tab Đề bài để soạn trực tiếp, hoặc gắn blueprint (không bắt buộc) ở tab Blueprint.',
          onClick: () => setTab('papers'),
          title: 'Chưa soạn đề bài',
        }
      : !scheduleReadiness.ready
        ? {
            ctaLabel: 'Mở tab Xếp lịch',
            description: `${scheduleReadiness.blockingReason} Vào tab Xếp lịch để chọn phòng, phân giám khảo và xếp học sinh vào ca.`,
            onClick: () => setTab('schedule'),
            title: 'Chuẩn bị phòng thi và xếp học sinh',
          }
        : exam.status === 'DRAFT'
          ? {
              ctaLabel: 'Lên lịch',
              description: 'Phòng thi, giám khảo và danh sách học sinh đã đủ — bấm lên lịch để chốt ca thi.',
              onClick: () => void handlePrimaryStatusAction('SCHEDULE'),
              title: 'Sẵn sàng lên lịch',
            }
          : null

  return (
    <section className="mx-auto max-w-260">
      <button
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600"
        onClick={() => navigate(-1)}
        type="button"
      >
        ← Bài trên lớp
      </button>

      <FeedbackToast message={message} onClose={() => setMessage(null)} tone="success" />
      <FeedbackToast message={errorMessage} onClose={() => setErrorMessage(null)} tone="error" />
      {dialog}

      <DetailHeaderCard
        actions={
          <>
            <button
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-slate-200 px-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              onClick={() => navigate(`${roleBasePath}/class-tests/${exam.id}/results`)}
              type="button"
            >
              <ClipboardList aria-hidden="true" className="size-4" />
              Xem kết quả
            </button>
            {/* Trước khi mở cho học sinh làm thì chưa có bài nộp nào để chấm. Dùng
                `roleBasePath` chứ không hardcode `/teacher`: route theo dõi của nhà
                trường đã đăng ký nhưng trước đây không có lối vào nào. */}
            {GRADABLE_STATUSES.includes(exam.status) ? (
              <button
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-slate-200 px-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                onClick={() => navigate(`${roleBasePath}/class-tests/${exam.id}/grading`)}
                type="button"
              >
                <FilePenLine aria-hidden="true" className="size-4" />
                {canManage ? 'Chấm bài' : 'Theo dõi chấm bài'}
              </button>
            ) : null}
            {/* Phúc khảo là việc của chính giáo viên tạo bài — nhà trường không xử lý
                đơn của bài trên lớp. */}
            {canManage && GRADABLE_STATUSES.includes(exam.status) ? (
              <button
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-slate-200 px-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                onClick={() => navigate(`/teacher/class-tests/${exam.id}/reevaluation`)}
                type="button"
              >
                <ScrollText aria-hidden="true" className="size-4" />
                Phúc khảo
              </button>
            ) : null}
            {canManage ? (
              <>
              <button
                aria-label="Làm mới"
                className="inline-flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                onClick={() => void examQuery.refetch()}
                title="Làm mới"
                type="button"
              >
                <RefreshCw aria-hidden="true" className="size-4.5" />
              </button>
              <button
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-transparent px-3.5 text-sm font-bold text-red-600 transition hover:bg-red-50"
                onClick={() => {
                  void (async () => {
                    if (!(await confirm({ message: 'Bạn có chắc muốn xóa bài trên lớp này không?' }))) {
                      return
                    }
                    await deleteMutation.mutateAsync(exam.id)
                    await invalidate()
                    navigate('/teacher/class-tests')
                  })()
                }}
                type="button"
              >
                <Trash2 aria-hidden="true" className="size-4" />
                Xóa
              </button>
              {primaryStatusAction ? (
                <button
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-linear-to-r from-indigo-600 to-cyan-500 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:opacity-90"
                  onClick={() => void handlePrimaryStatusAction(primaryStatusAction.action)}
                  type="button"
                >
                  {primaryStatusAction.icon}
                  {primaryStatusAction.label}
                </button>
              ) : null}
              </>
            ) : null}
          </>
        }
        metaItems={[
          { icon: <Hash aria-hidden="true" className="size-3.5" />, label: exam.code },
          { icon: <NotebookPen aria-hidden="true" className="size-3.5" />, label: 'Bài trên lớp' },
          { icon: <Languages aria-hidden="true" className="size-3.5" />, label: 'Tiếng Anh' },
          { icon: <Calendar aria-hidden="true" className="size-3.5" />, label: `${formatDateTime(exam.openAt)} – ${formatDateTime(exam.closeAt)}` },
          { icon: <Users aria-hidden="true" className="size-3.5" />, label: `GV: ${getExamChairName(exam.members)}` },
          { icon: <Clock aria-hidden="true" className="size-3.5" />, label: `Số lượt thi tối đa: ${exam.maxAttempt ?? 1}` },
          // Hệ thống tự tính từ đề bài. Khung mở/đóng của bài trên lớp phải đủ dài cho con số này.
          { icon: <Timer aria-hidden="true" className="size-3.5" />, label: `Thời gian làm bài: ${formatDurationSeconds(exam.examTimeDurationSecond)}` },
          { icon: <CheckCircle2 aria-hidden="true" className="size-3.5" />, label: `Cách chốt điểm: ${getResultDecisionMethodDisplay(exam.resultDecisionMethod)}` },
        ]}
        onEdit={canEditContent ? openEditInfo : undefined}
        statusLabel={statusDisplay.label}
        statusTone={statusDisplay.tone}
        title={exam.name}
      />

      {showEditInfo ? (
        <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-5.5">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-extrabold text-slate-900">Sửa thông tin bài trên lớp</h3>
            <button
              className="text-xs font-bold text-slate-400 hover:text-slate-600"
              onClick={() => setShowEditInfo(false)}
              type="button"
            >
              Hủy
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-bold text-slate-700">
              Tên bài
              <input
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-900"
                onChange={(event) => setEditName(event.target.value)}
                value={editName}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-bold text-slate-700">
              Mô tả
              <input
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-900"
                onChange={(event) => setEditDescription(event.target.value)}
                value={editDescription}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-bold text-slate-700">
              Mở lúc
              <input
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-900"
                onChange={(event) => setEditOpenAt(event.target.value)}
                required
                type="datetime-local"
                value={editOpenAt}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-bold text-slate-700">
              Đóng lúc
              <input
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-900"
                onChange={(event) => setEditCloseAt(event.target.value)}
                required
                type="datetime-local"
                value={editCloseAt}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-bold text-slate-700">
              Số lượt thi tối đa
              <input
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-900"
                min={1}
                onChange={(event) => setEditMaxAttempt(event.target.value)}
                type="number"
                value={editMaxAttempt}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-bold text-slate-700">
              Cách chốt điểm
              <select
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-900"
                onChange={(event) => setEditResultDecisionMethod(event.target.value as ResultDecisionMethod)}
                value={editResultDecisionMethod}
              >
                {RESULT_DECISION_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {getResultDecisionMethodDisplay(method)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="inline-flex w-fit items-center gap-2 text-[13px] font-medium text-slate-700">
            <input
              checked={editRequiresOtp}
              onChange={(event) => setEditRequiresOtp(event.target.checked)}
              type="checkbox"
            />
            Bắt học sinh nhập mã OTP của ca thi khi vào bài
          </label>

          <ExamStreamSetupField
            description="Quyết định học sinh phải chia sẻ những gì trong lúc làm bài."
            name="editStreamSetup"
            onChange={setEditStreamSetup}
            value={editStreamSetup}
          />

          <RubricPolicyPicker languageId={exam.languageId} onChange={setEditPolicySelection} scope="teacher" />

          <div className="flex justify-end">
            <button
              className="inline-flex h-9.5 items-center justify-center rounded-full bg-indigo-600 px-4 text-xs font-bold text-white disabled:opacity-60"
              disabled={updateExamMutation.isPending || editPolicySelection.isBlocked}
              onClick={() => void handleSaveInfo()}
              title={editPolicySelection.isBlocked ? 'Chọn một chính sách đánh giá phù hợp trước khi lưu' : undefined}
              type="button"
            >
              Lưu
            </button>
          </div>
        </div>
      ) : null}

      <WorkflowTrackerCard
        completedCount={completedCount}
        heading="Quy trình bài trên lớp"
        nextAction={nextAction}
        steps={steps}
        totalCount={3}
      />

      <div className="mt-5.5">
        <TabPillGroup
          items={[
            { label: 'Blueprint (tuỳ chọn)', value: 'blueprint' },
            { label: 'Đề bài', value: 'papers' },
            { label: 'Học sinh', value: 'students' },
            { icon: <Calendar aria-hidden="true" className="size-4" />, label: 'Xếp lịch', value: 'schedule' },
          ]}
          onChange={setTab}
          value={tab}
        />
      </div>

      {tab === 'papers' ? (
        <div className="mt-4 grid gap-3.5">
          {canManage ? (
            <div
              className={[
                'rounded-xl border px-4 py-3',
                papers.length > 1 && unlockedPaperCount === 0
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-indigo-200 bg-indigo-50',
              ].join(' ')}
            >
              <p
                className={`text-[13px] font-bold ${
                  papers.length > 1 && unlockedPaperCount === 0 ? 'text-emerald-800' : 'text-indigo-800'
                }`}
              >
                {papers.length === 0
                  ? 'Bước 1 — Tạo mã đề đầu tiên'
                  : papers.length === 1
                    ? 'Bước 2 — Soạn nội dung mã đề'
                    : unlockedPaperCount > 0
                      ? `Bước 3 — Khoá mã đề để phân đề (còn ${unlockedPaperCount}/${papers.length} chưa khoá)`
                      : 'Xong bước đề bài — sang Xếp lịch để phân đề'}
              </p>
              <p
                className={`mt-0.5 text-xs leading-5 ${
                  papers.length > 1 && unlockedPaperCount === 0 ? 'text-emerald-700' : 'text-indigo-700'
                }`}
              >
                {papers.length === 0
                  ? 'Bài chưa có mã đề nào. Soạn câu hỏi trực tiếp, hoặc sinh mã đề từ blueprint nếu bài đã gắn blueprint.'
                  : papers.length === 1
                    ? 'Một mã đề là đủ để mở bài — hệ thống tự gán cho cả lớp, không cần phân đề. Muốn mỗi em một đề khác nhau thì tạo thêm mã đề.'
                    : unlockedPaperCount > 0
                      ? 'Phân đề chỉ mở khi mọi mã đề đã khoá. Khoá xong vẫn mở lại sửa được bất cứ lúc nào.'
                      : 'Tất cả mã đề đã khoá. Sang tab Xếp lịch, mục "3 · Phân đề" để chia mã đề cho từng học sinh.'}
              </p>
              {papers.length > 1 && unlockedPaperCount === 0 ? (
                <button
                  className="mt-2 inline-flex h-8.5 items-center justify-center gap-1.5 rounded-full border border-emerald-300 bg-white px-3.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                  onClick={() => setTab('schedule')}
                  type="button"
                >
                  <Calendar aria-hidden="true" className="size-3.5" />
                  Sang tab Xếp lịch
                </button>
              ) : null}
            </div>
          ) : null}

          {canManage && canEditContent ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-4">
              <span className="mr-1 text-[13px] font-bold text-slate-700">Tạo mã đề:</span>
              {exam.blueprintId ? (
                <button
                  className="inline-flex h-9.5 items-center justify-center gap-1.5 rounded-full border border-indigo-200 bg-white px-4 text-[13px] font-bold text-indigo-600 hover:bg-indigo-50 disabled:opacity-60"
                  disabled={createPaperMutation.isPending}
                  onClick={() => void handleCreatePaper('blueprint', null)}
                  type="button"
                >
                  <Plus aria-hidden="true" className="size-4" />
                  Từ blueprint
                </button>
              ) : (
                <button
                  className="inline-flex h-9.5 items-center justify-center gap-1.5 rounded-full border border-indigo-200 bg-white px-4 text-[13px] font-bold text-indigo-600 hover:bg-indigo-50"
                  onClick={() => setShowPaperComposer(true)}
                  type="button"
                >
                  <Plus aria-hidden="true" className="size-4" />
                  Soạn câu hỏi trực tiếp
                </button>
              )}
              {papers.length > 0 ? (
                <>
                  <select
                    aria-label="Sao chép từ mã đề"
                    className="h-9.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-900"
                    onChange={(event) => setCopyFromPaperId(event.target.value)}
                    value={copyFromPaperId}
                  >
                    <option value="">Sao chép từ…</option>
                    {papers.map((paper) => (
                      <option key={paper.id} value={paper.id}>
                        Mã đề {paper.variant}
                      </option>
                    ))}
                  </select>
                  <button
                    className="inline-flex h-9.5 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-[13px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                    disabled={!copyFromPaperId || createPaperMutation.isPending}
                    onClick={() => void handleCreatePaper('copy', copyFromPaperId)}
                    type="button"
                  >
                    Sao chép
                  </button>
                </>
              ) : null}
            </div>
          ) : null}

          {papers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
              Chưa có mã đề nào.
            </div>
          ) : null}

          {papers.map((paper) => {
            const isOpen = paper.id === selectedPaper?.id
            // Khoá mã đề là để chốt nội dung trước khi phân cho học sinh — nên khoá rồi thì không
            // sửa tiếp ngay trong thẻ, phải bấm "Mở lại để sửa" cho thành ý định rõ ràng.
            const canEditThisPaper = canEditFreeQuestions && paper.status !== 'LOCKED'
            return (
              <ClassTestPaperAccordionItem
                actions={
                  <>
                    <button
                      aria-label={`Xem toàn trang mã đề ${paper.variant}`}
                      className="inline-flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      onClick={() =>
                        navigate(`${roleBasePath}/class-tests/${exam.id}/papers/${paper.id}`, {
                          state: { examId: exam.id, paperId: paper.id },
                        })
                      }
                      title="Xem toàn trang"
                      type="button"
                    >
                      <ScrollText aria-hidden="true" className="size-4" />
                    </button>
                    {canManage && canEditContent ? (
                      <>
                        {paper.status === 'LOCKED' ? (
                          <button
                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                            onClick={() => void handleUpdatePaperStatus(paper.id, 'REOPEN')}
                            type="button"
                          >
                            <RefreshCw aria-hidden="true" className="size-3.5" />
                            Mở lại để sửa
                          </button>
                        ) : (
                          <button
                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                            onClick={() => void handleUpdatePaperStatus(paper.id, 'LOCK')}
                            type="button"
                          >
                            <Lock aria-hidden="true" className="size-3.5" />
                            Khoá để phân đề
                          </button>
                        )}
                        {paper.status !== 'LOCKED' && papers.length > 1 ? (
                          <button
                            aria-label={`Xoá mã đề ${paper.variant}`}
                            className="inline-flex size-9 items-center justify-center rounded-full border border-red-200 bg-white text-red-600 hover:bg-red-50"
                            onClick={() => void handleDeletePaper(paper.id)}
                            title="Xoá mã đề"
                            type="button"
                          >
                            <Trash2 aria-hidden="true" className="size-4" />
                          </button>
                        ) : null}
                      </>
                    ) : null}
                  </>
                }
                isOpen={isOpen}
                key={paper.id}
                maxTimePerAttemptMin={maxTimePerAttemptMin}
                onOpen={() => setSelectedPaperId(paper.id)}
                paper={paper}
              >
                <div className="grid gap-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-extrabold text-slate-900">Các phần và câu hỏi</h3>
                    {canEditThisPaper ? (
                      <button
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-indigo-600 hover:bg-slate-50"
                        onClick={handleOpenAddSection}
                        type="button"
                      >
                        <Plus aria-hidden="true" className="size-4" />
                        Thêm phần
                      </button>
                    ) : null}
                  </div>

                  {!canEditContent ? (
                    <p className="text-xs font-semibold text-amber-700">
                      Bài đã mở cho học sinh làm bài — không thể sửa câu hỏi/phần nữa.
                    </p>
                  ) : exam.blueprintId ? (
                    <p className="text-xs font-semibold text-amber-700">
                      Bài đang dùng blueprint dùng chung — vào tab Blueprint để đổi/gỡ blueprint thay vì sửa trực tiếp ở đây.
                    </p>
                  ) : paper.status === 'LOCKED' ? (
                    <p className="text-xs font-semibold text-slate-500">
                      Mã đề đã khoá và sẵn sàng phân cho học sinh. Bấm "Mở lại để sửa" nếu cần đổi nội dung.
                    </p>
                  ) : null}

                  {paperSections.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
                      Chưa có phần nào — bấm "Thêm phần" để bắt đầu soạn đề.
                    </div>
                  ) : (
                    paperSections.map((section, sectionIndex) => (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5" key={section.id}>
                        {editingSectionIndex === sectionIndex ? (
                          <div className="grid gap-2">
                            <input
                              aria-label="Tên phần"
                              className="h-9.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900"
                              onChange={(event) => setEditSectionTitle(event.target.value)}
                              value={editSectionTitle}
                            />
                            <textarea
                              className="min-h-14 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                              onChange={(event) => setEditSectionInstruction(event.target.value)}
                              placeholder="Hướng dẫn phần (không bắt buộc)"
                              value={editSectionInstruction}
                            />
                            <input
                              aria-label="Trọng số phần"
                              className="h-9.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900"
                              max="1"
                              min="0"
                              onChange={(event) => setEditSectionWeight(event.target.value)}
                              placeholder="Trọng số (bỏ trống để chia đều)"
                              step="0.01"
                              type="number"
                              value={editSectionWeight}
                            />
                            <div className="flex gap-2">
                              <button
                                className="inline-flex h-8 items-center justify-center rounded-full bg-indigo-600 px-3.5 text-xs font-bold text-white"
                                onClick={() => void handleSaveSectionMeta(sectionIndex)}
                                type="button"
                              >
                                Lưu
                              </button>
                              <button
                                className="inline-flex h-8 items-center justify-center rounded-full border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                                onClick={() => setEditingSectionIndex(null)}
                                type="button"
                              >
                                Hủy
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2.5">
                            <div>
                              <span className="text-sm font-bold text-slate-900">{section.title || `Part ${sectionIndex + 1}`}</span>
                              {section.weight != null ? (
                                <p className="mt-0.5 text-xs font-semibold text-slate-500">Trọng số: {section.weight.toFixed(2)}</p>
                              ) : null}
                              {section.instruction ? <p className="mt-0.5 text-xs text-slate-500">{section.instruction}</p> : null}
                            </div>
                            {canEditThisPaper ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  aria-label={`Sửa ${section.title ?? `phần ${sectionIndex + 1}`}`}
                                  className="inline-flex size-8.5 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                  onClick={() => startEditingSection(sectionIndex)}
                                  title="Sửa tên/hướng dẫn phần"
                                  type="button"
                                >
                                  <Pencil aria-hidden="true" className="size-3.5" />
                                </button>
                                <button
                                  className="inline-flex h-8.5 items-center justify-center rounded-full border border-slate-200 bg-white px-3.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50"
                                  onClick={() => setPickerMode({ kind: 'existing', sectionIndex })}
                                  type="button"
                                >
                                  + Câu hỏi
                                </button>
                                {paperSections.length > 1 ? (
                                  <button
                                    aria-label={`Xóa ${section.title ?? `phần ${sectionIndex + 1}`}`}
                                    className="inline-flex size-8.5 items-center justify-center rounded-full border border-red-200 text-red-600 hover:bg-red-50"
                                    onClick={() => void handleRemoveSection(sectionIndex)}
                                    type="button"
                                  >
                                    <Trash2 aria-hidden="true" className="size-3.5" />
                                  </button>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        )}
                        {section.items.length === 0 ? (
                          <div className="mt-2.5 rounded-lg border border-dashed border-slate-300 px-4 py-4 text-center text-xs text-slate-400">
                            Chưa có câu hỏi nào trong phần này.
                          </div>
                        ) : (
                          <div className="mt-2.5 grid gap-1.5">
                            {section.items.map((item, index) => (
                              <div
                                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm"
                                key={item.id}
                              >
                                <div className="min-w-0">
                                  <div className="truncate font-semibold text-slate-800">
                                    {index + 1}. {item.question?.code} — {formatNullableText(item.question?.questionText)}
                                  </div>
                                  {item.question ? (
                                    <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] font-semibold text-slate-500">
                                      <span className="rounded-full bg-slate-50 px-2 py-0.5 ring-1 ring-slate-200">
                                        Chuẩn bị: {formatDurationSeconds(item.question.preparationTimeSeconds)}
                                      </span>
                                      <span className="rounded-full bg-slate-50 px-2 py-0.5 ring-1 ring-slate-200">
                                        Tối thiểu: {formatDurationSeconds(item.question.minResponseSeconds)}
                                      </span>
                                      <span className="rounded-full bg-slate-50 px-2 py-0.5 ring-1 ring-slate-200">
                                        Tối đa: {formatDurationSeconds(item.question.maxResponseSeconds)}
                                      </span>
                                    </div>
                                  ) : null}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {item.question ? (
                                    <a
                                      aria-label={`Xem chi tiết ${item.question.code}`}
                                      className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
                                      href={`${roleBasePath}/questions/${item.question.id}`}
                                      rel="noopener noreferrer"
                                      target="_blank"
                                      title="Xem chi tiết câu hỏi"
                                    >
                                      <Eye aria-hidden="true" className="size-3.5" />
                                    </a>
                                  ) : null}
                                  {canEditThisPaper && section.items.length > 1 && item.questionId ? (
                                    <button
                                      className="inline-flex h-7 items-center justify-center rounded-full border border-red-200 px-2.5 text-xs font-bold text-red-600 hover:bg-red-50"
                                      onClick={() => void handleRemoveQuestion(sectionIndex, item.questionId as string)}
                                      type="button"
                                    >
                                      Bỏ
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ClassTestPaperAccordionItem>
            )
          })}
        </div>
      ) : null}

      {showPaperComposer && exam ? (
        <ClassTestPaperComposer
          examId={exam.id}
          onClose={() => setShowPaperComposer(false)}
          onCreated={async () => {
            await invalidate()
            setMessage('Đã tạo mã đề mới.')
          }}
        />
      ) : null}

      {pickerMode ? (
        <QuestionPicker
          excludeQuestionIds={
            paperSections
              .filter((_, index) => !(pickerMode.kind === 'existing' && index === pickerMode.sectionIndex))
              .flatMap((section) => section.items.map((item) => item.questionId))
              .filter(Boolean) as string[]
          }
          onClose={() => setPickerMode(null)}
          onSelect={(question) => void handlePickQuestion(question)}
          questionDetailBasePath={roleBasePath}
          scope="teacher"
          selectedQuestionIds={
            pickerMode.kind === 'existing'
              ? ((paperSections[pickerMode.sectionIndex]?.items.map((item) => item.questionId).filter(Boolean) as string[]) ?? [])
              : []
          }
        />
      ) : null}

      {tab === 'students' ? (
        <CandidatesTab
          canManage={canManage}
          examId={exam.id}
          examKind={exam.kind}
          locked={isExamLockedForEditing(exam.status)}
          papers={exam.papers}
        />
      ) : null}

      {tab === 'blueprint' ? (
        <ClassTestBlueprintTab
          blueprintId={exam.blueprintId}
          blueprintVersionId={exam.blueprintVersionId}
          canEdit={canEditContent}
          canManage={canManage}
          examId={exam.id}
          onChanged={() => void invalidate()}
        />
      ) : null}

      {tab === 'schedule' ? (
        <ScheduleTab
          canManage={canEditContent}
          deliveryMode={exam.deliveryMode}
          examCloseAt={exam.closeAt}
          examId={exam.id}
          examOpenAt={exam.openAt}
          examTimeDurationSecond={exam.examTimeDurationSecond}
          isClassTest
          onGoToPapers={() => setTab('papers')}
          onSetDeliveryMode={
            canEditContent
              ? (mode: ExamDeliveryMode) =>
                  void setDeliveryModeMutation.mutateAsync({ deliveryMode: mode, examId: exam.id }).then(invalidate)
              : undefined
          }
          papers={exam.papers}
          unlocked={unlockedSchedule}
        />
      ) : null}

    </section>
  )
}

export function TeacherClassTestDetailPage() {
  return <ClassTestDetailPage canManage />
}

export function SchoolAdminClassTestDetailPage() {
  return <ClassTestDetailPage canManage={false} />
}
