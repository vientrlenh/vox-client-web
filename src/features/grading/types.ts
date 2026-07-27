import type { StatusTone } from '@/shared/ui/StatusBadge'

// Enum BE dùng CHỮ HOA — dùng thẳng, không map qua chữ thường (chuẩn hoá tại một chỗ).
// BE cố tình chỉ có 2 trạng thái: nộp cả bài trong một lần nên KHÔNG có IN_PROGRESS.
export type GradingAssignmentStatus = 'ASSIGNED' | 'COMPLETED'

/**
 * Vòng chấm. Một bài đi qua nhiều vòng theo thời gian, mỗi vòng một dòng phân công
 * và tối đa một dòng đang mở. Thay cho cặp `GradingWorkKind` (GRADING/RECHECK) cũ.
 */
export type GradingRoundType = 'INITIAL' | 'SPOT_CHECK' | 'REMEDIATION' | 'APPEAL'

/** Kết luận của giáo viên khi đóng một phân công. */
export type GradingOutcome =
  | 'UPHELD'
  | 'REGRADED'
  | 'INVALIDATED'
  | 'CLEARED_INVALID'
  | 'DECLINED'

/** Cách chọn tập bài khi giao tự động. */
export type GradingSampleSelectionMode = 'ALL' | 'RANDOM_PERCENT' | 'RISK_BASED' | 'MANUAL_LIST'

/** Ai/cái gì đã đổi trạng thái một bài. */
export type ResultStatusChangeSource =
  | 'AI_EVALUATION'
  | 'TEACHER_INITIAL'
  | 'TEACHER_SPOT_CHECK'
  | 'TEACHER_REMEDIATION'
  | 'TEACHER_APPEAL'
  | 'ADMIN_BULK_FINALIZE'
  | 'EXAM_PUBLISH'
  | 'SYSTEM'

// Trạng thái bài nộp. Bài RELEASED vẫn hậu kiểm được — tiến độ nằm ở dòng phân công,
// không ở trạng thái bài, nên đừng suy "chấm được hay không" từ đây (dùng `editable`).
export type ExamCandidateResultStatus =
  | 'PENDING_REVIEW'
  | 'RELEASED'
  | 'APPEALED'
  | 'RE_GRADING'
  | 'FINAL'
  | 'INVALID'
  | 'RETAKE_REQUIRED'
  | 'PASSED'
  | 'FAILED'

// Một lượt hỏi-đáp. Một phần thi có NHIỀU lượt, mỗi lượt audio/transcript riêng.
export type GradingTurn = {
  id: string
  turnOrder?: number | null
  turnType?: string | null
  promptText?: string | null
  audioUrl?: string | null
  transcript?: string | null
  durationSeconds?: number | null
}

export type GradingCriterionScore = {
  criterionId: string
  criterionCode?: string | null
  label?: string | null
  score?: number | null
  rationale?: string | null
}

/**
 * Tiêu chí rubric kèm dải điểm THẬT. Ô nhập dựng từ minScore/maxScore ở đây —
 * KHÔNG hardcode 0–9, mỗi rubric một thang khác nhau.
 */
export type GradingCriterionMeta = {
  id: string
  code?: string | null
  label?: string | null
  description?: string | null
  minScore?: number | null
  maxScore?: number | null
  // Trọng số BE dùng để quy đổi điểm tiêu chí thành điểm phần thi. Hiển thị để
  // giáo viên biết tiêu chí nào nặng hơn; FE KHÔNG tự nhân — xem `useGradingPreviewQuery`.
  weight?: number | null
  required: boolean
}

export type GradingTaskItem = {
  paperItemId: string
  responseId: string
  partLabel?: string | null
  // Điểm của bản chấm đang có hiệu lực (lần đầu là bản AI) — mốc để đối chiếu.
  currentItemScore?: number | null
  currentFeedbackSummary?: string | null
  currentScores: GradingCriterionScore[]
  turns: GradingTurn[]
}

