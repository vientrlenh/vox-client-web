import type { StatusTone } from '@/shared/ui/StatusBadge'

export type ReevaluationStatus =
  | 'pending'
  | 'approved'
  | 'grading'
  | 'comparing'
  | 'published'
  | 'rejected'

export type CriterionKey = 'fluency' | 'pronunciation' | 'vocabulary' | 'grammar' | 'coherence'

export type CriterionScores = Record<CriterionKey, number>

export type TimelineTone = 'info' | 'success' | 'violet' | 'danger'

export type TimelineEvent = {
  t: string
  who: string
  role: string
  text: string
  icon: TimelineIconKey
  tone: TimelineTone
}

export type TimelineIconKey =
  | 'send'
  | 'circle-check'
  | 'users'
  | 'file-check'
  | 'circle-x'
  | 'bell-ringing'
  | 'mail'

export type Assignee = {
  tid: string
  done: boolean
  scores?: CriterionScores
  note?: string
}

export type ReevaluationRequest = {
  id: string
  student: string
  sid: string
  cls: string
  exam: string
  part: string
  original: number
  aiScores: CriterionScores
  duration: number
  reason: string
  requestedAt: string
  deadline: string
  status: ReevaluationStatus
  assignees: Assignee[]
  finalScore?: number
  timeline: TimelineEvent[]
}

export type ReevaluationStats = {
  pending: number
  processing: number
  published: number
  rejected: number
}

export type TeacherLite = {
  id: string
  name: string
  dept: string
  load: number
  exp: string
}

export type CriterionMeta = {
  key: CriterionKey
  label: string
  vi: string
  desc: string
}

export const CRITERIA: CriterionMeta[] = [
  {
    key: 'fluency',
    label: 'Fluency',
    vi: 'Độ trôi chảy',
    desc: 'Nói liền mạch, ngắt nghỉ tự nhiên, ít ngập ngừng',
  },
  {
    key: 'pronunciation',
    label: 'Pronunciation',
    vi: 'Phát âm',
    desc: 'Âm, trọng âm, ngữ điệu rõ ràng dễ nghe',
  },
  {
    key: 'vocabulary',
    label: 'Vocabulary',
    vi: 'Từ vựng',
    desc: 'Vốn từ đa dạng, dùng đúng ngữ cảnh',
  },
  {
    key: 'grammar',
    label: 'Grammar',
    vi: 'Ngữ pháp',
    desc: 'Cấu trúc đa dạng, độ chính xác cao',
  },
  {
    key: 'coherence',
    label: 'Coherence',
    vi: 'Mạch lạc',
    desc: 'Ý được tổ chức, liên kết logic, đúng trọng tâm',
  },
]

export const EMPTY_SCORES: CriterionScores = {
  fluency: 0,
  pronunciation: 0,
  vocabulary: 0,
  grammar: 0,
  coherence: 0,
}

const STATUS_DISPLAY: Record<ReevaluationStatus, { label: string; tone: StatusTone }> = {
  pending: { label: 'Chờ duyệt', tone: 'warning' },
  approved: { label: 'Chờ phân công', tone: 'info' },
  grading: { label: 'Đang chấm lại', tone: 'violet' },
  comparing: { label: 'Chờ đối chiếu', tone: 'info' },
  published: { label: 'Đã công bố', tone: 'success' },
  rejected: { label: 'Từ chối', tone: 'danger' },
}

export function getReevaluationStatusDisplay(status: ReevaluationStatus) {
  return STATUS_DISPLAY[status]
}

/** Trung bình 5 tiêu chí. */
export function avgScore(scores: CriterionScores): number {
  const values = CRITERIA.map((c) => scores[c.key])
  return values.reduce((a, b) => a + b, 0) / values.length
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
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
