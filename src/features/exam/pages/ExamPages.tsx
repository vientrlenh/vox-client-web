import { useRef, useState } from 'react'
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
  Lock,
  Megaphone,
  PlayCircle,
  Plus,
  Rocket,
  Trash2,
  X,
} from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { useSupportedLanguagesQuery } from '@/features/languages/api/useSupportedLanguagesQuery'
import { Pagination } from '@/shared/components/Pagination'
import { toApiError } from '@/shared/api'
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
import { ScheduleTab } from '@/features/examCore/components/schedule/ScheduleTab'
import { WorkflowTrackerCard } from '@/features/examCore/components/WorkflowTrackerCard'
import { examQueryKeys, useExamDetailBundleQuery } from '@/features/examCore/api/queries'
import { useMatchingSchoolAssessmentPoliciesQuery } from '@/features/examCore/api/assessmentPolicyQueries'
import { buildTimeQuotaWarning } from '@/features/examCore/utils/timeQuota'
import { useMySubscriptionQuery } from '@/features/subscription_school/api/useMySubscriptionQuery'
import {
  useCreateExamPaperMutation,
  useReleaseSecurePoolMutation,
  useSetExamDeliveryModeMutation,
  useUpdateExamPaperStatusMutation,
} from '@/features/examCore/api/mutations'
import {
  formatDate,
  formatDateTime,
  formatNullableText,
  getAssessmentPolicyStrictnessLabel,
  getExamPaperStatusDisplay,
  getResultDecisionMethodDisplay,
  RESULT_DECISION_METHODS,
  toDateTimeLocalValue,
  toIsoDateTime,
  type ExamDeliveryMode,
  type ExamDto,
  type ExamPaperDto,
  type ExamStatus,
  type ResultDecisionMethod,
} from '@/features/examCore/types'
import { BlueprintAttachPanel } from '../components/BlueprintAttachPanel'
import { MembersTab } from '../components/MembersTab'
import { useExamStatsQuery, useExamsQuery } from '../api/useExamQueries'
import { useCreateExamMutation, useDeleteExamMutation, useUpdateExamMutation, useUpdateExamStatusMutation } from '../api/useExamMutations'
import {
  EXAM_STREAM_SETUP_PAYLOAD,
  EXAM_STREAM_SETUPS,
  getExamStatusDisplay,
  type ExamStreamSetup,
} from '../types'

const ACTIVE_LANGUAGE_FILTERS = { isActive: 'active' as const, search: '' }

const STATUS_FILTERS: Array<{ label: string; value: '' | ExamStatus }> = [
  { label: 'Tất cả', value: '' },
  { label: 'Bản nháp', value: 'DRAFT' },
  { label: 'Đã lên lịch', value: 'SCHEDULED' },
  { label: 'Đang diễn ra', value: 'IN_PROGRESS' },
  { label: 'Đã công bố kết quả', value: 'RESULTS_PUBLISHED' },
]

