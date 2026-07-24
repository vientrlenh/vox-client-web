import { useEffect, useState } from 'react'
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
  Trash2,
  Users,
  NotebookPen,
} from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { useAppSelector } from '@/app/store/hooks'
import { useMySchoolClassesQuery } from '@/features/classes/api/useMySchoolClassesQuery'
import { useSchoolClassesQuery } from '@/features/classes/api/useSchoolClassesQuery'
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
import { AssessmentMethodTab } from '@/features/examCore/components/AssessmentMethodTab'
import { CandidatesTab } from '@/features/examCore/components/CandidatesTab'
import { ExamListRow } from '@/features/examCore/components/ExamListRow'
import { PaperCard } from '@/features/examCore/components/PaperCard'
import { QuestionPicker } from '@/features/examCore/components/QuestionPicker'
import { ScheduleTab } from '@/features/examCore/components/schedule/ScheduleTab'
import { WorkflowTrackerCard } from '@/features/examCore/components/WorkflowTrackerCard'
import { examQueryKeys, fetchExamPaper, useExamBlueprintQuery, useExamBlueprintsQuery, useExamQuery } from '@/features/examCore/api/queries'
import { useSetExamDeliveryModeMutation, useUpdateExamPaperItemMutation } from '@/features/examCore/api/mutations'
import { useMatchingTeacherAssessmentPoliciesQuery } from '@/features/examCore/api/assessmentPolicyQueries'
import {
  formatDate,
  formatDateTime,
  formatDurationSeconds,
  formatNullableText,
  getAssessmentPolicyStrictnessLabel,
  getExamChairName,
  getResultDecisionMethodDisplay,
  RESULT_DECISION_METHODS,
  toDateTimeLocalValue,
  toIsoDateTime,
  type ExamBlueprintDto,
  type ExamBlueprintVersionDto,
  type ExamDeliveryMode,
  type ExamDto,
  type ExamStatus,
  type ResultDecisionMethod,
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
import { getClassTestStatusDisplay } from '../types'

const STATUS_FILTERS: Array<{ label: string; value: '' | ExamStatus }> = [
  { label: 'Tất cả', value: '' },
  { label: 'Bản nháp', value: 'DRAFT' },
  { label: 'Đã lên lịch', value: 'SCHEDULED' },
  { label: 'Đang mở', value: 'IN_PROGRESS' },
  { label: 'Đã đóng', value: 'CLOSED' },
  { label: 'Đã trả điểm', value: 'RESULTS_PUBLISHED' },
]

function canStartClassTestManually(exam: ExamDto, nowMs: number) {
  if (exam.status !== 'SCHEDULED') {
    return false
  }
  const closeAtMs = exam.closeAt ? new Date(exam.closeAt).getTime() : Number.POSITIVE_INFINITY
  return nowMs < closeAtMs
}

function getClassTestWorkflowSteps(exam: ExamDto): { completedCount: number; steps: WorkflowStep[] } {
  // exam.blueprintId/blueprintVersionId luôn có giá trị cho bài trên lớp (kể cả khi soạn câu hỏi trực tiếp,
  // hệ thống tự sinh 1 blueprint riêng ẩn) — nên không dùng được để biết đề đã có nội dung thật hay chưa.
  const hasQuestions = exam.papers.some((paper) => paper.sections.some((section) => section.items.length > 0))
  const totalPapers = exam.papers.length
  // Class test không có luồng duyệt paper riêng như CENTRALIZED (paper chỉ LOCKED khi exam chuyển IN_PROGRESS) —
  // dùng lại tiêu chí "đã có câu hỏi" thay vì dựa vào paper.status.
  const readyPapers = exam.papers.filter((paper) => paper.sections.some((section) => section.items.length > 0)).length
  const papersReady = totalPapers > 0 && readyPapers === totalPapers
  const isPublished = exam.status === 'RESULTS_PUBLISHED' || exam.status === 'CLOSED'

  const step1Done = hasQuestions
  const step2Done = papersReady
  const step3Done = isPublished

  const steps: WorkflowStep[] = [
    {
      icon: step1Done ? <Check size={26} /> : <LayoutList size={24} />,
      label: 'Đề bài',
      state: step1Done ? 'done' : 'current',
      sublabel: step1Done ? 'Đã có câu hỏi trong đề' : 'Chưa gắn blueprint hoặc thêm câu hỏi',
    },
    {
      icon: step2Done ? <Check size={26} /> : <FilePenLine size={24} />,
      label: 'Soạn & giao đề',
      state: !step1Done ? 'upcoming' : step2Done ? 'done' : 'current',
      sublabel: totalPapers ? `${readyPapers} / ${totalPapers} mã đề đã có câu hỏi` : undefined,
    },
    {
      icon: step3Done ? <Check size={26} /> : <PlayCircle size={24} />,
      label: 'Xếp lịch & chấm',
      state: !step2Done ? 'upcoming' : step3Done ? 'done' : 'current',
      sublabel: step3Done ? 'Đã trả điểm' : 'Chọn thời gian làm bài',
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
        <StatCard icon={<CheckCircle2 size={19} />} iconTone="emerald" label="Đã trả điểm" value={statsQuery.data?.graded ?? '-'} />
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
  classesQuery,
  onChange,
  search,
  setPage,
  setSearch,
  value,
}: {
  classesQuery: ReturnType<typeof useSchoolClassesQuery>
  onChange: (schoolClassId: string, schoolClassName: string) => void
  search: string
  setPage: (fn: (p: number) => number) => void
  setSearch: (s: string) => void
  value: string
}) {
  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <input
        className="h-10 rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-indigo-400"
        onChange={(event) => {
          setSearch(event.target.value)
          setPage(() => 1)
        }}
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
            {classesQuery.data?.content.map((schoolClass) => (
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

function ClassPicker({ onChange, value }: { onChange: (id: string, name: string) => void; value: string }) {
  const user = useAppSelector((state) => state.auth.user)
  const isTeacher = user?.roles.includes('TEACHER') ?? false
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const teacherClassesQuery = useMySchoolClassesQuery(page, 10, isTeacher ? user?.schoolId ?? '' : '', 'ACTIVE')
  const adminClassesQuery = useSchoolClassesQuery(
    page,
    10,
    { languageId: '', schoolGradeId: '', search, status: 'ACTIVE' },
    { enabled: !isTeacher },
  )

  return (
    <ClassPickerTable
      classesQuery={isTeacher ? teacherClassesQuery : adminClassesQuery}
      onChange={onChange}
      search={search}
      setPage={setPage}
      setSearch={setSearch}
      value={value}
    />
  )
}

let classTestKeySeed = 0
function nextClassTestKey(prefix: string) {
  classTestKeySeed += 1
  return `${prefix}-${classTestKeySeed}`
}

type ClassTestSectionDraft = {
  instruction: string
  key: string
  questions: QuestionDto[]
  questionWeights: Record<string, string>
  title: string
  weight: string
}

function newClassTestSection(order: number): ClassTestSectionDraft {
  return { instruction: '', key: nextClassTestKey('cts'), questions: [], questionWeights: {}, title: `Part ${order}`, weight: '' }
}

const SECTION_WEIGHT_TOLERANCE = 0.01

function parseOptionalSectionWeight(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

function validateOptionalSectionWeights(weights: Array<number | null>) {
  const numericWeights = weights.filter((weight): weight is number => weight !== null)
  if (numericWeights.some(Number.isNaN)) {
    return 'Trọng số section phải là số hợp lệ.'
  }
  if (numericWeights.length === weights.length) {
    const sum = numericWeights.reduce((total, weight) => total + weight, 0)
    if (Math.abs(sum - 1) >= SECTION_WEIGHT_TOLERANCE) {
      return `Tổng trọng số section phải bằng 1.00 (hiện tại ${sum.toFixed(2)}).`
    }
  }
  return null
}

function sectionWeightInputValue(weight?: number | null) {
  return weight == null ? '' : String(weight)
}

type SelectedRubricVersion = { code: string; id: string; languageId: string; name: string; version: number }

type ClassTestCreateDraft = {
  closeAt: string
  creationMode: 'questions' | 'blueprint'
  description: string
  maxAttempt: string
  name: string
  openAt: string
  resultDecisionMethod: ResultDecisionMethod
  schoolClassId: string
  schoolClassName: string
  sections: ClassTestSectionDraft[]
  selectedBlueprint: ExamBlueprintDto | null
  selectedVersion: ExamBlueprintVersionDto | null
  selectionAssignments: Record<string, QuestionDto>
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
  const draft = locationState?.draft
  const [name, setName] = useState(draft?.name ?? '')
  const [description, setDescription] = useState(draft?.description ?? '')
  const [schoolClassId, setSchoolClassId] = useState(draft?.schoolClassId ?? '')
  const [schoolClassName, setSchoolClassName] = useState(draft?.schoolClassName ?? '')
  const [openAt, setOpenAt] = useState(draft?.openAt ?? '')
  const [closeAt, setCloseAt] = useState(draft?.closeAt ?? '')
  const [maxAttempt, setMaxAttempt] = useState(draft?.maxAttempt ?? '1')
  const [resultDecisionMethod, setResultDecisionMethod] = useState<ResultDecisionMethod>(draft?.resultDecisionMethod ?? 'HIGHEST')
  const [sections, setSections] = useState<ClassTestSectionDraft[]>(draft?.sections ?? [newClassTestSection(1)])
  const [pickerForSectionKey, setPickerForSectionKey] = useState<string | null>(null)
  const [creationMode, setCreationMode] = useState<'questions' | 'blueprint'>(draft?.creationMode ?? 'questions')
  const [blueprintKeyword, setBlueprintKeyword] = useState('')
  const [blueprintPage, setBlueprintPage] = useState(1)
  const [browsingBlueprint, setBrowsingBlueprint] = useState<ExamBlueprintDto | null>(null)
  const [selectedBlueprint, setSelectedBlueprint] = useState<ExamBlueprintDto | null>(draft?.selectedBlueprint ?? null)
  const [selectedVersion, setSelectedVersion] = useState<ExamBlueprintVersionDto | null>(draft?.selectedVersion ?? null)
  const blueprintsQuery = useExamBlueprintsQuery({ isActive: true, keyword: blueprintKeyword, page: blueprintPage, size: 8 })
  const { confirm, dialog } = useConfirmationDialog()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectionAssignments, setSelectionAssignments] = useState<Record<string, QuestionDto>>(
    draft?.selectionAssignments ?? {},
  )
  const [selectionPickerSlotId, setSelectionPickerSlotId] = useState<string | null>(null)
  const updateItemMutation = useUpdateExamPaperItemMutation()
  const hasSelectionSlot = selectedVersion?.sections.some((section) =>
    section.slots.some((slot) => slot.slotType === 'SELECTION'),
  )

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
  const canSubmitPolicy = !isResolvingPolicy && !hasAmbiguousPolicy

  function goToSelectRubricVersion() {
    navigate('/teacher/rubric-versions/select', {
      state: {
        draft: {
          closeAt,
          creationMode,
          description,
          maxAttempt,
          name,
          openAt,
          resultDecisionMethod,
          schoolClassId,
          schoolClassName,
          sections,
          selectedBlueprint,
          selectedVersion,
          selectionAssignments,
        } satisfies ClassTestCreateDraft,
        returnTo: '/teacher/class-tests/create',
      },
    })
  }

  function clearSelectedRubricVersion() {
    setSelectedRubricVersion(null)
    setManualPolicyId(null)
  }

  function addSection() {
    setSections((current) => [...current, newClassTestSection(current.length + 1)])
  }

  function removeSection(sectionKey: string) {
    setSections((current) => current.filter((section) => section.key !== sectionKey))
  }

  function updateSectionTitle(sectionKey: string, title: string) {
    setSections((current) => current.map((section) => (section.key === sectionKey ? { ...section, title } : section)))
  }

  function updateSectionInstruction(sectionKey: string, instruction: string) {
    setSections((current) =>
      current.map((section) => (section.key === sectionKey ? { ...section, instruction } : section)),
    )
  }

  function updateSectionWeight(sectionKey: string, weight: string) {
    setSections((current) => current.map((section) => (section.key === sectionKey ? { ...section, weight } : section)))
  }

  function addQuestionToSection(sectionKey: string, question: QuestionDto) {
    setSections((current) => {
      if (current.some((section) => section.questions.some((existing) => existing.id === question.id))) {
        return current
      }
      return current.map((section) => (section.key === sectionKey ? { ...section, questions: [...section.questions, question] } : section))
    })
  }

  function removeQuestionFromSection(sectionKey: string, questionId: string) {
    setSections((current) =>
      current.map((section) => {
        if (section.key !== sectionKey) {
          return section
        }
        const { [questionId]: _removed, ...restWeights } = section.questionWeights
        return { ...section, questions: section.questions.filter((question) => question.id !== questionId), questionWeights: restWeights }
      }),
    )
  }

  function updateQuestionWeight(sectionKey: string, questionId: string, weight: string) {
    setSections((current) =>
      current.map((section) =>
        section.key === sectionKey
          ? { ...section, questionWeights: { ...section.questionWeights, [questionId]: weight } }
          : section,
      ),
    )
  }

  function autoDistributeQuestionWeights(sectionKey: string) {
    setSections((current) =>
      current.map((section) => {
        if (section.key !== sectionKey) {
          return section
        }
        const resolved = autoDistributeWeights(
          section.questions.map((question) => (section.questionWeights[question.id]?.trim() ? Number(section.questionWeights[question.id]) : null)),
        )
        const questionWeights = { ...section.questionWeights }
        section.questions.forEach((question, index) => {
          questionWeights[question.id] = String(resolved[index])
        })
        return { ...section, questionWeights }
      }),
    )
  }

  const totalQuestions = sections.reduce((sum, section) => sum + section.questions.length, 0)
  const pickerSection = pickerForSectionKey ? sections.find((section) => section.key === pickerForSectionKey) : null

  async function handleSubmit() {
    const parsedSectionWeights = creationMode === 'questions' ? sections.map((section) => parseOptionalSectionWeight(section.weight)) : []
    if (!name.trim() || !schoolClassId) {
      window.alert('Vui lòng nhập tên bài và chọn lớp học.')
      return
    }
    if (creationMode === 'blueprint') {
      if (!selectedBlueprint || !selectedVersion) {
        window.alert('Vui lòng chọn một blueprint và phiên bản đã xuất bản.')
        return
      }
    } else {
      if (sections.length === 0 || sections.every((section) => section.questions.length === 0)) {
        window.alert('Phải có ít nhất một phần với ít nhất một câu hỏi.')
        return
      }
      for (const section of sections) {
        if (!section.title.trim()) {
          window.alert('Mỗi phần phải có tên.')
          return
        }
        if (section.questions.length === 0) {
          window.alert(`Phần "${section.title}" phải có ít nhất một câu hỏi.`)
          return
        }
      }
      const sectionWeightError = validateOptionalSectionWeights(parsedSectionWeights)
      if (sectionWeightError) {
        window.alert(sectionWeightError)
        return
      }
    }
    if (hasAmbiguousPolicy) {
      window.alert('Vui lòng chọn một chính sách đánh giá phù hợp trước khi tạo.')
      return
    }
    if (!openAt || !closeAt) {
      window.alert('Vui lòng nhập đầy đủ thời gian mở bài và đóng bài.')
      return
    }
    const openAtIso = toIsoDateTime(openAt)
    const closeAtIso = toIsoDateTime(closeAt)
    if (!openAtIso || !closeAtIso) {
      window.alert('Thời gian mở bài hoặc đóng bài không hợp lệ.')
      return
    }
    if (new Date(openAtIso).getTime() >= new Date(closeAtIso).getTime()) {
      window.alert('Thời gian mở bài phải nhỏ hơn thời gian đóng bài.')
      return
    }
    if (!(await confirm({ message: 'Bạn có chắc muốn tạo bài trên lớp này không?' }))) {
      return
    }
    try {
      const created = await createMutation.mutateAsync({
        payload: {
          assessmentPolicyId,
          closeAt: closeAtIso,
          description: description || null,
          existingBlueprintId: creationMode === 'blueprint' ? selectedBlueprint?.id : null,
          existingBlueprintVersionId: creationMode === 'blueprint' ? selectedVersion?.id : null,
          maxAttempt: Number(maxAttempt) || 1,
          name,
          openAt: openAtIso,
          resultDecisionMethod,
          schoolClassId,
          sections:
            creationMode === 'blueprint'
              ? null
              : sections.map((section, index) => {
                  const resolvedWeights = autoDistributeWeights(
                    section.questions.map((question) =>
                      section.questionWeights[question.id]?.trim() ? Number(section.questionWeights[question.id]) : null,
                    ),
                  )
                  return {
                    instruction: section.instruction.trim() || null,
                    questions: section.questions.map((question, questionIndex) => ({
                      questionId: question.id,
                      weight: resolvedWeights[questionIndex],
                    })),
                    title: section.title.trim(),
                    weight: parsedSectionWeights[index],
                  }
                }),
        },
        schoolClassName,
      })

      const pendingAssignments = Object.entries(selectionAssignments)
      if (creationMode === 'blueprint' && pendingAssignments.length > 0) {
        const createdPaper = await fetchExamPaper(created.paperId)
        const itemsBySlotId = new Map(
          (createdPaper?.sections.flatMap((section) => section.items) ?? [])
            .filter((item) => item.blueprintSlotId)
            .map((item) => [item.blueprintSlotId as string, item]),
        )
        for (const [slotId, question] of pendingAssignments) {
          const item = itemsBySlotId.get(slotId)
          if (item) {
            await updateItemMutation.mutateAsync({ itemId: item.id, paperId: created.paperId, payload: { questionId: question.id } })
          }
        }
      }

      await queryClient.invalidateQueries({ queryKey: examQueryKeys.all })
      navigate('/teacher/class-tests', { state: { successMessage: 'Đã tạo bài trên lớp thành công.' } })
    } catch (error) {
      setErrorMessage(toApiError(error).message)
    }
  }

  return (
    <section className="mx-auto max-w-220">
      <h1 className="text-[26px] font-extrabold text-slate-900">Tạo bài trên lớp</h1>
      <p className="mt-1.5 text-sm text-slate-500">
        Nhập thông tin bài, sau đó chọn câu hỏi trực tiếp hoặc dùng lại một blueprint đã xuất bản có sẵn.
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

        <div className="grid gap-1.5 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <span className="text-sm font-bold text-slate-700">Phiên bản thang đánh giá (Rubric Version)</span>
          <p className="text-xs text-slate-500">
            Không bắt buộc — chọn để tự động gắn chính sách đánh giá (Assessment Policy) phù hợp cho bài trên lớp.
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
                <button
                  className="shrink-0 text-xs font-bold text-slate-400 hover:text-red-600"
                  onClick={clearSelectedRubricVersion}
                  type="button"
                >
                  Bỏ chọn
                </button>
              </div>

              {isResolvingPolicy ? <p className="text-xs text-slate-400">Đang tìm chính sách đánh giá phù hợp…</p> : null}

              {hasNoMatchingPolicy ? (
                <p className="text-xs font-semibold text-amber-700">
                  Chưa có chính sách đánh giá (Assessment Policy) đã xuất bản cho phiên bản này. Vẫn có thể tạo bài và gắn chính sách
                  sau, hoặc chọn phiên bản khác.
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

        <div>
          <h2 className="text-[15px] font-extrabold text-slate-900">Cách soạn đề</h2>
          <div className="mt-2 flex gap-2">
            <button
              className={[
                'inline-flex h-9.5 items-center justify-center rounded-full border px-4 text-[13px] font-semibold',
                creationMode === 'questions'
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
              ].join(' ')}
              onClick={() => setCreationMode('questions')}
              type="button"
            >
              Câu hỏi trực tiếp
            </button>
            <button
              className={[
                'inline-flex h-9.5 items-center justify-center rounded-full border px-4 text-[13px] font-semibold',
                creationMode === 'blueprint'
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
              ].join(' ')}
              onClick={() => setCreationMode('blueprint')}
              type="button"
            >
              Dùng blueprint có sẵn
            </button>
          </div>
        </div>

        {creationMode === 'blueprint' ? (
          <div>
            {selectedBlueprint && selectedVersion ? (
              <div className="grid gap-3">
                <div
                  className={[
                    'flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4',
                    hasSelectionSlot ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50',
                  ].join(' ')}
                >
                  <div>
                    <div className="text-sm font-extrabold text-slate-900">{selectedBlueprint.name}</div>
                    <div className="text-xs text-slate-500">
                      {selectedBlueprint.code} · phiên bản {selectedVersion.code} ·{' '}
                      {selectedVersion.sectionCount ?? selectedVersion.sections.length} phần
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <a
                      aria-label={`Xem chi tiết ${selectedVersion.code}`}
                      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      href={`/teacher/blueprints/${selectedBlueprint.id}/versions/${selectedVersion.id}`}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <Eye aria-hidden="true" className="size-3.5" />
                      Xem chi tiết
                    </a>
                    <button
                      className="text-xs font-bold text-slate-500 hover:text-red-600"
                      onClick={() => {
                        setSelectedBlueprint(null)
                        setSelectedVersion(null)
                        setSelectionAssignments({})
                      }}
                      type="button"
                    >
                      Đổi
                    </button>
                  </div>
                </div>
                {hasSelectionSlot ? (
                  <p className="text-xs font-semibold text-amber-700">
                    Phiên bản này có ô câu hỏi chọn ngẫu nhiên (SELECTION) — bạn có thể chọn câu hỏi ngay bên dưới,
                    hoặc để trống rồi vào "Soạn đề" của bài trên lớp gán sau.
                  </p>
                ) : null}
                <div className="grid gap-2">
                  {selectedVersion.sections.map((section) => (
                    <div className="rounded-lg border border-slate-200 bg-white p-3" key={section.id}>
                      <div className="text-xs font-extrabold text-slate-900">{section.title}</div>
                      <div className="mt-1.5 grid gap-1.5">
                        {section.slots.map((slot) => {
                          const assigned = selectionAssignments[slot.id]
                          return (
                            <div className="flex items-center justify-between gap-2 text-xs text-slate-600" key={slot.id}>
                              <span className="min-w-0 flex-1">
                                {slot.order}.{' '}
                                {slot.slotType === 'SELECTION' ? (
                                  assigned ? (
                                    <>
                                      {assigned.code} — {formatNullableText(assigned.questionText)}
                                    </>
                                  ) : (
                                    <span className="italic text-amber-700">Chọn ngẫu nhiên theo tiêu chí (chưa gán)</span>
                                  )
                                ) : slot.fixedQuestion ? (
                                  <>
                                    {slot.fixedQuestion.code} — {formatNullableText(slot.fixedQuestion.questionText)}
                                  </>
                                ) : slot.fixedQuestionId ? (
                                  <span className="italic text-slate-500">Đã chọn — bạn không có quyền xem nội dung</span>
                                ) : (
                                  '—'
                                )}
                              </span>
                              {slot.slotType === 'SELECTION' ? (
                                <button
                                  className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-indigo-600 hover:bg-indigo-50"
                                  onClick={() => setSelectionPickerSlotId(slot.id)}
                                  type="button"
                                >
                                  {assigned ? 'Đổi' : 'Chọn câu hỏi'}
                                </button>
                              ) : slot.fixedQuestion ? (
                                <a
                                  aria-label={`Xem chi tiết ${slot.fixedQuestion.code}`}
                                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                  href={`/teacher/questions/${slot.fixedQuestion.id}`}
                                  rel="noopener noreferrer"
                                  target="_blank"
                                  title="Xem chi tiết câu hỏi"
                                >
                                  <Eye aria-hidden="true" className="size-3.5" />
                                </a>
                              ) : null}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
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
                      .map((version) => (
                        <div
                          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5"
                          key={version.id}
                        >
                          <button
                            className="flex flex-1 items-center justify-between text-left text-sm hover:opacity-80"
                            onClick={() => {
                              setSelectedBlueprint(browsingBlueprint)
                              setSelectedVersion(version)
                              setSelectionAssignments({})
                              setBrowsingBlueprint(null)
                            }}
                            type="button"
                          >
                            <span className="font-bold text-slate-900">{version.code}</span>
                            <span className="text-xs text-slate-500">
                              {version.sectionCount ?? version.sections.length} phần
                            </span>
                          </button>
                          <a
                            aria-label={`Xem chi tiết ${version.code}`}
                            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                            href={`/teacher/blueprints/${browsingBlueprint.id}/versions/${version.id}`}
                            rel="noopener noreferrer"
                            target="_blank"
                            title="Xem chi tiết"
                          >
                            <Eye aria-hidden="true" className="size-3.5" />
                          </a>
                        </div>
                      ))
                  )}
                </div>
              </div>
            ) : (
              <div>
                <input
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-indigo-400"
                  onChange={(event) => {
                    setBlueprintKeyword(event.target.value)
                    setBlueprintPage(1)
                  }}
                  placeholder="Tìm blueprint theo mã hoặc tên…"
                  value={blueprintKeyword}
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
                        disabled={blueprintPage <= 1}
                        onClick={() => setBlueprintPage((current) => current - 1)}
                        type="button"
                      >
                        Trước
                      </button>
                      <button
                        className="h-8 rounded-lg border border-slate-200 px-3 disabled:opacity-40"
                        disabled={blueprintPage >= blueprintsQuery.data.totalPages}
                        onClick={() => setBlueprintPage((current) => current + 1)}
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
        ) : (
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-extrabold text-slate-900">Các phần và câu hỏi ({totalQuestions} câu)</h2>
            <button
              className="inline-flex h-9.5 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-[13px] font-semibold text-indigo-600 hover:bg-slate-50"
              onClick={addSection}
              type="button"
            >
              <Plus aria-hidden="true" className="size-4" />
              Thêm phần
            </button>
          </div>

          <div className="mt-2.5 grid gap-3">
            {sections.map((section) => (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5" key={section.key}>
                <div className="flex items-center gap-2.5">
                  <input
                    className="h-9.5 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900"
                    onChange={(event) => updateSectionTitle(section.key, event.target.value)}
                    value={section.title}
                  />
                  <input
                    className="h-9.5 w-28 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900"
                    max="1"
                    min="0"
                    onChange={(event) => updateSectionWeight(section.key, event.target.value)}
                    placeholder="Weight"
                    step="0.01"
                    type="number"
                    value={section.weight}
                  />
                  <button
                    className="inline-flex h-9.5 items-center justify-center rounded-full border border-slate-200 bg-white px-3.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50"
                    onClick={() => setPickerForSectionKey(section.key)}
                    type="button"
                  >
                    + Câu hỏi
                  </button>
                  {sections.length > 1 ? (
                    <button
                      aria-label={`Xóa ${section.title}`}
                      className="inline-flex size-9.5 items-center justify-center rounded-full border border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => removeSection(section.key)}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                    </button>
                  ) : null}
                </div>
                <textarea
                  className="mt-2 min-h-14 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                  onChange={(event) => updateSectionInstruction(section.key, event.target.value)}
                  placeholder="Hướng dẫn phần (không bắt buộc)"
                  value={section.instruction}
                />
                {section.questions.length === 0 ? (
                  <div className="mt-2.5 rounded-lg border border-dashed border-slate-300 px-4 py-4 text-center text-xs text-slate-400">
                    Chưa có câu hỏi nào trong phần này.
                  </div>
                ) : (
                  <>
                    <div className="mt-2.5 grid gap-1.5">
                      {section.questions.map((question, index) => (
                        <div
                          className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm"
                          key={question.id}
                        >
                          <span className="font-semibold text-slate-800">
                            {index + 1}. {question.code} — {formatNullableText(question.questionText)}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <label className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                              Trọng số
                              <input
                                className="h-7 w-16 rounded-lg border border-slate-200 px-1.5 text-xs font-medium text-slate-900"
                                onChange={(event) => updateQuestionWeight(section.key, question.id, event.target.value)}
                                step="0.01"
                                type="number"
                                value={section.questionWeights[question.id] ?? ''}
                              />
                            </label>
                            <a
                              aria-label={`Xem chi tiết ${question.code}`}
                              className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
                              href={`/teacher/questions/${question.id}`}
                              rel="noopener noreferrer"
                              target="_blank"
                              title="Xem chi tiết câu hỏi"
                            >
                              <Eye aria-hidden="true" className="size-3.5" />
                            </a>
                            <button
                              className="inline-flex h-7 items-center justify-center rounded-full border border-red-200 px-2.5 text-xs font-bold text-red-600 hover:bg-red-50"
                              onClick={() => removeQuestionFromSection(section.key, question.id)}
                              type="button"
                            >
                              Bỏ
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50"
                      onClick={() => autoDistributeQuestionWeights(section.key)}
                      type="button"
                    >
                      Chia trọng số câu hỏi tự động
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
        )}

        <div className="flex justify-end">
          <button
            className="inline-flex h-10.5 items-center justify-center rounded-full bg-indigo-600 px-5 text-sm font-bold text-white disabled:opacity-60"
            disabled={createMutation.isPending || !canSubmitPolicy}
            onClick={handleSubmit}
            title={hasAmbiguousPolicy ? 'Chọn một chính sách đánh giá phù hợp trước khi tạo' : undefined}
            type="button"
          >
            Tạo bài trên lớp
          </button>
        </div>
      </div>

      {pickerSection ? (
        <QuestionPicker
          excludeQuestionIds={sections
            .filter((section) => section.key !== pickerSection.key)
            .flatMap((section) => section.questions.map((question) => question.id))}
          onClose={() => setPickerForSectionKey(null)}
          onSelect={(question) => addQuestionToSection(pickerSection.key, question)}
          scope="teacher"
          selectedQuestionIds={pickerSection.questions.map((question) => question.id)}
        />
      ) : null}

      {selectionPickerSlotId ? (
        <QuestionPicker
          excludeQuestionIds={[
            ...(selectedVersion?.sections.flatMap((section) =>
              section.slots
                .filter((slot) => slot.slotType === 'FIXED' && slot.fixedQuestion)
                .map((slot) => slot.fixedQuestion?.id as string),
            ) ?? []),
            ...Object.entries(selectionAssignments)
              .filter(([slotId]) => slotId !== selectionPickerSlotId)
              .map(([, question]) => question.id),
          ]}
          onClose={() => setSelectionPickerSlotId(null)}
          onSelect={(question) => {
            setSelectionAssignments((current) => ({ ...current, [selectionPickerSlotId]: question }))
            setSelectionPickerSlotId(null)
          }}
          scope="teacher"
          selectedQuestionIds={
            selectionAssignments[selectionPickerSlotId] ? [selectionAssignments[selectionPickerSlotId].id] : []
          }
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
  const currentBlueprintQuery = useExamBlueprintQuery(blueprintId ?? null)
  const blueprintsQuery = useExamBlueprintsQuery({ isActive: true, keyword, page, size: 8 })
  const changeMutation = useChangeClassTestBlueprintMutation()
  const { confirm, dialog } = useConfirmationDialog()

  const currentBlueprint = currentBlueprintQuery.data
  const currentVersion = currentBlueprint?.versions.find((version) => version.id === blueprintVersionId)

  async function handleSwitch(newBlueprintId: string, newVersionId: string) {
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
                .map((version) => (
                  <button
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-left text-sm hover:bg-slate-50"
                    key={version.id}
                    onClick={() => void handleSwitch(browsingBlueprint.id, version.id)}
                    type="button"
                  >
                    <span className="font-bold text-slate-900">{version.code}</span>
                    <span className="text-xs text-slate-500">{version.sectionCount ?? version.sections.length} phần</span>
                  </button>
                ))
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

type DetailTab = 'assessment' | 'blueprint' | 'papers' | 'schedule' | 'students'

function ClassTestDetailPage({ canManage }: ClassTestDetailPageProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { examId } = useParams()
  const examQuery = useExamQuery(examId ?? null)
  const exam = examQuery.data
  const updateQuestionsMutation = useUpdateClassTestQuestionsMutation()
  const updateExamMutation = useUpdateClassTestMutation()
  const updateStatusMutation = useUpdateClassTestStatusMutation()
  const deleteMutation = useDeleteClassTestMutation()
  const deleteSectionMutation = useDeleteClassTestSectionMutation()
  const setDeliveryModeMutation = useSetExamDeliveryModeMutation()
  const [tab, setTab] = useState<DetailTab>('papers')
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

  const paperSections = exam?.papers[0]?.sections ?? []

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
    setShowEditInfo(true)
  }

  async function handleSaveInfo() {
    if (!exam) {
      return
    }
    if (!editOpenAt || !editCloseAt) {
      window.alert('Vui lòng nhập đầy đủ thời gian mở bài và đóng bài.')
      return
    }
    const openAtIso = toIsoDateTime(editOpenAt)
    const closeAtIso = toIsoDateTime(editCloseAt)
    if (!openAtIso || !closeAtIso) {
      window.alert('Thời gian mở bài hoặc đóng bài không hợp lệ.')
      return
    }
    if (new Date(openAtIso).getTime() >= new Date(closeAtIso).getTime()) {
      window.alert('Thời gian mở bài phải nhỏ hơn thời gian đóng bài.')
      return
    }
    try {
      await updateExamMutation.mutateAsync({
        examId: exam.id,
        payload: {
          closeAt: closeAtIso,
          description: editDescription.trim() || null,
          maxAttempt: Number(editMaxAttempt) || 1,
          name: editName.trim(),
          openAt: openAtIso,
          resultDecisionMethod: editResultDecisionMethod,
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
      window.alert('Trọng số section phải là số hợp lệ.')
      return
    }
    const next = currentSectionsPayload().map((section, index) =>
      index === sectionIndex
        ? { ...section, instruction: editSectionInstruction.trim() || null, title: editSectionTitle.trim() || section.title, weight: nextWeight }
        : section,
    )
    const sectionWeightError = validateOptionalSectionWeights(next.map((section) => section.weight ?? null))
    if (sectionWeightError) {
      window.alert(sectionWeightError)
      return
    }
    try {
      await updateQuestionsMutation.mutateAsync({
        examId: exam.id,
        payload: { sections: toApiSections(next) },
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
        payload: { sections: toApiSections(next) },
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
        payload: { sections: toApiSections(next) },
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
      window.alert('Bài phải có ít nhất 1 phần — không thể xóa phần cuối cùng.')
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
    try {
      await updateStatusMutation.mutateAsync({ examId: exam.id, payload: { action } })
      await invalidate()
      setMessage(
        {
          CANCEL: 'Đã hủy bài kiểm tra.',
          CLOSE: 'Đã đóng bài kiểm tra.',
          PUBLISH_RESULTS: 'Đã trả điểm cho bài trên lớp.',
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
  const { completedCount, steps } = getClassTestWorkflowSteps(exam)
  const unlockedSchedule = completedCount >= 2
  const resultBasePath = canManage ? '/teacher/exam-results' : '/school-admin/exam-results'
  // Khớp rule backend: nội dung/ngày giờ chỉ khóa khi bài đã bắt đầu.
  const canEditContent = canManage && (exam.status === 'DRAFT' || exam.status === 'SCHEDULED')
  // Chỉ soạn câu hỏi trực tiếp được khi KHÔNG có blueprint dùng chung nào đang gắn (dùng "Đổi blueprint khác" nếu có).
  const canEditFreeQuestions = canEditContent && !exam.blueprintId
  const canManualStart = canManage && canStartClassTestManually(exam, nowMs)
  const primaryStatusAction =
    exam.status === 'DRAFT' && completedCount >= 2
      ? { action: 'SCHEDULE' as const, icon: <Calendar aria-hidden="true" className="size-4.5" />, label: 'Lên lịch bài kiểm tra' }
      : canManualStart
        ? { action: 'START' as const, icon: <PlayCircle aria-hidden="true" className="size-4.5" />, label: 'Mở bài ngay' }
      : exam.status === 'IN_PROGRESS'
          ? { action: 'CLOSE' as const, icon: <Lock aria-hidden="true" className="size-4.5" />, label: 'Đóng bài kiểm tra' }
          : exam.status === 'CLOSED'
            ? { action: 'PUBLISH_RESULTS' as const, icon: <Megaphone aria-hidden="true" className="size-4.5" />, label: 'Trả điểm' }
            : null

  const nextAction =
    completedCount === 0
      ? {
          ctaLabel: 'Soạn đề bài',
          description: 'Bấm "Thêm câu hỏi" ở tab Đề bài để soạn trực tiếp, hoặc gắn blueprint (không bắt buộc) ở tab Blueprint.',
          onClick: () => setTab('papers'),
          title: 'Chưa soạn đề bài',
        }
      : completedCount === 1
        ? {
            ctaLabel: 'Mở đề thi',
            description: 'Duyệt và khóa các mã đề còn lại để chuyển sang bước mở bài.',
            onClick: () => setTab('papers'),
            title: 'Duyệt mã đề còn lại rồi chọn thời gian mở bài',
          }
        : completedCount === 2
          ? { ctaLabel: 'Chọn thời gian', description: 'Chọn khung giờ mở – đóng bài cho lớp.', onClick: () => setTab('schedule'), title: 'Chọn thời gian mở bài' }
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
              onClick={() => navigate(`${resultBasePath}?examId=${exam.id}`)}
              type="button"
            >
              <ClipboardList aria-hidden="true" className="size-4" />
              Xem kết quả
            </button>
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
          <div className="flex justify-end">
            <button
              className="inline-flex h-9.5 items-center justify-center rounded-full bg-indigo-600 px-4 text-xs font-bold text-white disabled:opacity-60"
              disabled={updateExamMutation.isPending}
              onClick={() => void handleSaveInfo()}
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
            { label: 'Phương thức đánh giá', value: 'assessment' },
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
            <div className="grid gap-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-extrabold text-slate-900">Các phần và câu hỏi</h2>
                {canEditFreeQuestions ? (
                  <button
                    className="inline-flex h-9.5 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-[13px] font-semibold text-indigo-600 hover:bg-slate-50"
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
                  Bài đã mở cho học sinh làm bài — không thể sửa câu hỏi/section nữa.
                </p>
              ) : exam.blueprintId ? (
                <p className="text-xs font-semibold text-amber-700">
                  Bài đang dùng blueprint dùng chung — vào tab Blueprint để đổi/gỡ blueprint thay vì sửa trực tiếp ở đây.
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
                          {section.weight != null ? <p className="mt-0.5 text-xs font-semibold text-slate-500">Weight: {section.weight.toFixed(2)}</p> : null}
                          {section.instruction ? <p className="mt-0.5 text-xs text-slate-500">{section.instruction}</p> : null}
                        </div>
                        {canEditFreeQuestions ? (
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
                                  href={`${canManage ? '/teacher' : '/school-admin'}/questions/${item.question.id}`}
                                  rel="noopener noreferrer"
                                  target="_blank"
                                  title="Xem chi tiết câu hỏi"
                                >
                                  <Eye aria-hidden="true" className="size-3.5" />
                                </a>
                              ) : null}
                              {canEditFreeQuestions && section.items.length > 1 && item.questionId ? (
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
          ) : null}
          {exam.papers.map((paper) => (
            <PaperCard
              key={paper.id}
              onOpen={() =>
                navigate(
                  canManage ? `/teacher/exam-papers/${paper.id}/edit` : `/school-admin/exam-papers/${paper.id}`,
                  { state: { examId: exam.id, paperId: paper.id } },
                )
              }
              openLabel={canManage ? 'Soạn đề' : 'Xem đề'}
              paper={paper}
            />
          ))}
        </div>
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
          scope="teacher"
          selectedQuestionIds={
            pickerMode.kind === 'existing'
              ? ((paperSections[pickerMode.sectionIndex]?.items.map((item) => item.questionId).filter(Boolean) as string[]) ?? [])
              : []
          }
        />
      ) : null}

      {tab === 'assessment' ? <AssessmentMethodTab /> : null}

      {tab === 'students' ? <CandidatesTab canManage={canManage} examId={exam.id} papers={exam.papers} /> : null}

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
          examId={exam.id}
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
