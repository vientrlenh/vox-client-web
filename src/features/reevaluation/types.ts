import type { GradingAssignmentStatus, GradingOutcome } from '@/features/grading/types'
import type { StatusTone } from '@/shared/ui/StatusBadge'

// Enum BE dùng CHỮ HOA — dùng thẳng, không map qua chữ thường (chuẩn hoá tại một chỗ).
export type AppealStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'GRADING'
  | 'PUBLISHED'
  | 'REJECTED'
  | 'WITHDRAWN'

export type TimelineTone = 'info' | 'success' | 'violet' | 'danger'

export type TimelineIconKey =
  | 'send'
  | 'circle-check'
  | 'users'
  | 'file-check'
  | 'circle-x'
  | 'bell-ringing'
  | 'mail'

export type TimelineEvent = {
  t: string
  who: string
  role: string
  text: string
  icon: TimelineIconKey
  tone: TimelineTone
}

// Điểm 1 tiêu chí — động theo criterionId, rubric mỗi trường mỗi khác.
export type AppealCriterionScore = {
  criterionId: string
  criterionCode: string
  label: string
  score: number
  rationale?: string | null
}

// Một lượt hỏi-đáp trong bài nói, mỗi lượt có audio/transcript riêng.
export type AppealTurn = {
  id: string
  turnOrder: number
  turnType: string
  promptText?: string | null
  audioUrl?: string | null
  transcript?: string | null
  durationSeconds?: number | null
}

// Một phần thi được phúc khảo. Một đơn có thể có nhiều phần.
export type AppealItem = {
  appealItemId: string
  paperItemId: string
  partLabel?: string | null
  // Điểm của bản chấm ĐANG CÓ HIỆU LỰC: vòng đầu là bản AI, vòng phúc khảo sau là
  // bản chấm tay của vòng trước. Không phải lúc nào cũng là điểm AI.
  baselineScores: AppealCriterionScore[]
  // Luôn lấy từ bản AI — chỉ bản AI mới có lượt nói.
  turns: AppealTurn[]
  finalScore?: number | null
}

/**
 * Giám khảo được giao chấm lại. Từ bản rework, đây chính là một dòng phân công chấm bài
 * (vòng `APPEAL`) — nên trạng thái/kết luận dùng chung enum với feature `grading`.
 * Mỗi đơn chỉ có TỐI ĐA MỘT giám khảo; đổi người = gán lại, không có thao tác gỡ.
 */
export type AppealReviewer = {
  assignmentId: string
  reviewerId: string
  reviewerName?: string | null
  status: GradingAssignmentStatus
  outcome?: GradingOutcome | null
  assignedAt?: string | null
  completedAt?: string | null
  deadlineAt?: string | null
  overdue: boolean
}

// Một dòng trong danh sách đơn (GraphQL `appeals`).
export type AppealSummary = {
  id: string
  studentName: string
  className?: string | null
  examName: string
  // Nhãn các phần thi được phúc khảo — một đơn có thể gồm nhiều phần.
  partLabels: string[]
  originalScore?: number | null
  status: AppealStatus
  requestedAt: string
  deadline?: string | null
  // Một giám khảo cho mỗi đơn — null khi chưa phân công.
  reviewerName?: string | null
  reviewerStatus?: GradingAssignmentStatus | null
  overdue: boolean
}

// Chi tiết đơn cho admin (GraphQL `appeal(id)`).
export type AppealDetail = {
  id: string
  studentName: string
  className?: string | null
  examName: string
  originalScore?: number | null
  status: AppealStatus
  requestedAt: string
  deadline?: string | null
  reason: string
  notes?: string | null
  decisionNote?: string | null
  finalScore?: number | null
  approvedAt?: string | null
  resolvedAt?: string | null
  withdrawnAt?: string | null
  // Lý do admin vẫn giao cho người đã chấm tay bài này (bỏ qua xung đột lợi ích).
  reviewerOverrideReason?: string | null
  // Các phần thi được phúc khảo, mỗi phần kèm điểm đối chiếu và lượt nói riêng.
  items: AppealItem[]
  reviewer?: AppealReviewer | null
  overdue: boolean
  // Thang điểm rubric — chính là khoảng BE validate partScore khi công bố.
  scoringScaleMin: number
  scoringScaleMax: number
}

// Ứng viên cho picker phân công (GraphQL `appealReviewers`).
export type AppealReviewerLite = {
  id: string
  name: string
  load: number
  // Đã chấm tay chính bài này ⇒ xung đột lợi ích. Vẫn gán được nhưng phải nêu lý do.
  conflicted: boolean
}

