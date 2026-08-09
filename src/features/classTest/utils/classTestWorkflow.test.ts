import type { ExamCandidateDto, ExamDto, ExamPaperDto, ExamScheduleDto } from '@/features/examCore/types'
import { getClassTestScheduleReadiness, getClassTestWorkflowSteps } from './classTestWorkflow'

type ExamOverrides = Partial<Pick<ExamDto, 'candidateCount' | 'papers' | 'schedules' | 'status'>>

const paperWithQuestions = {
  id: 'paper-1',
  sections: [{ id: 'sec-1', items: [{ id: 'item-1' }] }],
  status: 'LOCKED',
} as unknown as ExamPaperDto

const emptyPaper = { id: 'paper-0', sections: [{ id: 'sec-0', items: [] }], status: 'DRAFT' } as unknown as ExamPaperDto

function exam(overrides: ExamOverrides = {}): ExamDto {
  return {
    candidateCount: 30,
    papers: [paperWithQuestions],
    status: 'DRAFT',
    ...overrides,
  } as ExamDto
}

function schedule(id: string, status: string, overrides: Record<string, unknown> = {}): ExamScheduleDto {
  return {
    id,
    proctors: [{ id: `p-${id}` }],
    schoolRoomId: `room-${id}`,
    status,
    ...overrides,
  } as unknown as ExamScheduleDto
}

const candidates = [{ assignedPaperId: 'paper-1', id: 'cand-1', scheduleId: 's1' }] as unknown as ExamCandidateDto[]

describe('getClassTestWorkflowSteps — 3 bước khớp đúng tab', () => {
  it('dựng đúng 3 bước theo thứ tự đề bài → học sinh → xếp lịch', () => {
    const { steps } = getClassTestWorkflowSteps(exam(), [schedule('s1', 'PUBLISHED')], candidates)

    expect(steps.map((step) => step.tab)).toEqual(['papers', 'students', 'schedule'])
  })

  it('đủ cả 3 bước thì không còn bước hiện tại', () => {
    const result = getClassTestWorkflowSteps(exam(), [schedule('s1', 'PUBLISHED')], candidates)

    expect(result.completedCount).toBe(3)
    expect(result.currentStep).toBeNull()
  })

  it('chưa có mã đề nào có câu hỏi thì kẹt ở bước Đề bài', () => {
    const result = getClassTestWorkflowSteps(exam({ papers: [emptyPaper] }), [schedule('s1', 'PUBLISHED')], candidates)

    expect(result.currentStep?.tab).toBe('papers')
    expect(result.done.papers).toBe(false)
  })

  it('chưa có học sinh thì kẹt ở bước Học sinh', () => {
    const result = getClassTestWorkflowSteps(exam({ candidateCount: 0 }), [schedule('s1', 'PUBLISHED')], [])

    expect(result.currentStep?.tab).toBe('students')
    expect(result.done.papers).toBe(true)
    expect(result.done.students).toBe(false)
  })

  it('còn ca thi Bản nháp thì bước Xếp lịch chưa xong và nêu đúng lý do', () => {
    const result = getClassTestWorkflowSteps(exam(), [schedule('s1', 'DRAFT')], candidates)

    expect(result.done.schedule).toBe(false)
    expect(result.currentStep?.tab).toBe('schedule')
    expect(result.currentStep?.sublabel).toContain('Bản nháp')
  })

  it('học sinh chưa được xếp ca thì bước Xếp lịch chưa xong dù ca đã công bố', () => {
    const unassigned = [{ assignedPaperId: 'paper-1', id: 'cand-1', scheduleId: null }] as unknown as ExamCandidateDto[]

    const result = getClassTestWorkflowSteps(exam(), [schedule('s1', 'PUBLISHED')], unassigned)

    expect(result.done.schedule).toBe(false)
    expect(result.currentStep?.sublabel).toContain('chưa được xếp vào ca thi')
  })

  it('ca đã hủy không tính vào tiến độ', () => {
    const result = getClassTestWorkflowSteps(
      exam(),
      [schedule('s1', 'PUBLISHED'), schedule('s2', 'CANCELLED')],
      candidates,
    )

    expect(result.done.schedule).toBe(true)
    expect(result.summary.scheduleProgress?.totalCount).toBe(1)
  })

  it('trang danh sách (không có ca thi/học sinh chi tiết) đọc exam.schedules để dựng bước Xếp lịch', () => {
    const published = getClassTestWorkflowSteps(exam({ schedules: [{ id: 's1', status: 'PUBLISHED' }] }))
    const draft = getClassTestWorkflowSteps(exam({ schedules: [{ id: 's1', status: 'DRAFT' }] }))

    expect(published.done.schedule).toBe(true)
    expect(draft.done.schedule).toBe(false)
    expect(draft.summary.scheduleProgress?.publishedCount).toBe(0)
  })

  it('thiếu cả hai nguồn dữ liệu ca thi thì suy từ trạng thái bài', () => {
    const scheduled = getClassTestWorkflowSteps(exam({ schedules: undefined, status: 'SCHEDULED' }))
    const draft = getClassTestWorkflowSteps(exam({ schedules: undefined }))

    expect(scheduled.done.schedule).toBe(true)
    expect(draft.done.schedule).toBe(false)
  })

  it('danh sách học sinh truyền vào thắng exam.candidateCount đã cũ', () => {
    const result = getClassTestWorkflowSteps(exam({ candidateCount: 0 }), [schedule('s1', 'PUBLISHED')], candidates)

    expect(result.summary.candidateCount).toBe(1)
    expect(result.done.students).toBe(true)
  })
})

