import type { ExamCandidateDto } from '../../types'
import { computeAssignments } from './paperAssignment'

function candidate(id: string, scheduleId: string | null): ExamCandidateDto {
  return { id, scheduleId } as ExamCandidateDto
}

describe('computeAssignments — chia đều mã đề', () => {
  it('không phân gì khi chưa có mã đề nào đã khóa', () => {
    const result = computeAssignments([candidate('c1', 'sch-1')], [], false, false)

    expect(result.size).toBe(0)
  })

  it('chia luân phiên đủ mọi thí sinh khi không nhóm theo ca', () => {
    const candidates = ['c1', 'c2', 'c3', 'c4'].map((id) => candidate(id, 'sch-1'))

    const result = computeAssignments(candidates, ['p1', 'p2'], false, false)

    expect(result.size).toBe(4)
    expect(Array.from(result.values())).toEqual(['p1', 'p2', 'p1', 'p2'])
  })

  it('chia đều trong TỪNG ca chứ không trên toàn danh sách', () => {
    // Nếu chia trên toàn danh sách thì ca sch-2 lĩnh trọn p1, mất tác dụng chống nhìn bài.
    const candidates = [
      candidate('a1', 'sch-1'),
      candidate('a2', 'sch-1'),
      candidate('b1', 'sch-2'),
      candidate('b2', 'sch-2'),
    ]

    const result = computeAssignments(candidates, ['p1', 'p2'], true, false)

    expect([result.get('a1'), result.get('a2')]).toEqual(['p1', 'p2'])
    expect([result.get('b1'), result.get('b2')]).toEqual(['p1', 'p2'])
  })

  it('vẫn phủ hết thí sinh khi bật ngẫu nhiên', () => {
    const candidates = ['c1', 'c2', 'c3'].map((id) => candidate(id, 'sch-1'))

    const result = computeAssignments(candidates, ['p1', 'p2'], true, true)

    expect(new Set(result.keys())).toEqual(new Set(['c1', 'c2', 'c3']))
    result.forEach((paperId) => expect(['p1', 'p2']).toContain(paperId))
  })
})
