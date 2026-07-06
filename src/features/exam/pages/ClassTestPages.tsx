import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  BookOpenCheck,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  FilePenLine,
  Hash,
  Languages,
  LayoutList,
  PlayCircle,
  Plus,
  RefreshCw,
  Smartphone,
  Trash2,
  Users,
  NotebookPen,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import { useAppSelector } from '@/app/store/hooks'
import { useMySchoolClassesQuery } from '@/features/classes/api/useMySchoolClassesQuery'
import { useSchoolClassesQuery } from '@/features/classes/api/useSchoolClassesQuery'
import type { QuestionDto } from '@/features/question/types'
import { toApiError } from '@/shared/api'
import { Pagination } from '@/shared/components/Pagination'
import { useConfirmationDialog } from '@/shared/ui/ConfirmationDialog'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { StatCard } from '@/shared/ui/StatCard'
import { TabPillGroup } from '@/shared/ui/TabPill'
import type { WorkflowStep } from '@/shared/ui/WorkflowStepper'
import { BlueprintAttachPanel } from '../components/BlueprintAttachPanel'
import { CandidatesTab } from '../components/CandidatesTab'
import { DetailHeaderCard } from '../components/DetailHeaderCard'
import { ExamListRow } from '../components/ExamListRow'
import { FilterChips } from '../components/FilterChips'
import { PaperCard } from '../components/PaperCard'
import { QuestionPicker } from '../components/QuestionPicker'
import { ScheduleTab } from '../components/schedule/ScheduleTab'
import { WorkflowTrackerCard } from '../components/WorkflowTrackerCard'
import {
  examQueryKeys,
  useClassTestStatsQuery,
  useClassTestsQuery,
  useExamBlueprintsQuery,
  useExamQuery,
} from '../api/useExamQueries'
import {
  useCreateClassTestMutation,
  useDeleteClassTestMutation,
  useSetExamDeliveryModeMutation,
  useUpdateClassTestQuestionsMutation,
  useUpdateClassTestStatusMutation,
} from '../api/useExamMutations'
import {
  formatDateTime,
  formatNullableText,
  getClassTestStatusDisplay,
  toIsoDateTime,
  type ExamBlueprintDto,
  type ExamBlueprintVersionDto,
  type ExamDeliveryMode,
  type ExamDto,
  type ExamStatus,
} from '../types'

const STATUS_FILTERS: Array<{ label: string; value: '' | ExamStatus }> = [
  { label: 'Tất cả', value: '' },
  { label: 'Bản nháp', value: 'DRAFT' },
  { label: 'Đang mở', value: 'IN_PROGRESS' },
  { label: 'Đã đóng', value: 'CLOSED' },
  { label: 'Đã trả điểm', value: 'RESULTS_PUBLISHED' },
]