/** Màn chấm. KHÔNG có tên/ID học sinh — giáo viên chấm ẩn danh. */
export type GradingTaskDetail = {
  assignmentId: string
  candidateResultId: string
  resultCode: string
  examName?: string | null
  roundType: GradingRoundType
  assignmentStatus: GradingAssignmentStatus
  resultStatus?: ExamCandidateResultStatus | null
  flagged: boolean
  flagReason?: string | null
  currentTotalScore?: number | null
  // Điểm lúc được giao — mốc để giáo viên biết mình đang sửa từ đâu.
  scoreBefore?: number | null
  deadlineAt?: string | null
  overdue: boolean
  // Cờ chỉ-đọc do BE quyết. Dùng thẳng cờ này, KHÔNG tự suy từ status.
  editable: boolean
  // Nút nào được dựng do BE quyết theo GradingRoundPolicy — KHÔNG tự suy từ roundType,
  // suy ở hai nơi thì sớm muộn hai nơi lệch nhau.
  allowedOutcomes: GradingOutcome[]
  // Chỉ có ở vòng APPEAL: lý do học sinh nêu trong đơn.
  appealReason?: string | null
  items: GradingTaskItem[]
  criteria: GradingCriterionMeta[]
}

/** Hàng đợi của giáo viên — MỘT danh sách cho cả bốn vòng. Ẩn danh. */
export type GradingTask = {
  assignmentId: string
  candidateResultId: string
  resultCode: string
  examName?: string | null
  partCount: number
  roundType: GradingRoundType
  status: GradingAssignmentStatus
  resultStatus?: ExamCandidateResultStatus | null
  // Ở vòng hậu kiểm/phúc khảo đây là điểm đã công bố.
  currentScore?: number | null
  flagged: boolean
  assignedAt?: string | null
  deadlineAt?: string | null
  overdue: boolean
}

/** Dòng bảng điều phối của admin. `assignmentId` null = bài chưa có phân công đang mở. */
export type GradingAssignmentRow = {
  candidateResultId: string
  resultCode: string
  studentName?: string | null
  className?: string | null
  examName?: string | null
  resultStatus?: ExamCandidateResultStatus | null
  totalScore?: number | null
  flagged: boolean
  assignmentId?: string | null
  teacherId?: string | null
  teacherName?: string | null
  roundType?: GradingRoundType | null
  assignmentStatus?: GradingAssignmentStatus | null
  outcome?: GradingOutcome | null
  assignedAt?: string | null
  completedAt?: string | null
  deadlineAt?: string | null
  overdue: boolean
  // Còn đơn phúc khảo chưa kết thúc — không nên giao vòng khác lúc này.
  hasOpenAppeal: boolean
}

/**
 * Thẻ số đầu màn điều phối. Mẫu số là TOÀN BỘ bài của phạm vi đang xem — admin nay
 * điều phối cả bốn vòng nên phải thấy cả bài đã công bố đang được hậu kiểm.
 */
export type GradingStats = {
  total: number
  byResultStatus: Array<{ status: ExamCandidateResultStatus; count: number }>
  unassigned: number
  assigned: number
  overdue: number
  teacherProgress: Array<{
    teacherId: string
    teacherName?: string | null
    assigned: number
    completed: number
    overdue: number
  }>
}

/** Một mốc trong dòng thời gian điểm. Bảng chỉ-ghi-thêm: không sửa được gì ở đây. */
export type ResultStatusHistoryEntry = {
  id: string
  candidateResultId: string
  fromStatus?: ExamCandidateResultStatus | null
  toStatus: ExamCandidateResultStatus
  scoreBefore?: number | null
  scoreAfter?: number | null
  source: ResultStatusChangeSource
  actorId?: string | null
  // null nghĩa là hệ thống tự đổi (AI chấm xong, job chốt sổ).
  actorName?: string | null
  reason?: string | null
  createdAt: string
}

/** "AI chấm lệch bao nhiêu", đo từ chính dữ liệu hậu kiểm (vòng SPOT_CHECK đã xong). */
export type AiQualityReport = {
  reviewed: number
  upheld: number
  regraded: number
  invalidated: number
  regradeRate?: number | null
  averageDelta?: number | null
  maxDelta?: number | null
  byTeacher: Array<{
    teacherId?: string | null
    teacherName?: string | null
    reviewed: number
    regraded: number
    averageDelta?: number | null
  }>
}

/** Ảnh chụp trước khi admin chốt sổ cả kỳ thi. */
export type BulkFinalizePreview = {
  total: number
  readyToFinalize: number
  pendingUnassigned: number
  pendingAssigned: number
  openAppeals: number
  invalid: number
  blockingResultIds: string[]
}

export type AssignableTeacher = {
  id: string
  name?: string | null
  load: number
}

