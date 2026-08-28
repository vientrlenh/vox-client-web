import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Calendar,
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
  Timer,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { useAppSelector } from '@/app/store/hooks'
import { useSupportedLanguagesQuery } from '@/features/languages/api/useSupportedLanguagesQuery'
import { Pagination } from '@/shared/components/Pagination'
import { isPlanLimitExceededApiError, toApiError } from '@/shared/api'
import { useConfirmationDialog } from '@/shared/ui/useConfirmationDialog'
import { FeedbackToast } from '@/shared/ui/FeedbackToast'
import { StatCard } from '@/shared/ui/StatCard'
import { TabPillGroup } from '@/shared/ui/TabPill'
import { DetailHeaderCard } from '@/shared/ui/DetailHeaderCard'
import { FilterChips } from '@/shared/ui/FilterChips'
import { WarningBanner } from '@/shared/ui/WarningBanner'
import { CandidatesTab } from '@/features/examCore/components/CandidatesTab'
import { ExamListRow } from '@/features/examCore/components/ExamListRow'
import { AiConfidenceThresholdField } from '@/features/examCore/components/AiConfidenceThresholdField'
import { ExamStreamSetupField } from '@/features/examCore/components/ExamStreamSetupField'
import { PaperCard } from '@/features/examCore/components/PaperCard'
import { ScheduleTab } from '@/features/examCore/components/schedule/ScheduleTab'
import { WorkflowTrackerCard } from '@/features/examCore/components/WorkflowTrackerCard'
import {
  examQueryKeys,
  useExamCandidatesQuery,
  useExamDetailBundleQuery,
  useExamSchedulesQuery,
} from '@/features/examCore/api/queries'
import {
  RubricPolicySelectField,
  type RubricPolicyChoice,
} from '@/features/examCore/components/RubricPolicySelectField'
import { formatScheduleProgressLabel } from '@/features/examCore/utils/scheduleProgress'
import {
  buildSubscriptionWindowError,
  getSubscriptionWindowBounds,
  hasActiveSubscriptionPeriod,
  NO_ACTIVE_SUBSCRIPTION_MESSAGE,
} from '@/features/examCore/utils/subscriptionWindow'
import { buildTimeQuotaWarning } from '@/features/examCore/utils/timeQuota'
import { useMySubscriptionQuery } from '@/features/subscription_school/api/useMySubscriptionQuery'
import {
  useCreateExamPaperMutation,
  useUpdateExamPaperStatusMutation,
} from '@/features/examCore/api/mutations'
import {
  formatDate,
  formatDateTime,
  formatDurationSeconds,
  formatNullableText,
  getExamPaperStatusDisplay,
  getResultDecisionMethodDisplay,
  isExamLockedForEditing,
  toIsoDateTime,
  type BlueprintNavState,
  type ExamStatus,
} from '@/features/examCore/types'
import {
  getCentralizedScheduleReadiness,
  getExamWorkflowSteps,
  type ExamDetailTab,
} from '../utils/examWorkflow'
import {
  resolveExamAuthority,
  resolvePaperActions,
  type ExamPaperAction,
} from '@/features/examCore/utils/examPermissions'
import { BlueprintAttachPanel } from '../components/BlueprintAttachPanel'
import { EditExamModal } from '../components/EditExamModal'
import { MembersTab } from '../components/MembersTab'
import { useExamStatsQuery, useExamsQuery } from '../api/useExamQueries'
import { useCreateExamMutation, useDeleteExamMutation, useUpdateExamStatusMutation } from '../api/useExamMutations'
import { EXAM_STREAM_SETUP_PAYLOAD, getExamStatusDisplay, type ExamMemberRole, type ExamStreamSetup } from '../types'

const PAPER_ACTION_LABEL: Record<ExamPaperAction, string> = {
  APPROVE: 'Duyệt',
  LOCK: 'Khóa mã đề',
  REOPEN: 'Mở lại để sửa',
  REQUEST_REVISION: 'Yêu cầu sửa lại',
  SUBMIT: 'Nộp duyệt',
}

/**
 * Lời xác nhận cho các thao tác đổi trạng thái kỳ thi. Chỉ liệt kê thao tác KHÔNG lùi lại
 * được -- SCHEDULE thì không có ở đây vì còn huỷ hoặc mở lại được.
 *
 * Nội dung bám đúng việc backend thật sự làm (UpdateExamStatusUseCase), nhất là chi tiết
 * người dùng không tự đoán ra: đóng kỳ thi sẽ CHẤM 0 cho thí sinh chưa làm hoặc nộp bài trống.
 */
