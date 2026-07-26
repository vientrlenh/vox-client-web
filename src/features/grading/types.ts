import type { StatusTone } from '@/shared/ui/StatusBadge'

// Enum BE dùng CHỮ HOA — dùng thẳng, không map qua chữ thường (chuẩn hoá tại một chỗ).
// BE cố tình chỉ có 2 trạng thái: nộp cả bài trong một lần nên KHÔNG có IN_PROGRESS.
export type GradingAssignmentStatus = 'ASSIGNED' | 'COMPLETED'

// Trạng thái bài nộp. Chỉ PENDING_REVIEW mới chấm được — bài đã RELEASED không chấm lại.
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

/**
 * Màn chấm. KHÔNG có tên/ID học sinh — giáo viên chấm ẩn danh.
 * `assignmentId`/`assignmentStatus` null = bài chưa được gán ai (chỉ xảy ra khi
 * nhà trường xem/chấm trực tiếp theo candidateResultId).
 */
export type GradingTaskDetail = {
  assignmentId?: string | null
  candidateResultId: string
  resultCode: string
  examName?: string | null
  assignmentStatus?: GradingAssignmentStatus | null
  resultStatus?: ExamCandidateResultStatus | null
  flagged: boolean
  flagReason?: string | null
  currentTotalScore?: number | null
  // Cờ chỉ-đọc do BE quyết. Dùng thẳng cờ này, KHÔNG tự suy từ status.
  editable: boolean
  items: GradingTaskItem[]
  criteria: GradingCriterionMeta[]
}

/** Hàng đợi của giáo viên. Ẩn danh: không có tên/ID học sinh. */
export type GradingTask = {
  assignmentId: string
  candidateResultId: string
  resultCode: string
  examName?: string | null
  partCount: number
  status: GradingAssignmentStatus
  flagged: boolean
  assignedAt?: string | null
}

/** Dòng bảng phân công của admin. `assignmentId` null = bài chưa gán ai. */
export type GradingAssignmentRow = {
  candidateResultId: string
  resultCode: string
  studentName?: string | null
  className?: string | null
  examName?: string | null
  resultStatus?: ExamCandidateResultStatus | null
  flagged: boolean
  assignmentId?: string | null
  teacherId?: string | null
  teacherName?: string | null
  assignmentStatus?: GradingAssignmentStatus | null
  assignedAt?: string | null
  completedAt?: string | null
}

/**
 * `totalToGrade` CHỈ đếm bài đang chờ chấm — bài đã công bố không nằm trong khối lượng.
 * Không có `completed`: bài chấm xong rời khỏi phạm vi màn phân công của admin.
 */
export type GradingStats = {
  totalToGrade: number
  unassigned: number
  assigned: number
}

export type AssignableTeacher = {
  id: string
  name?: string | null
  load: number
}

export type GradingExamOption = {
  id: string
  name: string
}

export type GradingPage<T> = {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

/** Kết quả `/grade/preview` — tổng và điểm từng phần đều do BE tính. */
export type GradingPreview = {
  totalScore?: number | null
  resultBandName?: string | null
  itemScores: Array<{ paperItemId: string; itemScore?: number | null }>
}

/** Kết quả `/grade` — tổng và trạng thái do BE tính lại sau khi ghi. */
export type SubmitGradingResult = {
  candidateResultId: string
  totalScore?: number | null
  resultStatus?: ExamCandidateResultStatus | null
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
  APPEALED: { label: 'Đang phúc khảo', tone: 'info' },
  FINAL: { label: 'Đã chốt', tone: 'success' },
  INVALID: { label: 'Đã vô hiệu', tone: 'danger' },
  PENDING_REVIEW: { label: 'Chờ chấm', tone: 'warning' },
  RELEASED: { label: 'Đã công bố', tone: 'success' },
  RE_GRADING: { label: 'Đang chấm lại', tone: 'violet' },
}

export function getResultStatusDisplay(status: ExamCandidateResultStatus | null | undefined) {
  if (!status) {
    return { label: '—', tone: 'neutral' as StatusTone }
  }
  return RESULT_STATUS_DISPLAY[status] ?? { label: status, tone: 'neutral' as StatusTone }
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