function getClassTestWorkflowSteps(exam: ExamDto): { completedCount: number; steps: WorkflowStep[] } {
  const hasBlueprint = Boolean(exam.blueprintVersionId)
  const hasQuestions = exam.papers.some((paper) => paper.sections.some((section) => section.items.length > 0))
  const totalPapers = exam.papers.length
  const readyPapers = exam.papers.filter((paper) => paper.status === 'LOCKED' || paper.status === 'APPROVED').length
  const papersReady = totalPapers > 0 && readyPapers === totalPapers
  const isPublished = exam.status === 'RESULTS_PUBLISHED' || exam.status === 'CLOSED'

  // Blueprint is optional for bài trên lớp: soạn đề trực tiếp bằng câu hỏi cũng coi là hoàn tất bước này.
  const step1Done = hasBlueprint || hasQuestions
  const step2Done = papersReady
  const step3Done = isPublished

  const steps: WorkflowStep[] = [
    {
      icon: step1Done ? <Check size={26} /> : <LayoutList size={24} />,
      label: 'Soạn đề bài',
      state: step1Done ? 'done' : 'current',
      sublabel: hasBlueprint ? 'Đã gắn blueprint' : step1Done ? 'Đã thêm câu hỏi trực tiếp' : 'Chưa gắn blueprint hoặc thêm câu hỏi',
    },
    {
      icon: step2Done ? <Check size={26} /> : <FilePenLine size={24} />,
      label: 'Soạn & giao đề',
      state: !step1Done ? 'upcoming' : step2Done ? 'done' : 'current',
      sublabel: totalPapers ? `${readyPapers} / ${totalPapers} mã đề đã duyệt` : undefined,
    },
    {
      icon: step3Done ? <Check size={26} /> : <PlayCircle size={24} />,
      label: 'Mở bài & chấm',
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
            const hasContent =
              exam.blueprintId || exam.papers.some((paper) => paper.sections.some((section) => section.items.length > 0))
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
  const teacherClassesQuery = useMySchoolClassesQuery(page, 10, user?.schoolId ?? '', 'ACTIVE')
  const adminClassesQuery = useSchoolClassesQuery(page, 10, {
    languageId: '',
    schoolGradeId: '',
    search,
    status: 'ACTIVE',
  })

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
  title: string
}

function newClassTestSection(order: number): ClassTestSectionDraft {
  return { instruction: '', key: nextClassTestKey('cts'), questions: [], title: `Phần ${order}` }
}

export function TeacherClassTestCreatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const createMutation = useCreateClassTestMutation()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [schoolClassId, setSchoolClassId] = useState('')
  const [schoolClassName, setSchoolClassName] = useState('')
  const [openAt, setOpenAt] = useState('')
  const [closeAt, setCloseAt] = useState('')
  const [sections, setSections] = useState<ClassTestSectionDraft[]>([newClassTestSection(1)])
  const [pickerForSectionKey, setPickerForSectionKey] = useState<string | null>(null)
  const [creationMode, setCreationMode] = useState<'questions' | 'blueprint'>('questions')
  const [blueprintKeyword, setBlueprintKeyword] = useState('')
  const [blueprintPage, setBlueprintPage] = useState(1)
  const [browsingBlueprint, setBrowsingBlueprint] = useState<ExamBlueprintDto | null>(null)
  const [selectedBlueprint, setSelectedBlueprint] = useState<ExamBlueprintDto | null>(null)
  const [selectedVersion, setSelectedVersion] = useState<ExamBlueprintVersionDto | null>(null)
  const blueprintsQuery = useExamBlueprintsQuery({ isActive: true, keyword: blueprintKeyword, page: blueprintPage, size: 8 })
  const { confirm, dialog } = useConfirmationDialog()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const hasSelectionSlot = selectedVersion?.sections.some((section) =>
    section.slots.some((slot) => slot.slotType === 'SELECTION'),
  )

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

  function addQuestionToSection(sectionKey: string, question: QuestionDto) {
    setSections((current) =>
      current.map((section) =>
        section.key === sectionKey && !section.questions.some((existing) => existing.id === question.id)
          ? { ...section, questions: [...section.questions, question] }
          : section,
      ),
    )
  }

  function removeQuestionFromSection(sectionKey: string, questionId: string) {
    setSections((current) =>
      current.map((section) =>
        section.key === sectionKey
          ? { ...section, questions: section.questions.filter((question) => question.id !== questionId) }
          : section,
      ),
    )
  }

  const totalQuestions = sections.reduce((sum, section) => sum + section.questions.length, 0)
  const pickerSection = pickerForSectionKey ? sections.find((section) => section.key === pickerForSectionKey) : null

  async function handleSubmit() {
    if (!name.trim() || !schoolClassId) {
      window.alert('Vui lòng nhập tên bài và chọn lớp học.')
      return
    }
    if (creationMode === 'blueprint') {
      if (!selectedBlueprint || !selectedVersion) {
        window.alert('Vui lòng chọn một blueprint và phiên bản đã xuất bản.')
        return
      }
      if (hasSelectionSlot) {
        window.alert(
          'Phiên bản này có ô câu hỏi chọn ngẫu nhiên (SELECTION) — chỉ dùng được blueprint gồm toàn câu hỏi cố định (FIXED) cho bài trên lớp.',
        )
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
    }
    if (!(await confirm({ message: 'Bạn có chắc muốn tạo bài trên lớp này không?' }))) {
      return
    }
    try {
      await createMutation.mutateAsync({
        payload: {
          closeAt: toIsoDateTime(closeAt),
          description: description || null,
          existingBlueprintId: creationMode === 'blueprint' ? selectedBlueprint?.id : null,
          existingBlueprintVersionId: creationMode === 'blueprint' ? selectedVersion?.id : null,
          name,
          openAt: toIsoDateTime(openAt),
          schoolClassId,
          sections:
            creationMode === 'blueprint'
              ? null
              : sections.map((section) => ({
                  instruction: section.instruction.trim() || null,
                  questionIds: section.questions.map((question) => question.id),
                  title: section.title.trim(),
                })),
        },
        schoolClassName,
      })
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
              type="datetime-local"
              value={openAt}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-slate-700">
            Đóng lúc
            <input
              className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-900"
              onChange={(event) => setCloseAt(event.target.value)}
              type="datetime-local"
              value={closeAt}
            />
          </label>
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
                  <button
                    className="shrink-0 text-xs font-bold text-slate-500 hover:text-red-600"
                    onClick={() => {
                      setSelectedBlueprint(null)
                      setSelectedVersion(null)
                    }}
                    type="button"
                  >
                    Đổi
                  </button>
                </div>
                {hasSelectionSlot ? (
                  <p className="text-xs font-semibold text-amber-700">
                    Phiên bản này có ô câu hỏi chọn ngẫu nhiên (SELECTION) — không thể dùng cho bài trên lớp, vì mỗi học
                    sinh cần một đề cố định giống nhau. Bấm "Đổi" để chọn blueprint/phiên bản khác chỉ gồm câu hỏi cố
                    định (FIXED), hoặc chuyển sang "Câu hỏi trực tiếp".
                  </p>
                ) : (
                  <div className="grid gap-2">
                    {selectedVersion.sections.map((section) => (
                      <div className="rounded-lg border border-slate-200 bg-white p-3" key={section.id}>
                        <div className="text-xs font-extrabold text-slate-900">{section.title}</div>
                        <div className="mt-1.5 grid gap-1">
                          {section.slots.map((slot) => (
                            <div className="text-xs text-slate-600" key={slot.id}>
                              {slot.order}. {slot.fixedQuestion?.code ?? '—'} —{' '}
                              {formatNullableText(slot.fixedQuestion?.questionText)}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                          onClick={() => {
                            setSelectedBlueprint(browsingBlueprint)
                            setSelectedVersion(version)
                            setBrowsingBlueprint(null)
                          }}
                          type="button"
                        >
                          <span className="font-bold text-slate-900">{version.code}</span>
                          <span className="text-xs text-slate-500">
                            {version.sectionCount ?? version.sections.length} phần
                          </span>
                        </button>
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
                )}
              </div>
            ))}
          </div>
        </div>
        )}

        <div className="flex justify-end">
          <button
            className="inline-flex h-10.5 items-center justify-center rounded-full bg-indigo-600 px-5 text-sm font-bold text-white disabled:opacity-60"
            disabled={createMutation.isPending || (creationMode === 'blueprint' && Boolean(hasSelectionSlot))}
            onClick={handleSubmit}
            type="button"
          >
            Tạo bài trên lớp
          </button>
        </div>
      </div>

      {pickerSection ? (
        <QuestionPicker
          onClose={() => setPickerForSectionKey(null)}
          onSelect={(question) => addQuestionToSection(pickerSection.key, question)}
          scope="teacher"
          selectedQuestionIds={pickerSection.questions.map((question) => question.id)}
        />
      ) : null}
    </section>
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
  const updateQuestionsMutation = useUpdateClassTestQuestionsMutation()
  const updateStatusMutation = useUpdateClassTestStatusMutation()
  const deleteMutation = useDeleteClassTestMutation()
  const setDeliveryModeMutation = useSetExamDeliveryModeMutation()
  const [tab, setTab] = useState<DetailTab>('papers')
  const [message, setMessage] = useState<string | null>(null)
  const [pickerMode, setPickerMode] = useState<{ kind: 'existing'; sectionIndex: number } | { kind: 'new'; title: string } | null>(null)
  const { confirm, dialog } = useConfirmationDialog()

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.all })
  }

  const paperSections = exam?.papers[0]?.sections ?? []

  function currentSectionsPayload() {
    return paperSections.map((section) => ({
      questionIds: (section.items.map((item) => item.questionId).filter(Boolean) as string[]),
      title: section.title?.trim() || 'Phần',
    }))
  }

  function handleOpenAddSection() {
    const title = window.prompt('Tên phần mới (VD: Phần 2 · Ngữ pháp):', `Phần ${paperSections.length + 1}`)
    if (!title?.trim()) {
      return
    }
    setPickerMode({ kind: 'new', title: title.trim() })
  }

  async function handlePickQuestion(question: QuestionDto) {
    if (!exam || !pickerMode) {
      return
    }
    const current = currentSectionsPayload()
    const next =
      pickerMode.kind === 'new'
        ? [...current, { questionIds: [question.id], title: pickerMode.title }]
        : current.map((section, index) =>
            index === pickerMode.sectionIndex && !section.questionIds.includes(question.id)
              ? { ...section, questionIds: [...section.questionIds, question.id] }
              : section,
          )
    await updateQuestionsMutation.mutateAsync({ examId: exam.id, payload: { sections: next } })
    await invalidate()
    setPickerMode(null)
    setMessage('Đã cập nhật câu hỏi.')
  }

  async function handleRemoveQuestion(sectionIndex: number, questionId: string) {
    if (!exam) {
      return
    }
    const current = currentSectionsPayload()
    const next = current.map((section, index) =>
      index === sectionIndex ? { ...section, questionIds: section.questionIds.filter((id) => id !== questionId) } : section,
    )
    await updateQuestionsMutation.mutateAsync({ examId: exam.id, payload: { sections: next } })
    await invalidate()
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
    const next = current.filter((_, index) => index !== sectionIndex)
    await updateQuestionsMutation.mutateAsync({ examId: exam.id, payload: { sections: next } })
    await invalidate()
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
      {dialog}

      <DetailHeaderCard
        metaItems={[
          { icon: <Hash aria-hidden="true" className="size-3.5" />, label: exam.code },
          { icon: <NotebookPen aria-hidden="true" className="size-3.5" />, label: 'Bài trên lớp' },
          { icon: <Languages aria-hidden="true" className="size-3.5" />, label: 'Tiếng Anh' },
          { icon: <Calendar aria-hidden="true" className="size-3.5" />, label: `${formatDateTime(exam.openAt)} – ${formatDateTime(exam.closeAt)}` },
          { icon: <Users aria-hidden="true" className="size-3.5" />, label: `GV: ${formatNullableText(exam.teacherName)}` },
        ]}
        statusLabel={statusDisplay.label}
        statusTone={statusDisplay.tone}
        title={exam.name}
      />

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
            { label: 'Đề bài', value: 'papers' },
            { label: 'Học sinh', value: 'students' },
            { label: 'Blueprint (tuỳ chọn)', value: 'blueprint' },
            { icon: <Smartphone aria-hidden="true" className="size-4" />, label: 'Phân lịch', value: 'schedule' },
          ]}
          onChange={setTab}
          value={tab}
        />
      </div>

      {tab === 'papers' ? (
        <div className="mt-4 grid gap-3.5">
          {canManage && !exam.blueprintId ? (
            <div className="grid gap-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-extrabold text-slate-900">Các phần và câu hỏi</h2>
                <button
                  className="inline-flex h-9.5 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-[13px] font-semibold text-indigo-600 hover:bg-slate-50"
                  onClick={handleOpenAddSection}
                  type="button"
                >
                  <Plus aria-hidden="true" className="size-4" />
                  Thêm phần
                </button>
              </div>
              {paperSections.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
                  Chưa có phần nào — bấm "Thêm phần" để bắt đầu soạn đề.
                </div>
              ) : (
                paperSections.map((section, sectionIndex) => (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5" key={section.id}>
                    <div className="flex items-center justify-between gap-2.5">
                      <span className="text-sm font-bold text-slate-900">{section.title || `Phần ${sectionIndex + 1}`}</span>
                      <div className="flex items-center gap-1.5">
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
                    </div>
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
                            <span className="font-semibold text-slate-800">
                              {index + 1}. {item.question?.code} — {formatNullableText(item.question?.questionText)}
                            </span>
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
                              {section.items.length > 1 && item.questionId ? (
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
          onClose={() => setPickerMode(null)}
          onSelect={(question) => void handlePickQuestion(question)}
          scope="teacher"
          selectedQuestionIds={
            paperSections.flatMap((section) => section.items.map((item) => item.questionId)).filter(Boolean) as string[]
          }
        />
      ) : null}

      {tab === 'students' ? <CandidatesTab examId={exam.id} /> : null}

      {tab === 'blueprint' ? (
        <BlueprintAttachPanel
          blueprintId={exam.blueprintId}
          blueprintVersionId={exam.blueprintVersionId}
          examId={exam.id}
          hasPapers={exam.papers.length > 0}
          members={exam.members}
          onCreateVersion={(blueprintId) => navigate(`/teacher/blueprints/${blueprintId}/versions/new`)}
          onOpenBlueprint={(blueprintId, versionId) =>
            navigate(versionId ? `/teacher/blueprints/${blueprintId}/versions/${versionId}` : `/teacher/blueprints/${blueprintId}`)
          }
          optional
        />
      ) : null}

      {tab === 'schedule' ? (
        <ScheduleTab
          deliveryMode={exam.deliveryMode}
          examId={exam.id}
          isClassTest
          onGoToPapers={() => setTab('papers')}
          onSetDeliveryMode={
            canManage
              ? (mode: ExamDeliveryMode) =>
                  void setDeliveryModeMutation.mutateAsync({ deliveryMode: mode, examId: exam.id }).then(invalidate)
              : undefined
          }
          papers={exam.papers}
          unlocked={unlockedSchedule}
        />
      ) : null}

      {canManage ? (
        <div className="mt-6 flex flex-wrap gap-2.5">
          <button
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
            onClick={() => void examQuery.refetch()}
            type="button"
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            Làm mới
          </button>
          {exam.status !== 'RESULTS_PUBLISHED' ? (
            <button
              className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
              onClick={() =>
                void updateStatusMutation
                  .mutateAsync({ examId: exam.id, payload: { action: 'PUBLISH_RESULTS' } })
                  .then(() => invalidate())
                  .then(() => setMessage('Đã trả điểm cho bài trên lớp.'))
              }
              type="button"
            >
              Trả điểm
            </button>
          ) : null}
          <button
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-red-200 px-4 text-sm font-bold text-red-600 hover:bg-red-50"
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
            Xóa bài trên lớp
          </button>
        </div>
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