/**
 * `ExamStatusAutoTransitionJob` đóng bài trên lớp rồi cascade ca đã chạy sang `COMPLETED`, nên bước
 * Xếp lịch phải nhận trạng thái đó thay vì đòi đúng `PUBLISHED`.
 */
describe('getClassTestWorkflowSteps — ca thi đã hoàn thành vẫn là đã xếp lịch', () => {
  it('trang chi tiết: ca đã hoàn thành thì bước Xếp lịch xong và đếm đúng', () => {
    const result = getClassTestWorkflowSteps(exam(), [schedule('s1', 'COMPLETED')], candidates)

    expect(result.done.schedule).toBe(true)
    expect(result.steps[2].sublabel).toBe('1 ca thi đã hoàn thành')
  })

  it('trang danh sách: ca đã hoàn thành không còn ra "Chưa có ca thi nào"', () => {
    const result = getClassTestWorkflowSteps(exam({ schedules: [{ id: 's1', status: 'COMPLETED' }] }))

    expect(result.done.schedule).toBe(true)
    expect(result.steps[2].sublabel).toBe('1 ca thi đã hoàn thành')
  })

  it('trang danh sách: ca đã hoàn thành không che được ca còn bản nháp', () => {
    const result = getClassTestWorkflowSteps(
      exam({ schedules: [{ id: 's1', status: 'COMPLETED' }, { id: 's2', status: 'DRAFT' }] }),
    )

    expect(result.done.schedule).toBe(false)
    expect(result.steps[2].sublabel).toBe('Còn 1 ca thi chưa công bố')
  })

  it('ca đã dời bị bỏ như ca đã hủy', () => {
    const result = getClassTestWorkflowSteps(exam({ schedules: [{ id: 's1', status: 'MOVED' }] }))

    expect(result.done.schedule).toBe(false)
    expect(result.summary.scheduleProgress?.totalCount).toBe(0)
  })
})

describe('getClassTestScheduleReadiness — soi lại guard của backend', () => {
  it('chưa tải xong dữ liệu thì chưa sẵn sàng', () => {
    expect(getClassTestScheduleReadiness(undefined, candidates).ready).toBe(false)
    expect(getClassTestScheduleReadiness([schedule('s1', 'PUBLISHED')], undefined).ready).toBe(false)
  })

  it('chưa có ca thi nào', () => {
    expect(getClassTestScheduleReadiness([], candidates).blockingReason).toBe('Bài kiểm tra chưa có ca thi.')
  })

  it('ca thiếu phòng, thiếu giám khảo được báo trước khi tới luật ca chưa công bố', () => {
    expect(
      getClassTestScheduleReadiness([schedule('s1', 'DRAFT', { schoolRoomId: null })], candidates).blockingReason,
    ).toBe('Ca thi chưa được chọn phòng.')
    expect(getClassTestScheduleReadiness([schedule('s1', 'DRAFT', { proctors: [] })], candidates).blockingReason).toBe(
      'Ca thi chưa có giám khảo.',
    )
  })

  it('học sinh chưa gán đề', () => {
    const withoutPaper = [{ assignedPaperId: null, id: 'cand-1', scheduleId: 's1' }] as unknown as ExamCandidateDto[]

    expect(getClassTestScheduleReadiness([schedule('s1', 'PUBLISHED')], withoutPaper).blockingReason).toBe(
      'Còn 1 học sinh chưa được gán đề.',
    )
  })

  it('còn ca Bản nháp thì chặn, công bố hết mới sẵn sàng', () => {
    const blocked = getClassTestScheduleReadiness([schedule('s1', 'PUBLISHED'), schedule('s2', 'DRAFT')], candidates)

    expect(blocked.ready).toBe(false)
    expect(blocked.blockingReason).toContain('Còn 1 ca thi đang ở trạng thái Bản nháp')
    expect(getClassTestScheduleReadiness([schedule('s1', 'PUBLISHED')], candidates).ready).toBe(true)
  })

  it('ca đã hủy không chặn việc lên lịch', () => {
    const result = getClassTestScheduleReadiness(
      [schedule('s1', 'PUBLISHED'), schedule('s2', 'CANCELLED', { proctors: [], schoolRoomId: null })],
      candidates,
    )

    expect(result.ready).toBe(true)
  })
})