export type GradingPage<T> = {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

/** Kết quả `/regrade/preview` — tổng và điểm từng phần đều do BE tính. */
export type GradingPreview = {
  totalScore?: number | null
  resultBandName?: string | null
  itemScores: Array<{ paperItemId: string; itemScore?: number | null }>
}

/**
 * Kết quả chung của bốn hành động chấm bài. Một kiểu trả về cho cả bốn để sau khi
 * bấm nút chỉ có MỘT đường xử lý: đọc `resultStatus` + `totalScore` rồi vẽ lại.
 */
export type GradingActionResult = {
  assignmentId: string
  candidateResultId: string
  outcome: GradingOutcome
  resultStatus?: ExamCandidateResultStatus | null
  totalScore?: number | null
  // Phân công vừa được mở tiếp; hiện chỉ CLEARED_INVALID sinh ra (mở vòng INITIAL
  // cho chính giáo viên đó).
  nextAssignmentId?: string | null
}

/**
 * Kết quả một lượt thu hồi phân công quá hạn. HAI danh sách tách bạch, không phải một
 * mảng mang hai nghĩa: `reclaimed` là phân công cũ vừa đóng, `reassigned` là phân công
 * mới vừa mở cho nhóm thay thế (rỗng khi admin chỉ thu hồi mà không chọn ai).
 */
export type ReclaimOverdueResult = {
  reclaimedAssignmentIds: string[]
  reassignedAssignmentIds: string[]
  // BE xử lý tối đa 500 phân công một lượt. true = còn dòng quá hạn chưa xử lý, bấm
  // lại là chạy lượt sau — không có cờ này thì lượt bị cắt trông y hệt lượt đã xong.
  hasMore: boolean
}

/**
 * Câu tường thuật cho một lượt thu hồi. Gộp ở đây vì cả ba trường đều phải xuất hiện:
 * chỉ đọc `reclaimedAssignmentIds` thì admin không biết bài đã được giao lại hay đang
 * nằm ở hàng chưa giao, và bỏ `hasMore` thì lượt bị cắt ở trần 500 trông như đã xong.
 */
export function describeReclaimResult(result: ReclaimOverdueResult): string {
  const reclaimed = result.reclaimedAssignmentIds.length
  if (reclaimed === 0) {
    return 'Không có phân công quá hạn nào để thu hồi.'
  }
  const reassigned = result.reassignedAssignmentIds.length
  const parts = [
    reassigned > 0
      ? `Đã thu hồi ${reclaimed} phân công quá hạn và giao lại ${reassigned} phân công mới.`
      : `Đã thu hồi ${reclaimed} phân công quá hạn, bài quay về hàng chưa giao.`,
  ]
  if (result.hasMore) {
    parts.push('Vẫn còn phân công quá hạn chưa xử lý — bấm thu hồi lần nữa để chạy tiếp.')
  }
  return parts.join(' ')
}

const ASSIGNMENT_STATUS_DISPLAY: Record<
  GradingAssignmentStatus,
  { label: string; tone: StatusTone }
> = {
  ASSIGNED: { label: 'Đang chờ chấm', tone: 'warning' },
  COMPLETED: { label: 'Đã chấm xong', tone: 'success' },
}

export function getAssignmentStatusDisplay(status: GradingAssignmentStatus | null | undefined) {
  if (!status) {
    return { label: 'Chưa phân công', tone: 'neutral' as StatusTone }
  }
  return ASSIGNMENT_STATUS_DISPLAY[status]
}

const RESULT_STATUS_DISPLAY: Partial<
  Record<ExamCandidateResultStatus, { label: string; tone: StatusTone }>
> = {
  // "Chờ xử lý" vs "Đang chấm" ở RE_GRADING: hai trạng thái này chỉ khác nhau ở chỗ
  // đã có giám khảo bắt tay vào chấm chưa, nên nhãn phải khác nhau ngay từ chữ đầu.
  APPEALED: { label: 'Chờ xử lý phúc khảo', tone: 'info' },
  FAILED: { label: 'Không đạt', tone: 'danger' },
  FINAL: { label: 'Đã chốt', tone: 'success' },
  INVALID: { label: 'Đã vô hiệu', tone: 'danger' },
  PASSED: { label: 'Đạt', tone: 'success' },
  // KHÔNG phải "chưa ai chấm": AI đã chấm xong, bài đang chờ người soát lại điểm đó
  // trước khi công bố. Ra khỏi hàng chờ bằng một trong hai đường — giao giáo viên một
  // vòng chấm (họ uphold/regrade), hoặc admin chốt sổ hàng loạt ở màn Điều phối. Không
  // còn nút duyệt lẻ từng bài ở màn Kết quả kỳ thi.
  PENDING_REVIEW: { label: 'Chờ soát điểm AI', tone: 'warning' },
  RELEASED: { label: 'Đã công bố', tone: 'success' },
  RETAKE_REQUIRED: { label: 'Phải thi lại', tone: 'warning' },
  RE_GRADING: { label: 'Đang chấm phúc khảo', tone: 'violet' },
}

export function getResultStatusDisplay(status: ExamCandidateResultStatus | null | undefined) {
  if (!status) {
    return { label: '—', tone: 'neutral' as StatusTone }
  }
  return RESULT_STATUS_DISPLAY[status] ?? { label: status, tone: 'neutral' as StatusTone }
}

const ROUND_TYPE_DISPLAY: Record<
  GradingRoundType,
  { label: string; tone: StatusTone; hint: string }
> = {
  APPEAL: {
    hint: 'Chấm theo đơn phúc khảo của học sinh — nộp là công bố luôn.',
    label: 'Phúc khảo',
    tone: 'danger',
  },
  INITIAL: {
    // Nhãn "thủ công" không tự nó phân biệt được với ba vòng kia (vòng nào cũng do
    // người chấm), nên hint phải gánh phần nêu lý do bài rơi vào vòng này.
    hint: 'AI chấm không đủ tự tin nên chuyển bài sang cho giáo viên chấm.',
    label: 'Chấm thủ công',
    tone: 'info',
  },
  REMEDIATION: {
    hint: 'Xét lại bài đang bị vô hiệu để giữ nguyên hoặc gỡ vô hiệu.',
    label: 'Xét vô hiệu',
    tone: 'warning',
  },
  SPOT_CHECK: {
    hint: 'Hậu kiểm bài đã công bố — bài giữ nguyên trạng thái suốt quá trình.',
    label: 'Hậu kiểm',
    tone: 'violet',
  },
}

export function getRoundTypeDisplay(roundType: GradingRoundType | null | undefined) {
  if (!roundType) {
    return { hint: '', label: '—', tone: 'neutral' as StatusTone }
  }
  return ROUND_TYPE_DISPLAY[roundType]
}

const OUTCOME_DISPLAY: Record<GradingOutcome, { label: string; tone: StatusTone }> = {
  CLEARED_INVALID: { label: 'Đã gỡ vô hiệu', tone: 'success' },
  DECLINED: { label: 'Đã trả lại', tone: 'neutral' },
  INVALIDATED: { label: 'Kết luận vi phạm', tone: 'danger' },
  REGRADED: { label: 'Đã chấm lại', tone: 'violet' },
  UPHELD: { label: 'Giữ nguyên điểm', tone: 'success' },
}

export function getOutcomeDisplay(outcome: GradingOutcome | null | undefined) {
  if (!outcome) {
    return null
  }
  return OUTCOME_DISPLAY[outcome]
}

const SOURCE_DISPLAY: Record<ResultStatusChangeSource, string> = {
  ADMIN_BULK_FINALIZE: 'Admin chốt sổ kỳ thi',
  AI_EVALUATION: 'AI chấm tự động',
  EXAM_PUBLISH: 'Công bố kết quả kỳ thi',
  SYSTEM: 'Hệ thống',
  TEACHER_APPEAL: 'Giáo viên chấm phúc khảo',
  TEACHER_INITIAL: 'Giáo viên chấm thủ công',
  TEACHER_REMEDIATION: 'Giáo viên xét vô hiệu',
  TEACHER_SPOT_CHECK: 'Giáo viên hậu kiểm',
}

export function getSourceLabel(source: ResultStatusChangeSource | null | undefined) {
  return source ? (SOURCE_DISPLAY[source] ?? source) : '—'
}

/**
 * Ba vòng admin tự phân công được. Vòng APPEAL KHÔNG có ở đây: nó gắn với một đơn
 * phúc khảo cụ thể nên đi qua màn đơn phúc khảo (BE từ chối APPEAL ở endpoint này).
 */
export const ADMIN_ASSIGNABLE_ROUNDS: GradingRoundType[] = [
  'INITIAL',
  'SPOT_CHECK',
  'REMEDIATION',
]

/**
 * Vòng phù hợp với một bài, suy từ trạng thái bài. Đây là bản sao FE của
 * `GradingRoundPolicy.assignableStatuses` — chỉ dùng để GỢI Ý vòng trong modal phân
 * công; BE vẫn là chỗ chốt và sẽ từ chối nếu bài không ở đúng trạng thái.
 */
export function suggestedRoundFor(
  status: ExamCandidateResultStatus | null | undefined,
): GradingRoundType | null {
  switch (status) {
    case 'PENDING_REVIEW':
      return 'INITIAL'
    case 'RELEASED':
      return 'SPOT_CHECK'
    case 'INVALID':
      return 'REMEDIATION'
    case 'APPEALED':
    case 'RE_GRADING':
      return 'APPEAL'
    default:
      return null
  }
}

/** Đã nhập điểm cho MỌI tiêu chí bắt buộc của mọi phần thi hay chưa. */
export function isEveryRequiredCriterionFilled(
  detail: GradingTaskDetail,
  scores: Record<string, Record<string, number | null>>,
): boolean {
  // Bài không có phần thi nào thì không có gì để nộp — `[].every()` trả true nên
  // phải chặn tường minh, tránh bật nút "Nộp điểm cho 0 phần thi" và gửi items rỗng.
  if (detail.items.length === 0) {
    return false
  }
  const required = detail.criteria.filter((criterion) => criterion.required)
  return detail.items.every((item) =>
    required.every((criterion) => scores[item.paperItemId]?.[criterion.id] != null),
  )
}

/** Kẹp điểm vào dải của tiêu chí. BE validate lại, đây chỉ để đỡ gửi request chắc-chắn-hỏng. */
export function clampToCriterion(criterion: GradingCriterionMeta, value: number): number {
  const min = criterion.minScore ?? 0
  const max = criterion.maxScore ?? min
  return Math.max(min, Math.min(max, value))
}

/**
 * Bước nhảy của ô nhập, suy từ dải điểm thật thay vì hardcode.
 * Thang rộng (>3) thường là thang band 0–9 → bước 0.5; thang hẹp thường chấm lẻ hơn.
 */
export function stepForCriterion(criterion: GradingCriterionMeta): number {
  const min = criterion.minScore ?? 0
  const max = criterion.maxScore ?? min
  return max - min > 3 ? 0.5 : 0.25
}

/** Hiển thị điểm gọn: 6 -> "6.0", 6.5 -> "6.5", 6.75 -> "6.75". Rỗng -> "—". */
export function formatScore(n: number | null | undefined): string {
  if (n == null) {
    return '—'
  }
  if (n % 1 === 0) {
    return Number(n).toFixed(1)
  }
  // 2 chữ số rồi bỏ số 0 thừa ở cuối: 6.50 -> "6.5", 6.75 giữ nguyên.
  return Number(n).toFixed(2).replace(/0$/, '')
}

/** Chênh lệch có dấu: +0.5 / -1.0. Rỗng khi thiếu một trong hai đầu. */
export function formatScoreDelta(
  before: number | null | undefined,
  after: number | null | undefined,
): string | null {
  if (before == null || after == null) {
    return null
  }
  const delta = after - before
  if (delta === 0) {
    return 'không đổi'
  }
  return `${delta > 0 ? '+' : '−'}${formatScore(Math.abs(delta))}`
}

/**
 * Phần trăm gọn: BE trả thang 0–100 (`regradeRate` đã nhân 100 ở query repository),
 * nên truyền thẳng số đó — 42 -> "42%", 42.5 -> "42.5%". ĐỪNG nhân thêm 100 ở đây.
 */
export function formatPercent(n: number | null | undefined): string {
  if (n == null) {
    return '—'
  }
  return `${Number(n).toFixed(1).replace(/\.0$/, '')}%`
}

/** ISO-8601 -> "dd/MM · HH:mm". Rỗng -> "—". */
export function formatIsoDateTime(iso: string | null | undefined): string {
  if (!iso) {
    return '—'
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return iso
  }
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  return `${dd}/${mm} · ${hh}:${mi}`
}

/**
 * Giá trị `<input type="datetime-local">` -> ISO có offset để BE parse thành
 * OffsetDateTime. Chuỗi rỗng -> null, nghĩa là "gỡ hạn".
 */
export function localDateTimeToIso(value: string): string | null {
  if (!value) {
    return null
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/** Định dạng thời lượng giây -> m:ss. */
export function formatDuration(seconds: number | null | undefined): string {
  const total = seconds ?? 0
  const m = Math.floor(total / 60)
  const s = Math.round(total % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Chữ cái đầu của họ + tên cuối. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return (parts[parts.length - 2]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')
}

const AVATAR_CLASSES = [
  'bg-cyan-100 text-cyan-700',
  'bg-violet-100 text-violet-700',
  'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-blue-100 text-blue-700',
  'bg-red-100 text-red-700',
]

/** Màu avatar ổn định theo tên. */
export function avatarClasses(name: string): string {
  let h = 0
  for (const ch of name) {
    h = (h * 31 + ch.charCodeAt(0)) >>> 0
  }
  return AVATAR_CLASSES[h % AVATAR_CLASSES.length]
}