const STATUS_ACTION_PROMPTS: Partial<
  Record<'CANCEL' | 'CLOSE' | 'PUBLISH_RESULTS' | 'SCHEDULE' | 'START', { confirmLabel: string; message: string; title: string }>
> = {
  CANCEL: {
    confirmLabel: 'Huỷ kỳ thi',
    message:
      'Huỷ kỳ thi sẽ huỷ toàn bộ ca thi đã xếp. Đây là trạng thái cuối — không mở lại, không lên lịch lại và không chấm được nữa.',
    title: 'Xác nhận huỷ kỳ thi',
  },
  CLOSE: {
    confirmLabel: 'Đóng kỳ thi',
    message:
      'Đóng kỳ thi sẽ đóng mọi ca thi và CHẤM 0 cho những thí sinh chưa làm hoặc nộp bài trống. Không mở lại được, chỉ còn chốt kết quả hoặc huỷ.',
    title: 'Xác nhận đóng kỳ thi',
  },
  START: {
    confirmLabel: 'Mở kỳ thi',
    message:
      'Mở kỳ thi sẽ chuyển sang trạng thái đang diễn ra và khoá đề lại — thí sinh bắt đầu làm bài được. Không quay lại trạng thái đã lên lịch.',
    title: 'Xác nhận mở kỳ thi',
  },
}

const ACTIVE_LANGUAGE_FILTERS = { isActive: 'active' as const, search: '' }

