import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  BookOpenCheck,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
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
  const [selectedQuestions, setSelectedQuestions] = useState<QuestionDto[]>([])
  const [showQuestionPicker, setShowQuestionPicker] = useState(false)
  const { confirm, dialog } = useConfirmationDialog()

  async function handleSubmit() {
    if (!name.trim() || !schoolClassId) {
      window.alert('Vui lòng nhập tên bài và chọn lớp học.')
      return
    }
    if (!(await confirm({ message: 'Bạn có chắc muốn tạo bài trên lớp này không?' }))) {
      return
    }
    await createMutation.mutateAsync({
      payload: {
        closeAt: toIsoDateTime(closeAt),
        description: description || null,
        name,
        openAt: toIsoDateTime(openAt),
        questionIds: selectedQuestions.map((question) => question.id),
        schoolClassId,
      },
      schoolClassName,
    })
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.all })
    navigate('/teacher/class-tests', { state: { successMessage: 'Đã tạo bài trên lớp thành công.' } })
  }

  return (
    <section className="mx-auto max-w-220">
      <h1 className="text-[26px] font-extrabold text-slate-900">Tạo bài trên lớp</h1>
      <p className="mt-1.5 text-sm text-slate-500">
        Nhập thông tin bài và chọn câu hỏi theo đúng thứ tự muốn sử dụng. Bạn có thể tạo thẳng đề bài bằng câu hỏi ở
        đây mà không cần gắn blueprint — có thể gắn blueprint sau (không bắt buộc) trong trang chi tiết bài.
      </p>
      {dialog}

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
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-extrabold text-slate-900">Câu hỏi đã chọn ({selectedQuestions.length})</h2>
            <button
              className="inline-flex h-9.5 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-[13px] font-semibold text-indigo-600 hover:bg-slate-50"
              onClick={() => setShowQuestionPicker(true)}
              type="button"
            >
              <Plus aria-hidden="true" className="size-4" />
              Thêm câu hỏi
            </button>
          </div>
          {selectedQuestions.length === 0 ? (
            <div className="mt-2.5 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
              Chưa có câu hỏi nào được chọn.
            </div>
          ) : (
            <div className="mt-2.5 grid gap-2">
              {selectedQuestions.map((question, index) => (
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5" key={question.id}>
                  <span className="text-sm font-semibold text-slate-800">
                    {index + 1}. {question.code} — {formatNullableText(question.questionText)}
                  </span>
                  <button
                    className="inline-flex h-8 items-center justify-center rounded-full border border-red-200 px-3 text-xs font-bold text-red-600 hover:bg-red-50"
                    onClick={() =>
                      setSelectedQuestions((current) => current.filter((item) => item.id !== question.id))
                    }
                    type="button"
                  >
                    Bỏ
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            className="inline-flex h-10.5 items-center justify-center rounded-full bg-indigo-600 px-5 text-sm font-bold text-white disabled:opacity-60"
            disabled={createMutation.isPending}
            onClick={handleSubmit}
            type="button"
          >
            Tạo bài trên lớp
          </button>
        </div>
      </div>

      {showQuestionPicker ? (
        <QuestionPicker
          onClose={() => setShowQuestionPicker(false)}
          onSelect={(question) => {
            setSelectedQuestions((current) =>
              current.some((item) => item.id === question.id) ? current : [...current, question],
            )
          }}
          scope="teacher"
          selectedQuestionIds={selectedQuestions.map((question) => question.id)}
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
  const [showQuestionPicker, setShowQuestionPicker] = useState(false)
  const { confirm, dialog } = useConfirmationDialog()

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.all })
  }

  async function handleAddQuestion(questionId: string) {
    if (!exam) {
      return
    }
    const existingIds = exam.papers[0]?.sections.flatMap((section) => section.items.map((item) => item.questionId)).filter(Boolean) as string[] ?? []
    if (existingIds.includes(questionId)) {
      return
    }
    await updateQuestionsMutation.mutateAsync({ examId: exam.id, payload: { questionIds: [...existingIds, questionId] } })
    await invalidate()
    setMessage('Đã thêm câu hỏi vào bài trên lớp.')
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
          {canManage ? (
            <div className="flex justify-end">
              <button
                className="inline-flex h-9.5 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-[13px] font-semibold text-indigo-600 hover:bg-slate-50"
                onClick={() => setShowQuestionPicker(true)}
                type="button"
              >
                <Plus aria-hidden="true" className="size-4" />
                Thêm câu hỏi
              </button>
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

      {showQuestionPicker ? (
        <QuestionPicker
          onClose={() => setShowQuestionPicker(false)}
          onSelect={(question) => void handleAddQuestion(question.id)}
          scope="teacher"
          selectedQuestionIds={
            (exam.papers[0]?.sections.flatMap((section) => section.items.map((item) => item.questionId)).filter(Boolean) as string[]) ?? []
          }
        />
      ) : null}

      {tab === 'students' ? <CandidatesTab examId={exam.id} /> : null}

      {tab === 'blueprint' ? (
        <BlueprintAttachPanel
          blueprintId={exam.blueprintId}
          blueprintVersionId={exam.blueprintVersionId}
          canManage={canManage}
          examId={exam.id}
          onOpenBlueprint={(blueprintId) => navigate(`/teacher/blueprints/${blueprintId}`)}
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
