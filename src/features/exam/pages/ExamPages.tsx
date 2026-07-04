import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Calendar,
  Check,
  CircleCheck,
  ClipboardList,
  Clock4,
  FilePenLine,
  Hash,
  Languages,
  LayoutList,
  PlayCircle,
  Plus,
  Rocket,
  Trash2,
  Users,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
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
import { MembersTab } from '../components/MembersTab'
import { PaperCard } from '../components/PaperCard'
import { ScheduleTab } from '../components/schedule/ScheduleTab'
import { WorkflowTrackerCard } from '../components/WorkflowTrackerCard'
import { examQueryKeys, useExamQuery, useExamStatsQuery, useExamsQuery } from '../api/useExamQueries'
import {
  useCreateExamMutation,
  useCreateExamPaperMutation,
  useDeleteExamMutation,
  useUpdateExamPaperStatusMutation,
  useUpdateExamStatusMutation,
} from '../api/useExamMutations'
import {
  formatDateTime,
  formatNullableText,
  getExamStatusDisplay,
  getExamPaperStatusDisplay,
  type ExamDto,
  type ExamStatus,
} from '../types'

const STATUS_FILTERS: Array<{ label: string; value: '' | ExamStatus }> = [
  { label: 'Tất cả', value: '' },
  { label: 'Bản nháp', value: 'DRAFT' },
  { label: 'Đã lên lịch', value: 'SCHEDULED' },
  { label: 'Đang diễn ra', value: 'IN_PROGRESS' },
  { label: 'Đã công bố kết quả', value: 'RESULTS_PUBLISHED' },
]

function getExamWorkflowSteps(exam: ExamDto): { completedCount: number; steps: WorkflowStep[] } {
  const step1Done = Boolean(exam.blueprintId)
  const step2Done = Boolean(exam.blueprintVersionId)
  const totalPapers = exam.papers.length
  const lockedPapers = exam.papers.filter((paper) => paper.status === 'LOCKED').length
  const step3Done = step2Done && totalPapers > 0 && lockedPapers === totalPapers
  const step4Done = exam.status === 'RESULTS_PUBLISHED' || exam.status === 'CLOSED'

  const steps: WorkflowStep[] = [
    {
      icon: step1Done ? <Check size={26} /> : <LayoutList size={24} />,
      label: 'Gắn blueprint',
      state: step1Done ? 'done' : 'current',
      sublabel: step1Done ? 'Hoàn tất' : 'Chưa gắn blueprint',
    },
    {
      icon: step2Done ? <Check size={26} /> : <LayoutList size={24} />,
      label: 'Chốt phiên bản',
      state: !step1Done ? 'upcoming' : step2Done ? 'done' : 'current',
      sublabel: step2Done ? 'Đã chốt' : 'Chờ CHAIR chốt phiên bản',
    },
    {
      icon: step3Done ? <Check size={26} /> : <FilePenLine size={24} />,
      label: 'Soạn & duyệt đề',
      state: !step2Done ? 'upcoming' : step3Done ? 'done' : 'current',
      sublabel: totalPapers ? `${lockedPapers} / ${totalPapers} mã đề đã khóa` : undefined,
    },
    {
      icon: step4Done ? <Check size={26} /> : <Rocket size={24} />,
      label: 'Vận hành thi',
      state: !step3Done ? 'upcoming' : step4Done ? 'done' : 'current',
      sublabel: step4Done ? 'Đã công bố kết quả' : 'Lên lịch → công bố',
    },
  ]

  return { completedCount: [step1Done, step2Done, step3Done, step4Done].filter(Boolean).length, steps }
}

type ExamListPageProps = {
  allowCreate: boolean
  basePath: string
  title: string
}