const STATUS_FILTERS: Array<{ label: string; value: '' | ExamStatus }> = [
  { label: 'Tất cả', value: '' },
  { label: 'Bản nháp', value: 'DRAFT' },
  { label: 'Đã lên lịch', value: 'SCHEDULED' },
  { label: 'Đang diễn ra', value: 'IN_PROGRESS' },
  { label: 'Đã công bố kết quả', value: 'RESULTS_PUBLISHED' },
]


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
        {/*
          Trước đây query lỗi và query đang tải đều rơi vào cùng một nhánh `data?.` -> trang trắng
          trơn, không phân biệt được "không có kỳ thi nào" với "gọi API hỏng".
        */}
        {examsQuery.isError ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-10 text-center">
            <p className="text-sm font-semibold text-red-700">
              Không tải được danh sách kỳ thi: {toApiError(examsQuery.error).message}
            </p>
            <button
              className="text-sm font-bold text-indigo-600 underline"
              onClick={() => void examsQuery.refetch()}
              type="button"
            >
              Thử lại
            </button>
          </div>
        ) : examsQuery.isLoading ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
            Đang tải…
          </div>
        ) : examsQuery.data?.content.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
            Không có kỳ thi phù hợp.
          </div>
        ) : (
          examsQuery.data?.content.map((exam) => {
            const statusDisplay = getExamStatusDisplay(exam.status)
            // Không truyền schedules/candidates: query danh sách đã chọn sẵn `candidateCount` và
            // `schedules { status }`, nên thanh tiến độ ở đây khớp đúng với trang chi tiết.
            const { completedCount, currentStep, steps, summary, totalCount } = getExamWorkflowSteps(exam, exam.papers)
            const metaItems = [
              { icon: <Hash aria-hidden="true" className="size-3.5" />, label: exam.code },
              exam.blueprintId
                ? { icon: <LayoutList aria-hidden="true" className="size-3.5" />, label: formatNullableText(exam.description) }
                : { icon: <Clock4 aria-hidden="true" className="size-3.5" />, label: 'Chưa gắn khung đề', tone: 'warning' as const },
              // Ba con số dưới đây là phần "kỳ thi đã tới đâu": mã đề, thí sinh, ca thi. Để tone mặc
              // định — bước đang kẹt đã được thanh tiến độ và dòng "Tiếp theo" chỉ ra rồi.
              {
                icon: <FilePenLine aria-hidden="true" className="size-3.5" />,
                label: summary.paperCount
                  ? `${summary.lockedPaperCount}/${summary.paperCount} mã đề đã khóa`
                  : 'Chưa có mã đề',
              },
              {
                icon: <UserPlus aria-hidden="true" className="size-3.5" />,
                label: summary.candidateCount ? `${summary.candidateCount} thí sinh` : 'Chưa có thí sinh',
              },
              {
                icon: <Calendar aria-hidden="true" className="size-3.5" />,
                label: summary.scheduleProgress
                  ? formatScheduleProgressLabel(summary.scheduleProgress)
                  : 'Chưa có ca thi',
              },
            ]
            return (
              <ExamListRow
                key={exam.id}
                metaItems={metaItems}
                onClick={() => navigate(`${basePath}/${exam.id}`)}
                progress={{
                  completedCount,
                  currentLabel: currentStep?.label ?? null,
                  currentSublabel: currentStep?.sublabel,
                  totalCount,
                }}
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
  const languagesQuery = useSupportedLanguagesQuery(1, 100, ACTIVE_LANGUAGE_FILTERS)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [confidenceThreshold, setConfidenceThreshold] = useState<number | null>(null)
  const [languageId, setLanguageId] = useState('')
  const [openAt, setOpenAt] = useState('')
  const [closeAt, setCloseAt] = useState('')
  // Chọn tại chỗ (Rubric -> phiên bản -> chính sách), không điều hướng đi trang khác: rời trang giữa
  // chừng thì mọi ô đã điền phải tự gói vào history state mới sống sót, và trường nào quên gói là mất
  // dữ liệu âm thầm.
  const [policyChoice, setPolicyChoice] = useState<RubricPolicyChoice>({
    assessmentPolicyId: null,
    isBlocked: true,
    rubricVersionId: null,
  })
  // Mặc định mức giám sát đầy đủ, không phải "không giám sát": mặc định phải là phương án an toàn
  // và việc hạ nó xuống phải là hành động có ý thức.
  const [streamSetup, setStreamSetup] = useState<ExamStreamSetup>('BOTH_REQUIRED')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  // Retry vô nghĩa với lỗi này (gói đã hết hạn) — cần CTA điều hướng đi gia hạn thay vì toast chung.
  const [isPlanLimitError, setIsPlanLimitError] = useState(false)
  const { confirm, dialog } = useConfirmationDialog()

  // Khung mở/đóng của kỳ thi là ràng buộc ngoài của mọi ca thi, nên nó phải nằm trong hạn gói --
  // BE chặn ở SubscriptionPeriodGuardService, đây là lớp chặn trước.
  const subscription = useMySubscriptionQuery().data
  const subscriptionBounds = getSubscriptionWindowBounds(subscription)
  const hasSubscriptionPeriod = hasActiveSubscriptionPeriod(subscription)

  // Không có gói đang hoạt động thì BE từ chối thẳng (422) -- chặn ngay ở nút thay vì để người dùng
  // điền hết form rồi mới biết.
  const canSubmit = !policyChoice.isBlocked && hasSubscriptionPeriod

  async function handleSubmit() {
    setErrorMessage(null)
    setIsPlanLimitError(false)
    if (!name.trim() || !code.trim() || !languageId) {
      setErrorMessage('Vui lòng nhập tên, mã kỳ thi và ngôn ngữ.')
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
    // Kẹp min/max ở picker chỉ chặn thao tác chọn, không chặn giá trị gõ/dán tay -- phải kiểm lại.
    const subscriptionWindowError = buildSubscriptionWindowError(openAtIso, closeAtIso, subscription)
    if (subscriptionWindowError) {
      setErrorMessage(subscriptionWindowError)
      return
    }
    if (!policyChoice.assessmentPolicyId) {
      setErrorMessage(
        policyChoice.rubricVersionId
          ? 'Vui lòng chọn chính sách đánh giá cho phiên bản thang đánh giá đã chọn.'
          : 'Vui lòng chọn thang đánh giá, phiên bản và chính sách đánh giá.',
      )
      return
    }
    if (!(await confirm({ message: 'Bạn có chắc muốn tạo kỳ thi này không?' }))) {
      return
    }
    try {
      await createMutation.mutateAsync({
        assessmentPolicyId: policyChoice.assessmentPolicyId,
        closeAt: closeAtIso,
        code: code.trim(),
        description: description || null,
        languageId,
        // CENTRALIZED luôn dùng OTP và mỗi thí sinh 1 lượt duy nhất - không cho nhập tay (mục H.8).
        maxAttempt: 1,
        name,
        openAt: openAtIso,
        requiresOtp: true,
        aiConfidenceThresholdPercent: confidenceThreshold,
        // Chỉ 1 lượt thi nên mọi cách chốt điểm đều cho ra cùng kết quả — cố định HIGHEST thay vì
        // bắt người dùng chọn giữa 5 phương án tương đương.
        resultDecisionMethod: 'HIGHEST',
        // Qua bảng map, không gán tay hai trường: server chỉ nhận đúng 5 tổ hợp và mọi tổ hợp khác
        // trả về 400.
        ...EXAM_STREAM_SETUP_PAYLOAD[streamSetup],
      })
      // Không await: kết quả refetch bị vứt đi ngay khi điều hướng.
      void queryClient.invalidateQueries({ queryKey: examQueryKeys.all })
      navigate('/school-admin/exams')
    } catch (error) {
      setErrorMessage(toApiError(error).message)
      setIsPlanLimitError(isPlanLimitExceededApiError(error))
    }
  }

  return (
    <section className="mx-auto max-w-160">
      <h1 className="text-[26px] font-extrabold text-slate-900">Tạo kỳ thi</h1>
      <p className="mt-1.5 text-sm text-slate-500">Nhập thông tin cơ bản, sau đó gắn khung đề và thêm hội đồng đề.</p>
      <FeedbackToast message={errorMessage} onClose={() => setErrorMessage(null)} tone="error" />
      {isPlanLimitError ? (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-800">Trường chưa có gói subscription đang hoạt động.</p>
          <button
            type="button"
            onClick={() => navigate('/school-admin/subscription')}
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-amber-700"
          >
            Gia hạn ngay
          </button>
        </div>
      ) : null}
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
        {/* Bắt buộc: khung mở/đóng của kỳ thi là ràng buộc ngoài cho mọi ca thi (CreateScheduleModal
            lấy min/max từ đây). Bỏ trống thì phải mở modal sửa mới đặt lịch được. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-bold text-slate-700">
            Mở lúc
            <input
              className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-900"
              max={subscriptionBounds?.max}
              min={subscriptionBounds?.min}
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
              max={subscriptionBounds?.max}
              min={subscriptionBounds?.min}
              onChange={(event) => setCloseAt(event.target.value)}
              required
              type="datetime-local"
              value={closeAt}
            />
          </label>
        </div>
        {hasSubscriptionPeriod ? (
          <p className="-mt-2 text-xs font-medium text-slate-500">
            Kỳ thi phải nằm trong hạn gói dịch vụ của trường: {formatDate(subscription?.startDate)} –{' '}
            {formatDate(subscription?.endDate)}.
          </p>
        ) : (
          <WarningBanner message={NO_ACTIVE_SUBSCRIPTION_MESSAGE} />
        )}

        <AiConfidenceThresholdField onChange={setConfidenceThreshold} value={confidenceThreshold} />

        <ExamStreamSetupField
          description="Quyết định học viên phải chia sẻ những gì trong lúc thi."
          onChange={setStreamSetup}
          value={streamSetup}
        />

        <RubricPolicySelectField languageId={languageId} onChange={setPolicyChoice} requiresLanguage scope="school" />

        <div className="flex justify-end">
          <button
            className="inline-flex h-10.5 items-center justify-center rounded-full bg-indigo-600 px-5 text-sm font-bold text-white disabled:opacity-60"
            disabled={createMutation.isPending || !canSubmit}
            onClick={() => void handleSubmit()}
            title={
              policyChoice.isBlocked
                ? policyChoice.rubricVersionId
                  ? 'Chọn một chính sách đánh giá trước khi tạo'
                  : 'Chọn thang đánh giá, phiên bản và chính sách đánh giá trước khi tạo'
                : undefined
            }
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
}

// Trang blueprint quay lại đây kèm state này để mở lại đúng tab người dùng đang đứng.
type ExamDetailNavState = {
  tab?: ExamDetailTab
} | null

function ExamDetailPage({ basePath }: ExamDetailPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { examId } = useParams()
  const requestedTab = (location.state as ExamDetailNavState)?.tab ?? null
  const bundleQuery = useExamDetailBundleQuery(examId ?? null)
  const exam = bundleQuery.data?.exam
  const papers = exam?.papers ?? []
  const attachedBlueprint = exam?.blueprint ?? null
  const subscriptionQuery = useMySubscriptionQuery()
  const currentUser = useAppSelector((state) => state.auth.user)
  // `examMyRole` là String ở GraphQL; giá trị hợp lệ đúng bằng ExamMemberRole (null nếu không phải thành viên).
  const myRole = bundleQuery.data?.myRole as ExamMemberRole | null | undefined
  // Quyền không còn suy từ đường dẫn trang mà từ (vai trò toàn cục + vai trò trong chính kỳ thi này):
  // quản trị trường và chủ tịch hội đồng đều chạy trọn quy trình, chỉ khác vài ranh giới nhỏ.
  const authority = resolveExamAuthority({
    isSchoolAdmin: currentUser?.roles.includes('SCHOOL_ADMIN') ?? false,
    myRole,
  })
  // Cùng query key với ScheduleTab/CandidatesTab nên TanStack dùng chung cache — tab mở ra không refetch.
  // Cần ở đây để tính bước "Xếp học sinh"/"Xếp lịch" và lý do chặn nút lên lịch.
  const schedulesQuery = useExamSchedulesQuery(examId ?? null)
  const candidatesQuery = useExamCandidatesQuery(examId ?? null)
  const createPaperMutation = useCreateExamPaperMutation()
  const updatePaperStatusMutation = useUpdateExamPaperStatusMutation()
  const updateStatusMutation = useUpdateExamStatusMutation()
  const deleteMutation = useDeleteExamMutation()
  // Quay lại từ trang blueprint thì tab đã được chỉ định — coi như người dùng đã tự chọn tab để
  // hiệu ứng nhảy-về-bước-đang-dở bên dưới không hất họ sang tab khác.
  const [tab, setTab] = useState<ExamDetailTab | null>(requestedTab)
  const autoTabAppliedRef = useRef(requestedTab !== null)
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
        ? buildTimeQuotaWarning('Mã đề tạo từ khung đề', currentBlueprintVersion?.totalTimeLimitSeconds, maxTimePerAttemptMin)
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

  async function handleUpdatePaperStatus(paperId: string, action: ExamPaperAction) {
    try {
      await updatePaperStatusMutation.mutateAsync({ paperId, payload: { action } })
      await invalidate()
    } catch (error) {
      setErrorMessage(toApiError(error).message)
    }
  }

  /**
   * Chuyển trạng thái kỳ thi có thể hỏng vì nhiều lý do người dùng sửa được: `SCHEDULE`
   * chạy qua kiểm tra hạn mức gói (chưa có gói / quá số học sinh / hết token) và trả 422,
   * `START`/`CLOSE` thì kiểm tra ca thi và mã đề. Không bắt lỗi ở đây thì bấm nút xong
   * không có gì xảy ra và người dùng không biết vì sao.
   */
  async function handleStatusAction(
    forExamId: string,
    action: 'CANCEL' | 'CLOSE' | 'PUBLISH_RESULTS' | 'SCHEDULE' | 'START',
  ) {
    const prompt = STATUS_ACTION_PROMPTS[action]
    if (prompt && !(await confirm(prompt))) {
      return
    }
    try {
      await updateStatusMutation.mutateAsync({ examId: forExamId, payload: { action } })
      await invalidate()
    } catch (error) {
      setErrorMessage(toApiError(error).message)
    }
  }

  async function handleDeleteExam(forExamId: string) {
    if (!(await confirm({ message: 'Bạn có chắc muốn xóa kỳ thi này không?' }))) {
      return
    }
    try {
      await deleteMutation.mutateAsync(forExamId)
      await invalidate()
      navigate(basePath)
    } catch (error) {
      setErrorMessage(toApiError(error).message)
    }
  }

  // Truyền thẳng `.data` (undefined khi đang tải) chứ không phải `?? []` — mảng rỗng sẽ khiến tracker
  // nháy "chưa có thí sinh" trước khi dữ liệu về, còn undefined thì nó rơi về suy luận theo status.
  const workflow = exam ? getExamWorkflowSteps(exam, papers, schedulesQuery.data, candidatesQuery.data) : null
  const dataReady = Boolean(exam && schedulesQuery.data && candidatesQuery.data)
  const suggestedTab: ExamDetailTab = workflow?.currentStep?.tab ?? 'schedule'

  // Mở trang là nhảy thẳng vào tab của bước đang dở, nhưng chỉ đúng một lần: người dùng bấm tab khác
  // trong lúc ca thi/thí sinh còn đang tải thì không bị hất ngược lại.
  useEffect(() => {
    if (autoTabAppliedRef.current || !dataReady) {
      return
    }
    autoTabAppliedRef.current = true
    setTab(suggestedTab)
  }, [dataReady, suggestedTab])

  function selectTab(next: ExamDetailTab) {
    autoTabAppliedRef.current = true
    setTab(next)
  }

  if (bundleQuery.isLoading) {
    return <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Đang tải…</section>
  }

  if (!exam || !workflow) {
    return <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">Không tìm thấy kỳ thi.</section>
  }

  const activeTab: ExamDetailTab = tab ?? 'papers'
  const statusDisplay = getExamStatusDisplay(exam.status)
  const { completedCount, steps } = workflow
  const scheduleReadiness = getCentralizedScheduleReadiness(papers, schedulesQuery.data, candidatesQuery.data)
  const canManageSchedule = authority.canManageSchedule
  // Trang soạn/xem mã đề nằm dưới cùng tiền tố vai trò với trang này. Trỏ cứng sang /teacher như
  // trước là quản trị trường bị RequireRole xoá token và đá về /login.
  const paperBasePath = `${basePath.replace(/\/exams$/, '')}/exam-papers`
  // Từ IN_PROGRESS trở đi backend khóa sửa thông tin kỳ thi và mọi thao tác xếp lịch.
  const examLocked = isExamLockedForEditing(exam.status)
  // Quyền soạn mã đề = quyền vai trò AND kỳ thi chưa khóa. Kỳ thi đã bắt đầu thì mã đề là bằng chứng
  // của bài làm, sửa vào là làm lệch dữ liệu đã chấm.
  const canComposePaper = authority.canManagePapers && !examLocked
  const maxTimePerAttemptMin = subscriptionQuery.data?.plan?.maxTimePerAttemptMin ?? null
  const currentBlueprintVersion = attachedBlueprint?.versions.find((version) => version.id === exam.blueprintVersionId)
  const createFromBlueprintQuotaWarning = buildTimeQuotaWarning(
    'Mã đề tạo từ khung đề',
    currentBlueprintVersion?.totalTimeLimitSeconds,
    maxTimePerAttemptMin,
  )
  const selectedCopyPaper = copyFromPaperId ? papers.find((paper) => paper.id === copyFromPaperId) : null
  const copyQuotaWarning = buildTimeQuotaWarning('Mã đề sao chép', selectedCopyPaper?.timeDurationSeconds, maxTimePerAttemptMin)

  // Nút SCHEDULE giờ luôn hiện khi kỳ thi còn DRAFT (trước đây nó lặng lẽ biến mất) — thà disable kèm
  // lý do còn hơn để người dùng không biết mình đang thiếu gì.
  const primaryStatusAction =
    exam.status === 'DRAFT'
      ? {
          action: 'SCHEDULE' as const,
          disabledReason: scheduleReadiness.blockingReason,
          icon: <Calendar aria-hidden="true" className="size-4.5" />,
          label: 'Lên lịch kỳ thi',
        }
      : exam.status === 'SCHEDULED'
        ? { action: 'START' as const, disabledReason: null, icon: <PlayCircle aria-hidden="true" className="size-4.5" />, label: 'Bắt đầu thi' }
        : exam.status === 'IN_PROGRESS'
          ? { action: 'CLOSE' as const, disabledReason: null, icon: <Lock aria-hidden="true" className="size-4.5" />, label: 'Đóng kỳ thi' }
          : exam.status === 'CLOSED'
            ? { action: 'PUBLISH_RESULTS' as const, disabledReason: null, icon: <Megaphone aria-hidden="true" className="size-4.5" />, label: 'Công bố kết quả' }
            : null

  const currentStep = workflow.currentStep
  // Kỳ thi đã khóa thì mọi bước còn dở đều đã hết đường làm — tab tương ứng chỉ còn banner
  // "kỳ thi đã bắt đầu". Vẫn giữ nguyên thanh 5 bước để nhìn lại, chỉ bỏ lời mời bấm.
  const nextAction = examLocked
    ? null
    : currentStep
      ? {
          ctaLabel: currentStep.cta,
          description: currentStep.todo,
          onClick: () => selectTab(currentStep.tab),
          title: currentStep.label,
        }
      : exam.status === 'DRAFT' && scheduleReadiness.ready
        ? {
            ctaLabel: 'Lên lịch',
            description: 'Ca thi, thí sinh và mã đề đã đủ — bấm lên lịch để chốt kỳ thi.',
            onClick: () => void handleStatusAction(exam.id, 'SCHEDULE'),
            title: 'Sẵn sàng lên lịch',
          }
        : null

  return (
    <section className="mx-auto max-w-260">
      <button
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600"
        // Đi thẳng về danh sách đúng như nhãn nút, không lùi lịch sử: vào lại trang này từ trang
        // blueprint (hoặc từ form tạo kỳ thi) thì navigate(-1) sẽ quay ngược vào chính trang vừa rời.
        onClick={() => navigate(basePath)}
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
            {authority.canDeleteExam && !examLocked ? (
              <button
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-transparent px-3.5 text-sm font-bold text-red-600 transition hover:bg-red-50"
                onClick={() => void handleDeleteExam(exam.id)}
                type="button"
              >
                <Trash2 aria-hidden="true" className="size-4" />
                Xóa
              </button>
            ) : null}
            {authority.canManageStatus ? (
              <>
                {primaryStatusAction ? (
                  <button
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-linear-to-r from-indigo-600 to-cyan-500 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={Boolean(primaryStatusAction.disabledReason)}
                    onClick={() => void handleStatusAction(exam.id, primaryStatusAction.action)}
                    title={primaryStatusAction.disabledReason ?? undefined}
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
          // Hệ thống tự tính từ các mã đề. Hiện ra vì mọi ca thi phải dài tối thiểu bằng con số này.
          { icon: <Timer aria-hidden="true" className="size-3.5" />, label: `Thời gian làm bài: ${formatDurationSeconds(exam.examTimeDurationSecond)}` },
          { icon: <CircleCheck aria-hidden="true" className="size-3.5" />, label: `Cách chốt điểm: ${getResultDecisionMethodDisplay(exam.resultDecisionMethod)}` },
        ]}
        onEdit={authority.canManageInfo && !examLocked ? () => setShowEditModal(true) : undefined}
        statusLabel={statusDisplay.label}
        statusTone={statusDisplay.tone}
        title={exam.name}
      />

      {authority.canManageStatus && exam.status === 'DRAFT' && scheduleReadiness.blockingReason ? (
        <div className="mt-3.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-700">
          Chưa lên lịch được kỳ thi: {scheduleReadiness.blockingReason}
        </div>
      ) : null}

      <WorkflowTrackerCard
        completedCount={completedCount}
        nextAction={nextAction}
        steps={steps}
        totalCount={workflow.totalCount}
      />

      <div className="mt-5.5">
        <TabPillGroup
          // Cùng bộ icon với thanh quy trình thi (examWorkflow.tsx) để hai chỗ đọc ra một bước.
          items={[
            { icon: <Users aria-hidden="true" className="size-4" />, label: 'Phân công giáo viên', value: 'people' },
            { icon: <LayoutList aria-hidden="true" className="size-4" />, label: 'Chốt khung đề', value: 'blueprint' },
            { icon: <FilePenLine aria-hidden="true" className="size-4" />, label: 'Tạo mã đề', value: 'papers' },
            { icon: <UserPlus aria-hidden="true" className="size-4" />, label: 'Thêm thí sinh', value: 'students' },
            { icon: <Calendar aria-hidden="true" className="size-4" />, label: 'Xếp lịch', value: 'schedule' },
          ]}
          onChange={selectTab}
          value={activeTab}
        />
      </div>

      {activeTab === 'papers' ? (
        <div className="mt-4 grid gap-3.5">
          {authority.canManagePapers && examLocked ? (
            <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-semibold text-amber-800">
              <Lock aria-hidden="true" className="size-4 shrink-0" />
              Kỳ thi đã bắt đầu — không thể tạo, sao chép, soạn lại hay đổi trạng thái mã đề nữa. Chỉ còn
              xem lại nội dung đề.
            </div>
          ) : null}
          {canComposePaper ? (
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
                    {createPaperMutation.isPending ? 'Đang tạo…' : 'Tạo mã đề từ khung đề'}
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
              const isOwnPaper = Boolean(currentUser?.userId && paper.createdBy === currentUser.userId)
              // Chỉ hiện nút mà backend thật sự cho bấm. Nhánh LOCK từ DRAFT là đường tắt dành cho
              // người quyết định tự soạn đề — không có bước duyệt nào ở giữa để chờ.
              const actions = (
                examLocked
                  ? []
                  : resolvePaperActions({
                      authority,
                      isOwnPaper,
                      myRole,
                      paperStatus: paper.status,
                    })
              )
                // REQUEST_REVISION bắt buộc kèm góp ý, mà ô nhập góp ý chỉ có ở trang soạn đề — hiện
                // nút ở đây là bấm vào ăn 400. Người duyệt mở mã đề ra để viết góp ý.
                .filter((action) => action !== 'REQUEST_REVISION')
                .map((action) => {
                const blocksOnEmptySlots = action === 'SUBMIT' || (action === 'LOCK' && paper.status === 'DRAFT')
                return {
                  disabled: (blocksOnEmptySlots && isIncomplete) || Boolean(paperQuotaWarning),
                  label: PAPER_ACTION_LABEL[action],
                  onClick: () => void handleUpdatePaperStatus(paper.id, action),
                  title:
                    paperQuotaWarning ??
                    (blocksOnEmptySlots && isIncomplete
                      ? 'Còn ô câu hỏi chưa được gán — gán đủ trước khi chốt mã đề'
                      : undefined),
                  tone: (action === 'REOPEN' ? 'default' : 'primary') as 'default' | 'primary',
                }
              })
              return (
                <PaperCard
                  actions={actions}
                  maxTimePerAttemptMin={maxTimePerAttemptMin}
                  key={paper.id}
                  onOpen={() =>
                    navigate(
                      canComposePaper ? `${paperBasePath}/${paper.id}/edit` : `${paperBasePath}/${paper.id}`,
                      { state: { examId: exam.id, paperId: paper.id } },
                    )
                  }
                  openLabel={canComposePaper ? 'Soạn đề' : 'Xem đề'}
                  paper={paper}
                  subtitle={paperStatusDisplay.label}
                />
              )
            })
          )}
        </div>
      ) : null}

      {activeTab === 'people' ? (
        <MembersTab
          canManage={authority.canManageMembers}
          canManageChair={authority.canManageChairMembers}
          examId={exam.id}
          locked={examLocked}
          members={exam.members}
        />
      ) : null}

      {activeTab === 'students' ? (
        // `locked` chỉ khóa nhóm sửa danh sách; thao tác giám thị phải sống trong lúc thi nên
        // không được gộp `examLocked` vào `canManage`.
        <CandidatesTab
          canManage={canManageSchedule}
          examId={exam.id}
          examKind={exam.kind}
          locked={examLocked}
          papers={exam.papers}
        />
      ) : null}

      {activeTab === 'blueprint' ? (
        <BlueprintAttachPanel
          authority={authority}
          blueprintId={exam.blueprintId}
          blueprintVersionId={exam.blueprintVersionId}
          examId={exam.id}
          hasPapers={papers.length > 0}
          locked={examLocked}
          onCreateVersion={(blueprintId) =>
            navigate(`${basePath.replace(/\/exams$/, '')}/blueprints/${blueprintId}/versions/new`)
          }
          onOpenBlueprint={(blueprintId, versionId) => {
            const blueprintsBasePath = basePath.replace(/\/exams$/, '') + '/blueprints'
            // Trang blueprint dùng chung cho nhiều lối vào nên phải nói cho nó biết "quay lại" là về đâu:
            // vào từ kỳ thi thì "←" phải trả về đúng kỳ thi này (tab Chốt khung đề), không phải trang blueprint.
            navigate(
              versionId ? `${blueprintsBasePath}/${blueprintId}/versions/${versionId}` : `${blueprintsBasePath}/${blueprintId}`,
              {
                state: {
                  returnLabel: exam.name,
                  returnState: { tab: 'blueprint' } satisfies ExamDetailNavState,
                  returnTo: `${basePath}/${exam.id}`,
                } satisfies BlueprintNavState,
              },
            )
          }}
        />
      ) : null}

      {activeTab === 'schedule' ? (
        <ScheduleTab
          canManage={canManageSchedule}
          examCloseAt={exam.closeAt}
          examId={exam.id}
          examOpenAt={exam.openAt}
          examTimeDurationSecond={exam.examTimeDurationSecond}
          isClassTest={false}
          locked={examLocked}
          onGoToPapers={() => selectTab('papers')}
          papers={papers}
          unlocked={workflow.done.papers}
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

// Hai trang giờ chỉ khác nhau ở tiền tố đường dẫn; quyền do resolveExamAuthority quyết định theo
// vai trò thật của người đăng nhập trong chính kỳ thi đó.
export function TeacherExamDetailPage() {
  return <ExamDetailPage basePath="/teacher/exams" />
}

export function SchoolAdminExamDetailPage() {
  return <ExamDetailPage basePath="/school-admin/exams" />
}
