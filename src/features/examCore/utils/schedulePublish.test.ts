import type { ExamCandidateDto, ExamCandidateStatus, ExamScheduleDto } from '@/features/examCore/types'
import { getSchedulePublishBlockingReason, isNonScorableCandidate } from './schedulePublish'

const SCHEDULE_ID = 's1'

function schedule(proctorCount: number): ExamScheduleDto {
  return {
    id: SCHEDULE_ID,
    proctors: Array.from({ length: proctorCount }, (_, index) => ({ id: `p-${index}` })),
    status: 'DRAFT',
  } as unknown as ExamScheduleDto
}

function candidate(
  overrides: Partial<Pick<ExamCandidateDto, 'assignedPaperId' | 'scheduleId'>> & { status?: ExamCandidateStatus } = {},
): ExamCandidateDto {
  return {
    assignedPaperId: 'paper-1',
    id: `c-${Math.random()}`,
    scheduleId: SCHEDULE_ID,
    status: 'ASSIGNED',
    ...overrides,
  } as unknown as ExamCandidateDto
}

describe('isNonScorableCandidate — gương của ExamCandidateStatusSupport ở backend', () => {
  it('chỉ miễn thi và đã hủy mới nằm ngoài luật gán đề', () => {
    expect(isNonScorableCandidate('EXEMPTED')).toBe(true)
    expect(isNonScorableCandidate('CANCELLED')).toBe(true)
    expect(isNonScorableCandidate('ASSIGNED')).toBe(false)
    expect(isNonScorableCandidate('ABSENT')).toBe(false)
  })
})

describe('getSchedulePublishBlockingReason', () => {
  it('cho công bố khi ca có giám thị và mọi thí sinh đã có đề', () => {
    expect(getSchedulePublishBlockingReason(schedule(1), [candidate(), candidate()])).toBeNull()
  })

  it('chặn khi ca chưa có giám thị', () => {
    expect(getSchedulePublishBlockingReason(schedule(0), [candidate()])).toBe('Ca thi chưa có giám thị.')
  })

  it('chặn khi ca chưa có thí sinh nào', () => {
    expect(getSchedulePublishBlockingReason(schedule(1), [])).toBe('Ca thi chưa có thí sinh nào.')
  })

  it('không tính thí sinh của ca khác', () => {
    expect(getSchedulePublishBlockingReason(schedule(1), [candidate({ scheduleId: 's2' })])).toBe(
      'Ca thi chưa có thí sinh nào.',
    )
  })

  it('đếm đúng số thí sinh còn thiếu đề', () => {
    const reason = getSchedulePublishBlockingReason(schedule(1), [
      candidate(),
      candidate({ assignedPaperId: null }),
      candidate({ assignedPaperId: null }),
    ])

    expect(reason).toContain('Còn 2 học sinh chưa được gán đề')
  })

  it('bỏ qua thí sinh đã hủy dù chưa có đề', () => {
    const reason = getSchedulePublishBlockingReason(schedule(1), [
      candidate(),
      candidate({ assignedPaperId: null, status: 'CANCELLED' }),
    ])

    expect(reason).toBeNull()
  })

  it('coi ca chỉ còn thí sinh đã miễn thi là ca rỗng', () => {
    const reason = getSchedulePublishBlockingReason(schedule(1), [candidate({ status: 'EXEMPTED' })])

    expect(reason).toBe('Ca thi chưa có thí sinh nào.')
  })
})
