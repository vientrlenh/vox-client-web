import {
  avgScore,
  bandRound,
  formatScore,
  type CriterionScores,
  type ReevaluationRequest,
  type ReevaluationStats,
  type TeacherLite,
} from '../types'

/**
 * Nguồn dữ liệu DEMO (in-memory) cho tính năng Phúc khảo — chưa nối backend.
 * Toàn bộ logic đọc/ghi nằm ở đây; khi có API thật chỉ cần đổi phần thân của
 * các hàm bên dưới sang gọi REST/GraphQL. Reload trang sẽ reset state.
 */

function ai(
  fluency: number,
  pronunciation: number,
  vocabulary: number,
  grammar: number,
  coherence: number,
): CriterionScores {
  return { fluency, pronunciation, vocabulary, grammar, coherence }
}

function seed(): ReevaluationRequest[] {
  return [
    {
      id: 'PK-2401',
      student: 'Nguyễn Minh An',
      sid: 'HS0421',
      cls: '12A2',
      exam: 'IELTS Speaking Mock 3',
      part: 'Part 2 · Cue Card',
      original: 6.0,
      aiScores: ai(6, 5.5, 6.5, 6, 6),
      duration: 124,
      reason:
        'Em cảm thấy phần trả lời của mình trôi chảy và đủ ý hơn mức 6.0, đặc biệt là phần fluency. Mong thầy cô nghe lại và chấm lại giúp em.',
      requestedAt: '08/07 · 14:22',
      deadline: '12/07',
      status: 'pending',
      assignees: [],
      timeline: [
        {
          t: '08/07 · 14:22',
          who: 'Nguyễn Minh An',
          role: 'Học sinh',
          text: 'Gửi yêu cầu phúc khảo',
          icon: 'send',
          tone: 'info',
        },
      ],
    },
    {
      id: 'PK-2402',
      student: 'Lê Gia Bảo',
      sid: 'HS0388',
      cls: '11A5',
      exam: 'Kiểm tra giữa kỳ · Nói',
      part: 'Part 3 · Discussion',
      original: 5.5,
      aiScores: ai(5.5, 5, 6, 5.5, 5.5),
      duration: 98,
      reason:
        'Phần thảo luận em đã đưa ra nhiều ý và ví dụ, em nghĩ điểm coherence chưa phản ánh đúng.',
      requestedAt: '08/07 · 09:10',
      deadline: '12/07',
      status: 'pending',
      assignees: [],
      timeline: [
        {
          t: '08/07 · 09:10',
          who: 'Lê Gia Bảo',
          role: 'Học sinh',
          text: 'Gửi yêu cầu phúc khảo',
          icon: 'send',
          tone: 'info',
        },
      ],
    },
    {
      id: 'PK-2403',
      student: 'Phạm Khánh Chi',
      sid: 'HS0512',
      cls: '12A1',
      exam: 'IELTS Speaking Mock 3',
      part: 'Part 1 · Interview',
      original: 7.0,
      aiScores: ai(7, 7, 7.5, 6.5, 7),
      duration: 76,
      reason: 'Em nghĩ phát âm của em tốt hơn, mong được chấm lại tiêu chí pronunciation.',
      requestedAt: '07/07 · 16:40',
      deadline: '11/07',
      status: 'approved',
      assignees: [],
      timeline: [
        {
          t: '07/07 · 16:40',
          who: 'Phạm Khánh Chi',
          role: 'Học sinh',
          text: 'Gửi yêu cầu phúc khảo',
          icon: 'send',
          tone: 'info',
        },
        {
          t: '08/07 · 08:05',
          who: 'Vũ Thị Lan',
          role: 'School Admin',
          text: 'Duyệt yêu cầu — đủ căn cứ xử lý',
          icon: 'circle-check',
          tone: 'success',
        },
      ],
    },
    {
      id: 'PK-2404',
      student: 'Vũ Đức Duy',
      sid: 'HS0290',
      cls: '11A2',
      exam: 'Kiểm tra cuối kỳ · Nói',
      part: 'Part 2 · Cue Card',
      original: 6.5,
      aiScores: ai(6.5, 6, 7, 6.5, 6.5),
      duration: 132,
      reason:
        'Em trả lời đủ 2 phút và triển khai đủ các gạch đầu dòng, mong được xem lại tổng thể.',
      requestedAt: '06/07 · 11:30',
      deadline: '10/07',
      status: 'grading',
      assignees: [
        { tid: 't1', done: false },
        {
          tid: 't3',
          done: true,
          scores: ai(7, 6.5, 7, 6.5, 7),
          note: 'Thí sinh triển khai ý tốt, phát âm rõ, có vài lỗi ngữ pháp nhỏ. Đề xuất nâng lên 6.75.',
        },
      ],
      timeline: [
        {
          t: '06/07 · 11:30',
          who: 'Vũ Đức Duy',
          role: 'Học sinh',
          text: 'Gửi yêu cầu phúc khảo',
          icon: 'send',
          tone: 'info',
        },
        {
          t: '06/07 · 15:00',
          who: 'Vũ Thị Lan',
          role: 'School Admin',
          text: 'Duyệt yêu cầu',
          icon: 'circle-check',
          tone: 'success',
        },
        {
          t: '06/07 · 15:12',
          who: 'Vũ Thị Lan',
          role: 'School Admin',
          text: 'Phân công 2 giám khảo chấm lại (ẩn danh)',
          icon: 'users',
          tone: 'violet',
        },
        {
          t: '07/07 · 09:40',
          who: 'Người chấm 2',
          role: 'Re-evaluator',
          text: 'Đã nộp báo cáo chấm lại',
          icon: 'file-check',
          tone: 'success',
        },
      ],
    },
    {
      id: 'PK-2405',
      student: 'Đặng Thảo My',
      sid: 'HS0177',
      cls: '12A3',
      exam: 'IELTS Speaking Mock 2',
      part: 'Part 3 · Discussion',
      original: 6.0,
      aiScores: ai(6, 5.5, 6, 6, 6.5),
      duration: 145,
      reason: 'Em nghĩ vốn từ và độ mạch lạc của em xứng đáng hơn 6.0.',
      requestedAt: '05/07 · 10:15',
      deadline: '09/07',
      status: 'comparing',
      assignees: [
        {
          tid: 't1',
          done: true,
          scores: ai(6.5, 6, 6.5, 6, 7),
          note: 'Câu trả lời có chiều sâu, dùng từ học thuật tốt. Đề xuất 6.5.',
        },
        {
          tid: 't5',
          done: true,
          scores: ai(6.5, 5.5, 7, 6, 6.5),
          note: 'Vốn từ nổi bật, phát âm còn vài lỗi trọng âm. Đề xuất 6.5.',
        },
      ],
      timeline: [
        {
          t: '05/07 · 10:15',
          who: 'Đặng Thảo My',
          role: 'Học sinh',
          text: 'Gửi yêu cầu phúc khảo',
          icon: 'send',
          tone: 'info',
        },
        {
          t: '05/07 · 13:20',
          who: 'Vũ Thị Lan',
          role: 'School Admin',
          text: 'Duyệt yêu cầu',
          icon: 'circle-check',
          tone: 'success',
        },
        {
          t: '05/07 · 13:30',
          who: 'Vũ Thị Lan',
          role: 'School Admin',
          text: 'Phân công 2 giám khảo chấm lại (ẩn danh)',
          icon: 'users',
          tone: 'violet',
        },
        {
          t: '06/07 · 16:05',
          who: 'Người chấm 1',
          role: 'Re-evaluator',
          text: 'Đã nộp báo cáo chấm lại',
          icon: 'file-check',
          tone: 'success',
        },
        {
          t: '07/07 · 08:50',
          who: 'Người chấm 2',
          role: 'Re-evaluator',
          text: 'Đã nộp báo cáo chấm lại',
          icon: 'file-check',
          tone: 'success',
        },
      ],
    },
    {
      id: 'PK-2406',
      student: 'Hoàng Nam',
      sid: 'HS0055',
      cls: '12A2',
      exam: 'IELTS Speaking Mock 2',
      part: 'Part 2 · Cue Card',
      original: 5.5,
      aiScores: ai(5.5, 5, 5.5, 5.5, 6),
      duration: 120,
      finalScore: 6.0,
      reason: 'Em đã cải thiện phần fluency, mong được chấm lại.',
      requestedAt: '03/07 · 08:00',
      deadline: '07/07',
      status: 'published',
      assignees: [
        { tid: 't2', done: true, scores: ai(6, 5.5, 6, 6, 6), note: 'Đề xuất 6.0.' },
        { tid: 't4', done: true, scores: ai(6, 5.5, 5.5, 6, 6), note: 'Đề xuất 5.75.' },
      ],
      timeline: [
        {
          t: '03/07 · 08:00',
          who: 'Hoàng Nam',
          role: 'Học sinh',
          text: 'Gửi yêu cầu phúc khảo',
          icon: 'send',
          tone: 'info',
        },
        {
          t: '03/07 · 10:00',
          who: 'Vũ Thị Lan',
          role: 'School Admin',
          text: 'Duyệt yêu cầu',
          icon: 'circle-check',
          tone: 'success',
        },
        {
          t: '03/07 · 10:05',
          who: 'Vũ Thị Lan',
          role: 'School Admin',
          text: 'Phân công 2 giám khảo chấm lại',
          icon: 'users',
          tone: 'violet',
        },
        {
          t: '05/07 · 14:00',
          who: 'Hội đồng',
          role: 'Re-evaluator',
          text: 'Hoàn tất chấm lại',
          icon: 'file-check',
          tone: 'success',
        },
        {
          t: '06/07 · 09:00',
          who: 'Vũ Thị Lan',
          role: 'School Admin',
          text: 'Công bố kết quả: 5.5 → 6.0',
          icon: 'bell-ringing',
          tone: 'success',
        },
        {
          t: '06/07 · 09:00',
          who: 'Hệ thống',
          role: 'Hệ thống',
          text: 'Đã gửi thông báo kết quả tới học sinh',
          icon: 'mail',
          tone: 'info',
        },
      ],
    },
    {
      id: 'PK-2407',
      student: 'Bùi Thị Lan',
      sid: 'HS0611',
      cls: '11A5',
      exam: 'Kiểm tra giữa kỳ · Nói',
      part: 'Part 1 · Interview',
      original: 7.5,
      aiScores: ai(7.5, 7.5, 7.5, 7, 8),
      duration: 82,
      reason: 'Em muốn được chấm lại toàn bộ.',
      requestedAt: '04/07 · 12:00',
      deadline: '08/07',
      status: 'rejected',
      assignees: [],
      timeline: [
        {
          t: '04/07 · 12:00',
          who: 'Bùi Thị Lan',
          role: 'Học sinh',
          text: 'Gửi yêu cầu phúc khảo',
          icon: 'send',
          tone: 'info',
        },
        {
          t: '04/07 · 15:30',
          who: 'Vũ Thị Lan',
          role: 'School Admin',
          text: 'Từ chối — không nêu căn cứ chênh lệch cụ thể',
          icon: 'circle-x',
          tone: 'danger',
        },
        {
          t: '04/07 · 15:30',
          who: 'Hệ thống',
          role: 'Hệ thống',
          text: 'Đã gửi thông báo từ chối tới học sinh',
          icon: 'mail',
          tone: 'info',
        },
      ],
    },
  ]
}