function ExamListPage({ allowCreate, basePath, title }: ExamListPageProps) {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<'' | ExamStatus>('')
  const statsQuery = useExamStatsQuery()
  const examsQuery = useExamsQuery({ page, size: 10, status })

  return (
    <section className="mx-auto max-w-290">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-extrabold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-2 text-[15px] text-slate-500">
            Theo dõi tiến độ từng kỳ thi và biết ngay bước cần làm tiếp theo.
          </p>
        </div>
        {allowCreate ? (
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-linear-to-r from-indigo-600 to-cyan-500 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:opacity-90"
            onClick={() => navigate('/school-admin/exams/create')}
            type="button"
          >
            <Plus aria-hidden="true" className="size-4.5" />
            Tạo kỳ thi
          </button>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <StatCard icon={<ClipboardList size={19} />} iconTone="indigo" label="Tổng kỳ thi" value={statsQuery.data?.total ?? '-'} />
        <StatCard icon={<PlayCircle size={19} />} iconTone="violet" label="Đang diễn ra" value={statsQuery.data?.inProgress ?? '-'} />
        <StatCard icon={<Clock4 size={19} />} iconTone="amber" label="Chờ xử lý" value={statsQuery.data?.pending ?? '-'} />
        <StatCard icon={<CircleCheck size={19} />} iconTone="emerald" label="Đã công bố" value={statsQuery.data?.published ?? '-'} />
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
        {examsQuery.data?.content.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
            Không có kỳ thi phù hợp.
          </div>
        ) : (
          examsQuery.data?.content.map((exam) => {
            const statusDisplay = getExamStatusDisplay(exam.status)
            const { steps } = getExamWorkflowSteps(exam)
            const metaItems = [
              { icon: <Hash aria-hidden="true" className="size-3.5" />, label: exam.code },
              exam.blueprintId
                ? { icon: <LayoutList aria-hidden="true" className="size-3.5" />, label: formatNullableText(exam.description) }
                : { icon: <Clock4 aria-hidden="true" className="size-3.5" />, label: 'Chưa gắn blueprint', tone: 'warning' as const },
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

      {examsQuery.data ? (
        <Pagination
          currentPage={page}
          itemName="kỳ thi"
          onPageChange={setPage}
          totalElements={examsQuery.data.totalElements}
          totalPages={examsQuery.data.totalPages}
        />
      ) : null}
    </section>
  )
}

export function TeacherExamsPage() {
  return <ExamListPage allowCreate={false} basePath="/teacher/exams" title="Kiểm tra tập trung" />
}

export function SchoolAdminExamsPage() {
  return <ExamListPage allowCreate basePath="/school-admin/exams" title="Kiểm tra tập trung" />
}

export function SchoolAdminExamCreatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const createMutation = useCreateExamMutation()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const { confirm, dialog } = useConfirmationDialog()

  async function handleSubmit() {
    if (!name.trim() || !code.trim()) {
      window.alert('Vui lòng nhập tên và mã kỳ thi.')
      return
    }
    if (!(await confirm({ message: 'Bạn có chắc muốn tạo kỳ thi này không?' }))) {
      return
    }
    await createMutation.mutateAsync({ code: code.trim(), description: description || null, languageId: 'lang-en', name })
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.all })
    navigate('/school-admin/exams')
  }

  return (
    <section className="mx-auto max-w-160">
      <h1 className="text-[26px] font-extrabold text-slate-900">Tạo kỳ thi</h1>
      <p className="mt-1.5 text-sm text-slate-500">Nhập thông tin cơ bản, sau đó gắn blueprint và thêm hội đồng đề.</p>
      {dialog}

      <div className="mt-5 grid gap-4 rounded-2xl border border-slate-200 bg-white p-6">
        <label className="grid gap-1.5 text-sm font-bold text-slate-700">
          Tên kỳ thi
          <input
            className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-900"
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-slate-700">
          Mã kỳ thi
          <input
            className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-900"
            onChange={(event) => setCode(event.target.value)}
            placeholder="VD: EXAM-2025-K11"
            value={code}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-slate-700">
          Mô tả
          <textarea
            className="min-h-24 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-900"
            onChange={(event) => setDescription(event.target.value)}
            value={description}
          />
        </label>
        <div className="flex justify-end">
          <button
            className="inline-flex h-10.5 items-center justify-center rounded-full bg-indigo-600 px-5 text-sm font-bold text-white disabled:opacity-60"
            disabled={createMutation.isPending}
            onClick={() => void handleSubmit()}
            type="button"
          >
            Tạo kỳ thi
          </button>
        </div>
      </div>
    </section>
  )
}

type ExamDetailPageProps = {
  basePath: string
  canManageInfo: boolean
  canManageMembers: boolean
  canManagePapers: boolean
  canManageStatus: boolean
}

type ExamDetailTab = 'blueprint' | 'papers' | 'people' | 'schedule' | 'students'

function ExamDetailPage({ basePath, canManageInfo, canManageMembers, canManagePapers, canManageStatus }: ExamDetailPageProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { examId } = useParams()
  const examQuery = useExamQuery(examId ?? null)
  const exam = examQuery.data
  const createPaperMutation = useCreateExamPaperMutation()
  const updatePaperStatusMutation = useUpdateExamPaperStatusMutation()
  const updateStatusMutation = useUpdateExamStatusMutation()
  const deleteMutation = useDeleteExamMutation()
  const [tab, setTab] = useState<ExamDetailTab>('papers')
  const [message, setMessage] = useState<string | null>(null)
  const { confirm, dialog } = useConfirmationDialog()

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.all })
  }

  if (examQuery.isLoading) {
    return <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Đang tải…</section>
  }

  if (!exam) {
    return <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">Không tìm thấy kỳ thi.</section>
  }

  const statusDisplay = getExamStatusDisplay(exam.status)
  const { completedCount, steps } = getExamWorkflowSteps(exam)
  const totalPapers = exam.papers.length
  const lockedPapers = exam.papers.filter((paper) => paper.status === 'LOCKED').length

  const nextAction =
    completedCount === 0
      ? { ctaLabel: 'Gắn blueprint', description: 'Chọn blueprint ở tab Blueprint để bắt đầu.', onClick: () => setTab('blueprint'), title: 'Chưa gắn blueprint' }
      : completedCount === 1
        ? { ctaLabel: 'Chốt phiên bản', description: 'Chọn phiên bản đã xuất bản để CHAIR chốt dùng cho kỳ thi.', onClick: () => setTab('blueprint'), title: 'Chờ CHAIR chốt phiên bản' }
        : completedCount === 2
          ? {
              ctaLabel: 'Mở đề thi',
              description: totalPapers ? `${lockedPapers}/${totalPapers} mã đề đã khóa. Duyệt và khóa các mã đề còn lại.` : 'Tạo mã đề để bắt đầu soạn.',
              onClick: () => setTab('papers'),
              title: 'Duyệt và khóa các mã đề còn lại',
            }
          : completedCount === 3
            ? { ctaLabel: 'Mở phân lịch', description: 'Xếp ca thi, phòng thi và giám thị để vận hành kỳ thi.', onClick: () => setTab('schedule'), title: 'Chuyển sang vận hành thi' }
            : null

  return (
    <section className="mx-auto max-w-260">
      <button
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600"
        onClick={() => navigate(-1)}
        type="button"
      >
        ← Kiểm tra tập trung
      </button>

      <FeedbackToast message={message} onClose={() => setMessage(null)} tone="success" />
      {dialog}

      <DetailHeaderCard
        metaItems={[
          { icon: <Hash aria-hidden="true" className="size-3.5" />, label: exam.code },
          { icon: <ClipboardList aria-hidden="true" className="size-3.5" />, label: 'Thi tập trung' },
          { icon: <Languages aria-hidden="true" className="size-3.5" />, label: 'Tiếng Anh' },
          { icon: <Calendar aria-hidden="true" className="size-3.5" />, label: `${formatDateTime(exam.openAt)} – ${formatDateTime(exam.closeAt)}` },
        ]}
        onEdit={canManageInfo ? () => setMessage('Chỉnh sửa thông tin sẽ sớm ra mắt.') : undefined}
        statusLabel={statusDisplay.label}
        statusTone={statusDisplay.tone}
        title={exam.name}
      />

      <WorkflowTrackerCard completedCount={completedCount} nextAction={nextAction} steps={steps} totalCount={4} />

      <div className="mt-5.5">
        <TabPillGroup
          items={[
            { label: 'Đề bài', value: 'papers' },
            { label: 'Phân công', value: 'people' },
            { label: 'Học sinh', value: 'students' },
            { label: 'Blueprint', value: 'blueprint' },
            { icon: <Users aria-hidden="true" className="size-4" />, label: 'Phân lịch', value: 'schedule' },
          ]}
          onChange={setTab}
          value={tab}
        />
      </div>

      {tab === 'papers' ? (
        <div className="mt-4 grid gap-3.5">
          {canManagePapers ? (
            <div className="flex justify-end">
              <button
                className="inline-flex h-9.5 items-center justify-center gap-1.5 rounded-full bg-linear-to-r from-indigo-600 to-cyan-500 px-4 text-[13px] font-semibold text-white"
                onClick={() =>
                  void createPaperMutation.mutateAsync(exam.id).then(() => invalidate())
                }
                type="button"
              >
                <Plus aria-hidden="true" className="size-4" />
                Tạo mã đề
              </button>
            </div>
          ) : null}
          {exam.papers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
              Chưa có mã đề nào.
            </div>
          ) : (
            exam.papers.map((paper) => {
              const paperStatusDisplay = getExamPaperStatusDisplay(paper.status)
              const actions = canManagePapers
                ? paper.status === 'DRAFT'
                  ? [{ label: 'Nộp duyệt', onClick: () => void updatePaperStatusMutation.mutateAsync({ paperId: paper.id, payload: { action: 'SUBMIT' } }).then(() => invalidate()), tone: 'primary' as const }]
                  : paper.status === 'IN_REVIEW'
                    ? [{ label: 'Duyệt', onClick: () => void updatePaperStatusMutation.mutateAsync({ paperId: paper.id, payload: { action: 'APPROVE' } }).then(() => invalidate()), tone: 'primary' as const }]
                    : paper.status === 'APPROVED'
                      ? [{ label: 'Khóa mã đề', onClick: () => void updatePaperStatusMutation.mutateAsync({ paperId: paper.id, payload: { action: 'LOCK' } }).then(() => invalidate()), tone: 'primary' as const }]
                      : []
                : []
              return (
                <PaperCard
                  actions={actions}
                  key={paper.id}
                  onOpen={() => navigate(canManagePapers ? `/teacher/exam-papers/${paper.id}/edit` : `${basePath.replace(/\/exams$/, '')}/exam-papers/${paper.id}`)}
                  openLabel={canManagePapers ? 'Soạn đề' : 'Xem đề'}
                  paper={paper}
                  subtitle={paperStatusDisplay.label}
                />
              )
            })
          )}
        </div>
      ) : null}

      {tab === 'people' ? <MembersTab canManage={canManageMembers} examId={exam.id} members={exam.members} /> : null}

      {tab === 'students' ? <CandidatesTab examId={exam.id} /> : null}

      {tab === 'blueprint' ? (
        <BlueprintAttachPanel
          blueprintId={exam.blueprintId}
          blueprintVersionId={exam.blueprintVersionId}
          canManage={canManageInfo}
          examId={exam.id}
          onOpenBlueprint={(blueprintId) => navigate(`${basePath.replace(/\/exams$/, '')}/blueprints/${blueprintId}`)}
        />
      ) : null}

      {tab === 'schedule' ? (
        <ScheduleTab
          examId={exam.id}
          isClassTest={false}
          onGoToPapers={() => setTab('papers')}
          papers={exam.papers}
          unlocked={completedCount >= 3}
        />
      ) : null}

      {canManageStatus ? (
        <div className="mt-6 flex flex-wrap gap-2.5">
          {exam.status === 'DRAFT' && completedCount >= 3 ? (
            <button
              className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
              onClick={() =>
                void updateStatusMutation.mutateAsync({ examId: exam.id, payload: { action: 'SCHEDULE' } }).then(() => invalidate())
              }
              type="button"
            >
              Lên lịch kỳ thi
            </button>
          ) : null}
          {exam.status === 'SCHEDULED' ? (
            <button
              className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
              onClick={() =>
                void updateStatusMutation.mutateAsync({ examId: exam.id, payload: { action: 'START' } }).then(() => invalidate())
              }
              type="button"
            >
              Bắt đầu thi
            </button>
          ) : null}
          {exam.status === 'IN_PROGRESS' ? (
            <button
              className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
              onClick={() =>
                void updateStatusMutation.mutateAsync({ examId: exam.id, payload: { action: 'CLOSE' } }).then(() => invalidate())
              }
              type="button"
            >
              Đóng kỳ thi
            </button>
          ) : null}
          {exam.status === 'CLOSED' ? (
            <button
              className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
              onClick={() =>
                void updateStatusMutation.mutateAsync({ examId: exam.id, payload: { action: 'PUBLISH_RESULTS' } }).then(() => invalidate())
              }
              type="button"
            >
              Công bố kết quả
            </button>
          ) : null}
          <button
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-red-200 px-4 text-sm font-bold text-red-600 hover:bg-red-50"
            onClick={() => {
              void (async () => {
                if (!(await confirm({ message: 'Bạn có chắc muốn xóa kỳ thi này không?' }))) {
                  return
                }
                await deleteMutation.mutateAsync(exam.id)
                await invalidate()
                navigate(basePath)
              })()
            }}
            type="button"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Xóa kỳ thi
          </button>
        </div>
      ) : null}
    </section>
  )
}

export function TeacherExamDetailPage() {
  return (
    <ExamDetailPage
      basePath="/teacher/exams"
      canManageInfo={false}
      canManageMembers={false}
      canManagePapers
      canManageStatus={false}
    />
  )
}

export function SchoolAdminExamDetailPage() {
  return (
    <ExamDetailPage
      basePath="/school-admin/exams"
      canManageInfo
      canManageMembers
      canManagePapers={false}
      canManageStatus
    />
  )
}
