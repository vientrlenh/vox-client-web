import type { StatusTone } from '@/shared/ui/StatusBadge'

// Enum BE dùng CHỮ HOA — dùng thẳng, không map qua chữ thường (chuẩn hoá tại một chỗ).
export type AppealStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'GRADING'
  | 'COMPARING'
  | 'PUBLISHED'
  | 'REJECTED'

// BE chỉ có 2 giá trị — KHÔNG có REMOVED (gỡ giám khảo là xoá cứng bản ghi).
export type AppealReviewerStatus = 'ASSIGNED' | 'SUBMITTED'

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

// Thang điểm 1 tiêu chí của rubric (để dựng form chấm + kẹp giá trị nhập).
export type AppealCriterionMeta = {
  id: string
  code: string
  label: string
  description?: string | null
  minScore: number
  maxScore: number
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

export type AppealReviewer = {
  reviewerId: string
  reviewerName: string
  status: AppealReviewerStatus
  done: boolean
  assignedAt: string
  submittedAt?: string | null
  suggestedScore?: number | null
  note?: string | null
  scores?: AppealCriterionScore[] | null
}

// Một dòng trong danh sách đơn (GraphQL `appeals`).
export type AppealSummary = {
  id: string
  studentName: string
  className?: string | null
  examName: string
  partLabel?: string | null
  originalScore?: number | null
  status: AppealStatus
  requestedAt: string
  deadline?: string | null
  reviewerCount: number
  doneCount: number
  overdue: boolean
}

// Chi tiết đơn cho admin (GraphQL `appeal(id)`).
export type AppealDetail = {
  id: string
  studentName: string
  className?: string | null
  examName: string
  partLabel?: string | null
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
  aiScores: AppealCriterionScore[]
  turns: AppealTurn[]
  reviewers: AppealReviewer[]
  overdue: boolean
  // Thang điểm rubric — chính là khoảng BE validate partScore khi công bố.
  scoringScaleMin: number
  scoringScaleMax: number
}

// Một dòng trong việc của giám khảo (GraphQL `myAppealTasks`).
export type AppealTask = {
  appealId: string
  examName: string
  partLabel?: string | null
  deadline?: string | null
  myStatus: AppealReviewerStatus
  overdue: boolean
}

// Màn chấm lại của giám khảo (GraphQL `appealTaskDetail`) — chấm mù, KHÔNG có reviewers khác.
export type AppealTaskDetail = {
  appealId: string
  partLabel?: string | null
  turns: AppealTurn[]
  aiScores: AppealCriterionScore[]
  criteria: AppealCriterionMeta[]
  myReport?: AppealReviewer | null
}

// Ứng viên cho picker phân công (GraphQL `appealReviewers`).
export type AppealReviewerLite = {
  id: string
  name: string
  load: number
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
}

const STATUS_DISPLAY: Record<AppealStatus, { label: string; tone: StatusTone }> = {
  PENDING: { label: 'Chờ duyệt', tone: 'warning' },
  APPROVED: { label: 'Chờ phân công', tone: 'info' },
  GRADING: { label: 'Đang chấm lại', tone: 'violet' },
  COMPARING: { label: 'Chờ đối chiếu', tone: 'info' },
  PUBLISHED: { label: 'Đã công bố', tone: 'success' },
  REJECTED: { label: 'Từ chối', tone: 'danger' },
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

/**
 * Điểm đề xuất cho phần thi = trung bình `suggestedScore` của các giám khảo đã nộp.
 * BE đã tính sẵn `suggestedScore` (trung bình các tiêu chí, HALF_UP scale 2) — không tự tính lại.
 */
export function suggestedPartScore(reviewers: AppealReviewer[]): number | null {
  const submitted = reviewers.filter((r) => r.done && r.suggestedScore != null)
  if (submitted.length === 0) {
    return null
  }
  const sum = submitted.reduce((total, r) => total + (r.suggestedScore ?? 0), 0)
  return bandRound(sum / submitted.length)
}

/**
 * Không có API timeline — FE tự ghép từ các mốc của đơn (guide §6).
 * Trả về theo thứ tự thời gian: nộp → duyệt → phân công → nộp báo cáo → công bố/từ chối.
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

  const assignedAts = detail.reviewers
    .map((r) => r.assignedAt)
    .filter(Boolean)
    .sort()
  if (assignedAts.length > 0) {
    events.push({
      icon: 'users',
      role: `${detail.reviewers.length} giám khảo`,
      t: formatIsoDateTime(assignedAts[0]),
      text: `Phân công ${detail.reviewers.length} giám khảo chấm lại`,
      tone: 'info',
      who: 'Quản trị trường',
    })
  }

  detail.reviewers
    .filter((r) => r.submittedAt)
    .sort((a, b) => (a.submittedAt! < b.submittedAt! ? -1 : 1))
    .forEach((reviewer) => {
      events.push({
        icon: 'file-check',
        role: 'Giám khảo',
        t: formatIsoDateTime(reviewer.submittedAt),
        text: `${reviewer.reviewerName} nộp báo cáo chấm lại`,
        tone: 'violet',
        who: reviewer.reviewerName,
      })
    })

  if (detail.resolvedAt) {
    const rejected = detail.status === 'REJECTED'
    events.push({
      icon: rejected ? 'circle-x' : 'bell-ringing',
      role: rejected ? 'Từ chối' : 'Công bố',
      t: formatIsoDateTime(detail.resolvedAt),
      text: rejected
        ? 'Từ chối đơn và thông báo học sinh'
        : 'Công bố kết quả và thông báo học sinh',
      tone: rejected ? 'danger' : 'success',
      who: 'Quản trị trường',
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