export const TEACHERS: TeacherLite[] = [
  { id: 't1', name: 'Trần Thu Hà', dept: 'Tổ Tiếng Anh', load: 2, exp: '8 năm' },
  { id: 't2', name: 'Nguyễn Quốc Huy', dept: 'Tổ Tiếng Anh', load: 1, exp: '5 năm' },
  { id: 't3', name: 'Lê Phương Dung', dept: 'Tổ Tiếng Anh', load: 3, exp: '11 năm' },
  { id: 't4', name: 'Phạm Anh Tú', dept: 'Tổ Ngoại ngữ', load: 0, exp: '6 năm' },
  { id: 't5', name: 'Đỗ Hải Yến', dept: 'Tổ Ngoại ngữ', load: 2, exp: '9 năm' },
]

/** Giáo viên đang đăng nhập (giả lập cho màn Giáo viên). */
export const CURRENT_TEACHER_ID = 't1'

const ADMIN_NAME = 'Vũ Thị Lan'
const ADMIN_ROLE = 'School Admin'

let requests: ReevaluationRequest[] = seed()

function nowLabel(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} · ${p(d.getHours())}:${p(d.getMinutes())}`
}

function find(id: string): ReevaluationRequest | undefined {
  return requests.find((r) => r.id === id)
}

// ---- Đọc ----

export function listRequests(): ReevaluationRequest[] {
  return requests.map((r) => ({ ...r }))
}

export function getRequest(id: string): ReevaluationRequest | null {
  const r = find(id)
  return r ? { ...r } : null
}

export function getStats(): ReevaluationStats {
  const by = (status: ReevaluationRequest['status']) =>
    requests.filter((r) => r.status === status).length
  return {
    pending: by('pending'),
    processing: by('approved') + by('grading') + by('comparing'),
    published: by('published'),
    rejected: by('rejected'),
  }
}

export function listReviewers(): TeacherLite[] {
  return TEACHERS.map((t) => ({ ...t }))
}

export function getReviewer(id: string): TeacherLite | undefined {
  return TEACHERS.find((t) => t.id === id)
}

export function listTeacherTasks(teacherId: string): ReevaluationRequest[] {
  return requests
    .filter((r) => r.assignees.some((a) => a.tid === teacherId))
    .map((r) => ({ ...r }))
}

/** Điểm đề xuất = TB các bài đã chấm, làm tròn bậc 0.5. */
export function suggestedFinal(req: ReevaluationRequest): number {
  const done = req.assignees.filter((a) => a.done && a.scores)
  if (!done.length) {
    return req.original
  }
  const avgs = done.map((d) => avgScore(d.scores as CriterionScores))
  return bandRound(avgs.reduce((x, y) => x + y, 0) / avgs.length)
}

// ---- Ghi (mô phỏng) ----

export function approveRequest(id: string): void {
  const r = find(id)
  if (!r) {
    return
  }
  r.status = 'approved'
  r.timeline.push({
    t: nowLabel(),
    who: ADMIN_NAME,
    role: ADMIN_ROLE,
    text: 'Duyệt yêu cầu — chuyển sang phân công',
    icon: 'circle-check',
    tone: 'success',
  })
}

export function rejectRequest(id: string, reason: string): void {
  const r = find(id)
  if (!r) {
    return
  }
  r.status = 'rejected'
  r.timeline.push({
    t: nowLabel(),
    who: ADMIN_NAME,
    role: ADMIN_ROLE,
    text: 'Từ chối — ' + reason,
    icon: 'circle-x',
    tone: 'danger',
  })
  r.timeline.push({
    t: nowLabel(),
    who: 'Hệ thống',
    role: 'Hệ thống',
    text: 'Đã gửi thông báo từ chối tới học sinh',
    icon: 'mail',
    tone: 'info',
  })
}

export function assignReviewers(id: string, teacherIds: string[]): void {
  const r = find(id)
  if (!r) {
    return
  }
  r.assignees = teacherIds.map((tid) => ({ tid, done: false }))
  r.status = 'grading'
  r.timeline.push({
    t: nowLabel(),
    who: ADMIN_NAME,
    role: ADMIN_ROLE,
    text: `Phân công ${r.assignees.length} giám khảo chấm lại (ẩn danh)`,
    icon: 'users',
    tone: 'violet',
  })
}

export function submitReport(
  id: string,
  teacherId: string,
  scores: CriterionScores,
  note: string,
): void {
  const r = find(id)
  if (!r) {
    return
  }
  const mine = r.assignees.find((a) => a.tid === teacherId)
  if (mine) {
    mine.done = true
    mine.scores = { ...scores }
    mine.note = note
    const index = r.assignees.indexOf(mine)
    r.timeline.push({
      t: nowLabel(),
      who: 'Người chấm ' + (index + 1),
      role: 'Re-evaluator',
      text: 'Đã nộp báo cáo chấm lại',
      icon: 'file-check',
      tone: 'success',
    })
  }
  if (r.assignees.length > 0 && r.assignees.every((a) => a.done)) {
    r.status = 'comparing'
  }
}

export function publishResult(id: string, finalScore: number): void {
  const r = find(id)
  if (!r) {
    return
  }
  r.finalScore = Number(finalScore)
  r.status = 'published'
  r.timeline.push({
    t: nowLabel(),
    who: ADMIN_NAME,
    role: ADMIN_ROLE,
    text: `Công bố kết quả: ${formatScore(r.original)} → ${formatScore(r.finalScore)}`,
    icon: 'bell-ringing',
    tone: 'success',
  })
  r.timeline.push({
    t: nowLabel(),
    who: 'Hệ thống',
    role: 'Hệ thống',
    text: 'Đã gửi thông báo kết quả tới học sinh',
    icon: 'mail',
    tone: 'info',
  })
}

/** Chỉ dùng cho test — đưa store về seed ban đầu. */
export function __resetReevaluationStore(): void {
  requests = seed()
}