export type AppealPage<T> = {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type AppealStats = {
  pending: number
  processing: number
  published: number
  rejected: number
  withdrawn: number
}

const STATUS_DISPLAY: Record<AppealStatus, { label: string; tone: StatusTone }> = {
  APPROVED: { label: 'Chờ phân công', tone: 'info' },
  GRADING: { label: 'Đang chấm lại', tone: 'violet' },
  PENDING: { label: 'Chờ duyệt', tone: 'warning' },
  PUBLISHED: { label: 'Đã công bố', tone: 'success' },
  REJECTED: { label: 'Từ chối', tone: 'danger' },
  WITHDRAWN: { label: 'Học sinh đã rút', tone: 'neutral' },
}

export function getAppealStatusDisplay(status: AppealStatus) {
  return STATUS_DISPLAY[status]
}

/** Trung bình cộng điểm các tiêu chí (số tiêu chí động theo rubric). */
export function avgScore(scores: AppealCriterionScore[]): number {
  if (scores.length === 0) {
    return 0
  }
  return scores.reduce((total, s) => total + s.score, 0) / scores.length
}

/** Nhãn gộp các phần thi của một đơn cho danh sách. */
export function partLabelsText(labels: string[]): string {
  return labels.length > 0 ? labels.join(' · ') : '—'
}

/**
 * Không có API timeline — FE tự ghép từ các mốc của đơn.
 * Thứ tự: nộp → duyệt → phân công → chấm xong → công bố/từ chối, hoặc nhánh rút đơn.
 * Từ bản rework, giám khảo chấm xong là đơn công bố luôn nên hai mốc cuối sát nhau.
 */
export function buildTimeline(detail: AppealDetail): TimelineEvent[] {
  const events: TimelineEvent[] = [
    {
      icon: 'send',
      role: detail.studentName,
      t: formatIsoDateTime(detail.requestedAt),
      text: 'Học sinh gửi yêu cầu phúc khảo',
      tone: 'info',
      who: 'Học sinh',
    },
  ]

  if (detail.approvedAt) {
    events.push({
      icon: 'circle-check',
      role: 'Duyệt đơn',
      t: formatIsoDateTime(detail.approvedAt),
      text: 'Đã duyệt đơn và đặt hạn xử lý',
      tone: 'success',
      who: 'Quản trị trường',
    })
  }

  const reviewer = detail.reviewer
  const reviewerName = reviewer?.reviewerName ?? 'Giám khảo'

  if (reviewer?.assignedAt) {
    events.push({
      icon: 'users',
      role: 'Phân công',
      t: formatIsoDateTime(reviewer.assignedAt),
      text: `Giao ${reviewerName} chấm lại`,
      tone: 'info',
      who: 'Quản trị trường',
    })
  }

  if (reviewer?.completedAt) {
    events.push({
      icon: 'file-check',
      role: 'Giám khảo',
      t: formatIsoDateTime(reviewer.completedAt),
      text: `${reviewerName} chấm xong`,
      tone: 'violet',
      who: reviewerName,
    })
  }

  if (detail.status === 'WITHDRAWN' && detail.withdrawnAt) {
    events.push({
      icon: 'circle-x',
      role: 'Rút đơn',
      t: formatIsoDateTime(detail.withdrawnAt),
      text: 'Học sinh rút đơn phúc khảo',
      tone: 'danger',
      who: 'Học sinh',
    })
  } else if (detail.resolvedAt) {
    const rejected = detail.status === 'REJECTED'
    events.push({
      icon: rejected ? 'circle-x' : 'bell-ringing',
      role: rejected ? 'Từ chối' : 'Công bố',
      t: formatIsoDateTime(detail.resolvedAt),
      text: rejected
        ? 'Từ chối đơn và thông báo học sinh'
        : 'Công bố kết quả và thông báo học sinh',
      tone: rejected ? 'danger' : 'success',
      who: rejected ? 'Quản trị trường' : reviewerName,
    })
  }

  return events
}

/** Làm tròn về bậc 0.5 (band). */
export function bandRound(x: number): number {
  return Math.round(x * 2) / 2
}

/** Hiển thị điểm gọn: 6 -> "6.0", 6.75 -> "6.75". */
export function formatScore(n: number | null | undefined): string {
  if (n == null) {
    return '—'
  }
  return Number(n)
    .toFixed(n % 1 === 0 ? 1 : 2)
    .replace(/0$/, (m) => (m === '0' ? '' : m))
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

/** ISO-8601 -> "dd/MM/yyyy". Rỗng -> "—". */
export function formatIsoDate(iso: string | null | undefined): string {
  if (!iso) {
    return '—'
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return iso
  }
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${date.getFullYear()}`
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

/** Định dạng thời lượng giây -> m:ss. */
export function formatDuration(seconds: number | null | undefined): string {
  const total = seconds ?? 0
  const m = Math.floor(total / 60)
  const s = Math.round(total % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