function getExamWorkflowSteps(exam: ExamDto, papers: ExamPaperDto[]): { completedCount: number; steps: WorkflowStep[] } {
  const step1Done = Boolean(exam.blueprintId)
  const step2Done = Boolean(exam.blueprintVersionId)
  const totalPapers = papers.length
  const lockedPapers = papers.filter((paper) => paper.status === 'LOCKED').length
  const step3Done = step2Done && totalPapers > 0 && lockedPapers === totalPapers
  const step4Done = exam.status === 'RESULTS_PUBLISHED' || exam.status === 'CLOSED'

  const steps: WorkflowStep[] = [
    {
      icon: step1Done ? <Check size={26} /> : <LayoutList size={24} />,
      label: 'Khung đề',
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
      label: 'Đề bài',
      state: !step2Done ? 'upcoming' : step3Done ? 'done' : 'current',
      sublabel: totalPapers ? `${lockedPapers} / ${totalPapers} mã đề đã khóa` : undefined,
    },
    {
      icon: step4Done ? <Check size={26} /> : <Rocket size={24} />,
      label: 'Xếp lịch',
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
            const { steps } = getExamWorkflowSteps(exam, exam.papers)
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

type ExamCreateDraft = {
  code: string
  description: string
  languageId: string
  maxAttempt: string
  name: string
  resultDecisionMethod: ResultDecisionMethod
}

type SelectedRubricVersion = { code: string; id: string; name: string; version: number }

type ExamCreateLocationState = {
  draft?: ExamCreateDraft
  selectedRubricVersion?: SelectedRubricVersion
} | null

export function SchoolAdminExamCreatePage() {
  const location = useLocation()
  // key={location.key} forces a full remount whenever navigate() lands here with a fresh
  // history entry (e.g. returning from the rubric-version picker), so the useState
  // initializers below can pick up the new location.state instead of going stale.
  return <ExamCreateForm key={location.key} locationState={location.state as ExamCreateLocationState} />
}

function ExamCreateForm({ locationState }: { locationState: ExamCreateLocationState }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const createMutation = useCreateExamMutation()
  const languagesQuery = useSupportedLanguagesQuery(1, 100, ACTIVE_LANGUAGE_FILTERS)
  const [name, setName] = useState(locationState?.draft?.name ?? '')
  const [code, setCode] = useState(locationState?.draft?.code ?? '')
  const [description, setDescription] = useState(locationState?.draft?.description ?? '')
  const [languageId, setLanguageId] = useState(locationState?.draft?.languageId ?? '')
  const [maxAttempt] = useState(locationState?.draft?.maxAttempt ?? '1')
  const [resultDecisionMethod, setResultDecisionMethod] = useState<ResultDecisionMethod>(
    locationState?.draft?.resultDecisionMethod ?? 'HIGHEST',
  )
  const [selectedRubricVersion, setSelectedRubricVersion] = useState<SelectedRubricVersion | null>(
    locationState?.selectedRubricVersion ?? null,
  )
  const [manualPolicyId, setManualPolicyId] = useState<string | null>(null)
  // Mặc định mức giám sát đầy đủ, không phải "không giám sát": lựa chọn này không sửa được sau khi
  // tạo kỳ thi, nên mặc định phải là phương án an toàn và việc hạ nó xuống phải là hành động có ý thức.
  const [streamSetup, setStreamSetup] = useState<ExamStreamSetup>('BOTH_REQUIRED')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const { confirm, dialog } = useConfirmationDialog()

  const matchingPoliciesQuery = useMatchingSchoolAssessmentPoliciesQuery({
    languageId,
    rubricVersionId: selectedRubricVersion?.id,
  })
  const matchingPolicies = matchingPoliciesQuery.data ?? []
  // Chỉ 1 chính sách khớp -> tự dùng luôn; nhiều chính sách khớp -> chờ người dùng chọn tay.
  const assessmentPolicyId = matchingPolicies.length === 1 ? matchingPolicies[0].id : manualPolicyId
  const isResolvingPolicy = Boolean(selectedRubricVersion) && matchingPoliciesQuery.isLoading
  const hasNoMatchingPolicy = Boolean(selectedRubricVersion) && !isResolvingPolicy && matchingPolicies.length === 0
  const hasAmbiguousPolicy = Boolean(selectedRubricVersion) && !isResolvingPolicy && matchingPolicies.length > 1 && !manualPolicyId
  const canSubmit = !isResolvingPolicy && !hasAmbiguousPolicy

  function goToSelectRubricVersion() {
    navigate('/school-admin/rubric-versions/select', {
      state: {
        draft: { code, description, languageId, maxAttempt, name, resultDecisionMethod },
        languageId,
        returnTo: '/school-admin/exams/create',
      },
    })
  }

  function clearSelectedRubricVersion() {
    setSelectedRubricVersion(null)
    setManualPolicyId(null)
  }

  async function handleSubmit() {
    setErrorMessage(null)
    if (!name.trim() || !code.trim() || !languageId) {
      setErrorMessage('Vui lòng nhập tên, mã kỳ thi và ngôn ngữ.')
      return
    }
    if (!(await confirm({ message: 'Bạn có chắc muốn tạo kỳ thi này không?' }))) {
      return
    }
    try {
      await createMutation.mutateAsync({
        assessmentPolicyId,
        code: code.trim(),
        description: description || null,
        languageId,
        // CENTRALIZED luôn dùng OTP và mỗi thí sinh 1 lượt duy nhất - không cho nhập tay (mục H.8).
        maxAttempt: 1,
        name,
        requiresOtp: true,
        resultDecisionMethod,
        // Qua bảng map, không gán tay hai trường: server chỉ nhận đúng 5 tổ hợp và mọi tổ hợp khác
        // trả về 400.
        ...EXAM_STREAM_SETUP_PAYLOAD[streamSetup],
      })
      await queryClient.invalidateQueries({ queryKey: examQueryKeys.all })
      navigate('/school-admin/exams')
    } catch (error) {
      setErrorMessage(toApiError(error).message)
    }
  }

  return (
    <section className="mx-auto max-w-160">
      <h1 className="text-[26px] font-extrabold text-slate-900">Tạo kỳ thi</h1>
      <p className="mt-1.5 text-sm text-slate-500">Nhập thông tin cơ bản, sau đó gắn blueprint và thêm hội đồng đề.</p>
      <FeedbackToast message={errorMessage} onClose={() => setErrorMessage(null)} tone="error" />
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
        <label className="grid gap-1.5 text-sm font-bold text-slate-700">
          Ngôn ngữ
          <select
            className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-900"
            onChange={(event) => setLanguageId(event.target.value)}
            value={languageId}
          >
            <option value="">Chọn ngôn ngữ</option>
            {languagesQuery.data?.content.map((language) => (
              <option key={language.id} value={language.id}>
                {language.name ?? language.code ?? language.id}
              </option>
            ))}
          </select>
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

        <fieldset className="grid gap-1.5 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <legend className="text-sm font-bold text-slate-700">Giám sát thi</legend>
          <p className="text-xs text-slate-500">
            Quyết định học viên phải chia sẻ những gì trong lúc thi.{' '}
            <b className="text-slate-700">Không sửa được sau khi tạo kỳ thi.</b>
          </p>

          <div className="mt-1.5 grid gap-2">
            {EXAM_STREAM_SETUPS.map((option) => {
              const isSelected = streamSetup === option.value
              const isWarning = option.tone === 'warning'
              return (
                <label
                  className={`grid cursor-pointer grid-cols-[auto_1fr] items-start gap-2.5 rounded-lg border bg-white p-3 transition ${
                    isSelected
                      ? isWarning
                        ? 'border-amber-300 ring-2 ring-amber-100'
                        : 'border-indigo-300 ring-2 ring-indigo-100'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  key={option.value}
                >
                  <input
                    checked={isSelected}
                    className="mt-0.5 accent-indigo-600"
                    name="streamSetup"
                    onChange={() => setStreamSetup(option.value)}
                    type="radio"
                    value={option.value}
                  />
                  <span className="grid gap-0.5">
                    <span className="text-[13px] font-bold text-slate-900">{option.label}</span>
                    <span
                      className={`text-xs ${
                        isWarning && isSelected ? 'font-semibold text-amber-700' : 'text-slate-500'
                      }`}
                    >
                      {option.hint}
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <div className="grid gap-1.5 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <span className="text-sm font-bold text-slate-700">Phiên bản thang đánh giá (Rubric Version)</span>
          <p className="text-xs text-slate-500">
            Không bắt buộc — chọn để tự động gắn chính sách đánh giá phù hợp cho kỳ thi.
          </p>

          {!selectedRubricVersion ? (
            <button
              className="mt-1.5 inline-flex h-9.5 w-fit items-center justify-center rounded-full border border-indigo-200 bg-white px-4 text-[13px] font-bold text-indigo-600 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!languageId}
              onClick={goToSelectRubricVersion}
              title={!languageId ? 'Chọn ngôn ngữ trước' : undefined}
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
                  Chưa có chính sách đánh giá đã xuất bản cho phiên bản này với ngôn ngữ đã chọn. Vẫn có thể tạo kỳ
                  thi và gắn chính sách sau, hoặc chọn phiên bản khác.
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
                        Phiên bản {policy.version} · {getAssessmentPolicyStrictnessLabel(policy.strictness)} · Điểm đạt {policy.passingScore ?? '-'}
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

        <div className="flex justify-end">
          <button
            className="inline-flex h-10.5 items-center justify-center rounded-full bg-indigo-600 px-5 text-sm font-bold text-white disabled:opacity-60"
            disabled={createMutation.isPending || !canSubmit}
            onClick={() => void handleSubmit()}
            title={hasAmbiguousPolicy ? 'Chọn một chính sách đánh giá phù hợp trước khi tạo' : undefined}
            type="button"
          >
            Tạo kỳ thi
          </button>
        </div>
      </div>
    </section>
  )
}

type EditExamModalProps = {
  exam: ExamDto
  onClose: () => void
  onSaved: () => void
}

function EditExamModal({ exam, onClose, onSaved }: EditExamModalProps) {
  const updateMutation = useUpdateExamMutation()
  const [name, setName] = useState(exam.name)
  const [description, setDescription] = useState(exam.description ?? '')
  const [openAt, setOpenAt] = useState(toDateTimeLocalValue(exam.openAt))
  const [closeAt, setCloseAt] = useState(toDateTimeLocalValue(exam.closeAt))
  const [resultDecisionMethod, setResultDecisionMethod] = useState<ResultDecisionMethod>(
    exam.resultDecisionMethod ?? 'HIGHEST',
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit() {
    setErrorMessage(null)
    if (!name.trim()) {
      setErrorMessage('Vui lòng nhập tên kỳ thi.')
      return
    }
    try {
      await updateMutation.mutateAsync({
        examId: exam.id,
        payload: {
          closeAt: toIsoDateTime(closeAt),
          description: description || null,
          // CENTRALIZED luôn dùng OTP và mỗi thí sinh 1 lượt duy nhất - không cho nhập tay (mục H.8).
          maxAttempt: 1,
          name: name.trim(),
          openAt: toIsoDateTime(openAt),
          requiresOtp: true,
          resultDecisionMethod,
        },
      })
      onSaved()
    } catch (error) {
      setErrorMessage(toApiError(error).message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <section className="w-full max-w-md rounded-2xl bg-white shadow-2xl" role="dialog">
        <FeedbackToast message={errorMessage} onClose={() => setErrorMessage(null)} tone="error" />
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <h2 className="text-lg font-black text-slate-900">Sửa thông tin kỳ thi</h2>
          <button
            aria-label="Đóng"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
        <div className="grid gap-3.5 px-6 py-5">
          <label className="grid gap-1.5 text-sm font-bold text-slate-700">
            Tên kỳ thi
            <input
              className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-900"
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-slate-700">
            Mô tả
            <textarea
              className="min-h-20 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-900"
              onChange={(event) => setDescription(event.target.value)}
              value={description}
            />
          </label>
          <div className="grid gap-3.5 sm:grid-cols-2">
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
        <div className="flex justify-end gap-2.5 border-t border-slate-200 px-6 py-4">
          <button
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            Hủy
          </button>
          <button
            className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-bold text-white disabled:opacity-60"
            disabled={updateMutation.isPending}
            onClick={() => void handleSubmit()}
            type="button"
          >
            Lưu
          </button>
        </div>
      </section>
    </div>
  )
}

type ExamDetailPageProps = {
  basePath: string
  canManageInfo: boolean
  canManageMembers: boolean
  canManagePapers: boolean
  canManageStatus: boolean
  canReleaseSecurePool: boolean
}

type ExamDetailTab = 'assessment' | 'blueprint' | 'papers' | 'people' | 'schedule' | 'students'

function ExamDetailPage({
  basePath,
  canManageInfo,
  canManageMembers,
  canManagePapers,
  canManageStatus,
  canReleaseSecurePool,
}: ExamDetailPageProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { examId } = useParams()
  const bundleQuery = useExamDetailBundleQuery(examId ?? null)
  const exam = bundleQuery.data?.exam
  const papers = exam?.papers ?? []
  const attachedBlueprint = exam?.blueprint ?? null
  const subscriptionQuery = useMySubscriptionQuery()
  const myRole = bundleQuery.data?.myRole
  const createPaperMutation = useCreateExamPaperMutation()
  const updatePaperStatusMutation = useUpdateExamPaperStatusMutation()
  const updateStatusMutation = useUpdateExamStatusMutation()
  const deleteMutation = useDeleteExamMutation()
  const releaseSecurePoolMutation = useReleaseSecurePoolMutation()
  const setDeliveryModeMutation = useSetExamDeliveryModeMutation()
  const [tab, setTab] = useState<ExamDetailTab>('papers')
  const [message, setMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCopyPicker, setShowCopyPicker] = useState(false)
  const [copyFromPaperId, setCopyFromPaperId] = useState('')
  const createPaperLockedRef = useRef(false)
  const { confirm, dialog } = useConfirmationDialog()

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: examQueryKeys.all })
  }

  async function handleCreatePaper(forExamId: string, source: 'blueprint' | 'copy', copyFromPaperId: string | null) {
    const currentBlueprintVersion = attachedBlueprint?.versions.find((version) => version.id === exam?.blueprintVersionId)
    const sourcePaper = copyFromPaperId ? papers.find((paper) => paper.id === copyFromPaperId) : null
    const maxTimePerAttemptMin = subscriptionQuery.data?.plan?.maxTimePerAttemptMin ?? null
    const quotaWarning =
      source === 'blueprint'
        ? buildTimeQuotaWarning('Mã đề tạo từ blueprint', currentBlueprintVersion?.totalTimeLimitSeconds, maxTimePerAttemptMin)
        : buildTimeQuotaWarning('Mã đề sao chép', sourcePaper?.timeDurationSeconds, maxTimePerAttemptMin)
    if (quotaWarning) {
      setErrorMessage(`${quotaWarning} Không thể tạo mã đề vượt quota của trường.`)
      return
    }
    if (createPaperLockedRef.current || createPaperMutation.isPending) {
      return
    }
    createPaperLockedRef.current = true
    try {
      await createPaperMutation.mutateAsync({ examId: forExamId, payload: { copyFromPaperId, source } })
      await invalidate()
    } catch (error) {
      setErrorMessage(toApiError(error).message)
    } finally {
      createPaperLockedRef.current = false
    }
  }

  async function handleUpdatePaperStatus(paperId: string, action: 'APPROVE' | 'LOCK' | 'SUBMIT') {
    try {
      await updatePaperStatusMutation.mutateAsync({ paperId, payload: { action } })
      await invalidate()
    } catch (error) {
      setErrorMessage(toApiError(error).message)
    }
  }

  async function handleReleaseSecurePool(forExamId: string) {
    if (!(await confirm({ message: 'Bạn có chắc muốn mở khóa câu hỏi đề thi không?' }))) {
      return
    }
    try {
      await releaseSecurePoolMutation.mutateAsync(forExamId)
      await invalidate()
    } catch (error) {
      setErrorMessage(toApiError(error).message)
    }
  }

  async function handleSetDeliveryMode(forExamId: string, mode: ExamDeliveryMode) {
    try {
      await setDeliveryModeMutation.mutateAsync({ deliveryMode: mode, examId: forExamId })
      await invalidate()
    } catch (error) {
      setErrorMessage(toApiError(error).message)
    }
  }

  if (bundleQuery.isLoading) {
    return <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Đang tải…</section>
  }

  if (!exam) {
    return <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">Không tìm thấy kỳ thi.</section>
  }

  const statusDisplay = getExamStatusDisplay(exam.status)
  const { completedCount, steps } = getExamWorkflowSteps(exam, papers)
  const totalPapers = papers.length
  const lockedPapers = papers.filter((paper) => paper.status === 'LOCKED').length
  // Backend authorizes schedule/candidate management for SCHOOL_ADMIN (same school) or the exam's CHAIR.
  const canManageSchedule = canManageStatus || myRole === 'CHAIR'
  const maxTimePerAttemptMin = subscriptionQuery.data?.plan?.maxTimePerAttemptMin ?? null
  const currentBlueprintVersion = attachedBlueprint?.versions.find((version) => version.id === exam.blueprintVersionId)
  const createFromBlueprintQuotaWarning = buildTimeQuotaWarning(
    'Mã đề tạo từ blueprint',
    currentBlueprintVersion?.totalTimeLimitSeconds,
    maxTimePerAttemptMin,
  )
  const selectedCopyPaper = copyFromPaperId ? papers.find((paper) => paper.id === copyFromPaperId) : null
  const copyQuotaWarning = buildTimeQuotaWarning('Mã đề sao chép', selectedCopyPaper?.timeDurationSeconds, maxTimePerAttemptMin)

  const primaryStatusAction =
    exam.status === 'DRAFT' && completedCount >= 3
      ? { action: 'SCHEDULE' as const, icon: <Calendar aria-hidden="true" className="size-4.5" />, label: 'Lên lịch kỳ thi' }
      : exam.status === 'SCHEDULED'
        ? { action: 'START' as const, icon: <PlayCircle aria-hidden="true" className="size-4.5" />, label: 'Bắt đầu thi' }
        : exam.status === 'IN_PROGRESS'
          ? { action: 'CLOSE' as const, icon: <Lock aria-hidden="true" className="size-4.5" />, label: 'Đóng kỳ thi' }
          : exam.status === 'CLOSED'
            ? { action: 'PUBLISH_RESULTS' as const, icon: <Megaphone aria-hidden="true" className="size-4.5" />, label: 'Công bố kết quả' }
            : null

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
      <FeedbackToast message={errorMessage} onClose={() => setErrorMessage(null)} tone="error" />
      {dialog}

      <DetailHeaderCard
        actions={
          <>
            <button
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-slate-200 px-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              onClick={() => navigate(`${basePath.replace('/exams', '/exam-results')}?examId=${exam.id}`)}
              type="button"
            >
              <ClipboardList aria-hidden="true" className="size-4" />
              Xem kết quả
            </button>
            {canManageStatus ? (
              <>
                <button
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-transparent px-3.5 text-sm font-bold text-red-600 transition hover:bg-red-50"
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
                  Xóa
                </button>
                {primaryStatusAction ? (
                  <button
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-linear-to-r from-indigo-600 to-cyan-500 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:opacity-90"
                    onClick={() =>
                      void updateStatusMutation
                        .mutateAsync({ examId: exam.id, payload: { action: primaryStatusAction.action } })
                        .then(() => invalidate())
                    }
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
          { icon: <ClipboardList aria-hidden="true" className="size-3.5" />, label: 'Thi tập trung' },
          { icon: <Languages aria-hidden="true" className="size-3.5" />, label: 'Tiếng Anh' },
          { icon: <Calendar aria-hidden="true" className="size-3.5" />, label: `${formatDateTime(exam.openAt)} – ${formatDateTime(exam.closeAt)}` },
          { icon: <Clock4 aria-hidden="true" className="size-3.5" />, label: `Số lượt thi tối đa: ${exam.maxAttempt ?? 1}` },
          { icon: <CircleCheck aria-hidden="true" className="size-3.5" />, label: `Cách chốt điểm: ${getResultDecisionMethodDisplay(exam.resultDecisionMethod)}` },
        ]}
        onEdit={canManageInfo ? () => setShowEditModal(true) : undefined}
        statusLabel={statusDisplay.label}
        statusTone={statusDisplay.tone}
        title={exam.name}
      />

      <WorkflowTrackerCard completedCount={completedCount} nextAction={nextAction} steps={steps} totalCount={4} />

      <div className="mt-5.5">
        <TabPillGroup
          items={[
            { label: 'Phân công', value: 'people' },
            { label: 'Phương thức đánh giá', value: 'assessment' },
            { label: 'Blueprint', value: 'blueprint' },
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
          {canReleaseSecurePool && exam.securePool?.status === 'SEALED' ? (
            <div className="flex justify-end">
              <button
                className="inline-flex h-9.5 items-center justify-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-4 text-[13px] font-semibold text-amber-700 hover:bg-amber-100"
                onClick={() => void handleReleaseSecurePool(exam.id)}
                type="button"
              >
                Mở khóa câu hỏi đề thi
              </button>
            </div>
          ) : null}
          {canManagePapers && myRole === 'AUTHOR' ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {showCopyPicker ? (
                <>
                  <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pr-1.5 pl-3.5">
                    <span className="text-xs font-bold text-slate-500">Sao chép từ</span>
                    <select
                      className="h-8 rounded-full border border-slate-200 px-2.5 text-xs font-semibold text-slate-700"
                      onChange={(event) => setCopyFromPaperId(event.target.value)}
                      value={copyFromPaperId}
                    >
                      <option value="">Chọn mã đề…</option>
                      {papers.map((paper) => (
                        <option key={paper.id} value={paper.id}>
                          {paper.code}
                        </option>
                      ))}
                    </select>
                    <button
                      className="inline-flex h-8 items-center justify-center rounded-full bg-indigo-600 px-3.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!copyFromPaperId || createPaperMutation.isPending || Boolean(copyQuotaWarning)}
                      onClick={() => {
                        void handleCreatePaper(exam.id, 'copy', copyFromPaperId)
                        setShowCopyPicker(false)
                        setCopyFromPaperId('')
                      }}
                      title={copyQuotaWarning ?? undefined}
                      type="button"
                    >
                      {createPaperMutation.isPending ? 'Đang tạo…' : 'Sao chép'}
                    </button>
                    <button
                      aria-label="Hủy sao chép mã đề"
                      className="inline-flex size-8 items-center justify-center rounded-full text-slate-400 hover:text-slate-600"
                      onClick={() => {
                        setShowCopyPicker(false)
                        setCopyFromPaperId('')
                      }}
                      type="button"
                    >
                      <X aria-hidden="true" className="size-3.5" />
                    </button>
                  </div>
                  {copyQuotaWarning ? (
                    <div className="basis-full rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700">
                      {copyQuotaWarning} Không thể sao chép mã đề vượt quota của trường.
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  {papers.length > 0 ? (
                    <button
                      className="inline-flex h-9.5 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
                      onClick={() => setShowCopyPicker(true)}
                      type="button"
                    >
                      Sao chép mã đề
                    </button>
                  ) : null}
                  <button
                    className="inline-flex h-9.5 items-center justify-center gap-1.5 rounded-full bg-linear-to-r from-indigo-600 to-cyan-500 px-4 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={createPaperMutation.isPending || Boolean(createFromBlueprintQuotaWarning)}
                    onClick={() => void handleCreatePaper(exam.id, 'blueprint', null)}
                    title={createFromBlueprintQuotaWarning ?? undefined}
                    type="button"
                  >
                    <Plus aria-hidden="true" className="size-4" />
                    {createPaperMutation.isPending ? 'Đang tạo…' : 'Tạo mã đề từ blueprint'}
                  </button>
                  {createFromBlueprintQuotaWarning ? (
                    <div className="basis-full rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700">
                      {createFromBlueprintQuotaWarning} Không thể tạo mã đề vượt quota của trường.
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
          {papers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
              Chưa có mã đề nào.
            </div>
          ) : (
            papers.map((paper) => {
              const paperStatusDisplay = getExamPaperStatusDisplay(paper.status)
              const totalItems = paper.sections.reduce((sum, section) => sum + section.items.length, 0)
              const filledItems = paper.sections.reduce(
                (sum, section) => sum + section.items.filter((item) => item.questionId).length,
                0,
              )
              const isIncomplete = filledItems < totalItems
              const paperQuotaWarning = buildTimeQuotaWarning(`Mã đề ${paper.code}`, paper.timeDurationSeconds, maxTimePerAttemptMin)
              // CHAIR có toàn quyền của REVIEWER (approve) ngoài quyền lock riêng — khớp rule backend.
              const canSubmit = canManagePapers && myRole === 'AUTHOR'
              const canApprove = canManagePapers && (myRole === 'CHAIR' || myRole === 'REVIEWER')
              const canLock = canManagePapers && myRole === 'CHAIR'
              const actions =
                paper.status === 'DRAFT' && canSubmit
                  ? [
                      {
                        disabled: isIncomplete || Boolean(paperQuotaWarning),
                        label: 'Nộp duyệt',
                        onClick: () => void handleUpdatePaperStatus(paper.id, 'SUBMIT'),
                        title: paperQuotaWarning ?? (isIncomplete ? 'Còn ô câu hỏi chưa được gán — gán đủ trước khi nộp duyệt' : undefined),
                        tone: 'primary' as const,
                      },
                    ]
                  : paper.status === 'IN_REVIEW' && canApprove
                    ? [
                        {
                          disabled: Boolean(paperQuotaWarning),
                          label: 'Duyệt',
                          onClick: () => void handleUpdatePaperStatus(paper.id, 'APPROVE'),
                          title: paperQuotaWarning ?? undefined,
                          tone: 'primary' as const,
                        },
                      ]
                    : paper.status === 'APPROVED' && canLock
                      ? [
                          {
                            disabled: Boolean(paperQuotaWarning),
                            label: 'Khóa mã đề',
                            onClick: () => void handleUpdatePaperStatus(paper.id, 'LOCK'),
                            title: paperQuotaWarning ?? undefined,
                            tone: 'primary' as const,
                          },
                        ]
                      : []
              return (
                <PaperCard
                  actions={actions}
                  maxTimePerAttemptMin={maxTimePerAttemptMin}
                  key={paper.id}
                  onOpen={() =>
                    navigate(
                      canManagePapers ? `/teacher/exam-papers/${paper.id}/edit` : `${basePath.replace(/\/exams$/, '')}/exam-papers/${paper.id}`,
                      { state: { examId: exam.id, paperId: paper.id } },
                    )
                  }
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

      {tab === 'assessment' ? <AssessmentMethodTab /> : null}

      {tab === 'students' ? <CandidatesTab canManage={canManageSchedule} examId={exam.id} papers={papers} /> : null}

      {tab === 'blueprint' ? (
        <BlueprintAttachPanel
          blueprintId={exam.blueprintId}
          blueprintVersionId={exam.blueprintVersionId}
          examId={exam.id}
          hasPapers={papers.length > 0}
          members={exam.members}
          onCreateVersion={(blueprintId) =>
            navigate(`${basePath.replace(/\/exams$/, '')}/blueprints/${blueprintId}/versions/new`)
          }
          onOpenBlueprint={(blueprintId, versionId) => {
            const blueprintsBasePath = basePath.replace(/\/exams$/, '') + '/blueprints'
            navigate(versionId ? `${blueprintsBasePath}/${blueprintId}/versions/${versionId}` : `${blueprintsBasePath}/${blueprintId}`)
          }}
        />
      ) : null}

      {tab === 'schedule' ? (
        <ScheduleTab
          canManage={canManageSchedule}
          deliveryMode={exam.deliveryMode}
          examId={exam.id}
          isClassTest={false}
          onGoToPapers={() => setTab('papers')}
          onSetDeliveryMode={canManageSchedule ? (mode) => void handleSetDeliveryMode(exam.id, mode) : undefined}
          papers={papers}
          unlocked={completedCount >= 3}
        />
      ) : null}

      {showEditModal ? (
        <EditExamModal
          exam={exam}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            void invalidate()
            setShowEditModal(false)
          }}
        />
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
      canReleaseSecurePool
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
      canReleaseSecurePool={false}
    />
  )
}
