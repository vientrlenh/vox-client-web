import type { ExamCandidateDto, ExamDto, ExamPaperDto, ExamScheduleDto } from '@/features/examCore/types'
import { getCentralizedScheduleReadiness, getExamWorkflowSteps } from './examWorkflow'

type ExamOverrides = Partial<Pick<ExamDto, 'blueprintId' | 'blueprintVersionId' | 'members' | 'status'>>

function exam(overrides: ExamOverrides = {}): ExamDto {
  return {
    blueprintId: 'bp-1',
    blueprintVersionId: 'bpv-1',
    members: [
      { id: 'm1', role: 'CHAIR' },
      { id: 'm2', role: 'AUTHOR' },
    ],
    status: 'DRAFT',
    ...overrides,
  } as ExamDto
}

const lockedPaper = { id: 'paper-1', status: 'LOCKED' } as ExamPaperDto

function schedule(id: string, status: string, overrides: Record<string, unknown> = {}): ExamScheduleDto {
  return { id, proctors: [{ id: `p-${id}` }], schoolRoomId: `room-${id}`, status, ...overrides } as unknown as ExamScheduleDto
}

const candidates = [{ id: 'cand-1' }] as ExamCandidateDto[]

describe('getExamWorkflowSteps — 5 bước theo đúng thứ tự tab', () => {
  it('dựng đúng 5 bước theo thứ tự phân công → chốt phiên bản → đề bài → xếp học sinh → xếp lịch', () => {
    const { steps } = getExamWorkflowSteps(exam(), [lockedPaper], [schedule('s1', 'PUBLISHED')], candidates)

    expect(steps.map((step) => step.tab)).toEqual(['people', 'blueprint', 'papers', 'students', 'schedule'])
  })

  it('đủ cả 5 bước thì không còn bước hiện tại', () => {
    const result = getExamWorkflowSteps(exam(), [lockedPaper], [schedule('s1', 'PUBLISHED')], candidates)

    expect(result.completedCount).toBe(5)
    expect(result.currentStep).toBeNull()
  })

  it('thiếu người ra đề thì kẹt ở bước phân công', () => {
    const result = getExamWorkflowSteps(
      exam({ members: [{ id: 'm1', role: 'CHAIR' }] as ExamDto['members'] }),
      [lockedPaper],
      [schedule('s1', 'PUBLISHED')],
      candidates,
    )

    expect(result.done.people).toBe(false)
    expect(result.currentStep?.tab).toBe('people')
  })

  it('còn ca thi bản nháp thì bước xếp lịch chưa xong', () => {
    const result = getExamWorkflowSteps(
      exam(),
      [lockedPaper],
      [schedule('s1', 'PUBLISHED'), schedule('s2', 'DRAFT')],
      candidates,
    )

    expect(result.done.schedule).toBe(false)
    expect(result.currentStep?.tab).toBe('schedule')
    expect(result.steps[4].sublabel).toContain('Còn 1 ca thi chưa công bố')
  })

  it('mọi ca đều đã hủy thì bước xếp lịch vẫn chưa xong', () => {
    // Bẫy `every` trên mảng rỗng: lọc hết ca CANCELLED xong mà không kiểm độ dài thì hóa ra "xong".
    const result = getExamWorkflowSteps(exam(), [lockedPaper], [schedule('s1', 'CANCELLED')], candidates)

    expect(result.done.schedule).toBe(false)
  })

  it('chưa có thí sinh thì kẹt ở bước xếp học sinh', () => {
    const result = getExamWorkflowSteps(exam(), [lockedPaper], [schedule('s1', 'PUBLISHED')], [])

    expect(result.done.students).toBe(false)
    expect(result.currentStep?.tab).toBe('students')
  })

  it('còn mã đề chưa khóa thì kẹt ở bước đề bài', () => {
    const result = getExamWorkflowSteps(
      exam(),
      [lockedPaper, { id: 'paper-2', status: 'IN_REVIEW' } as ExamPaperDto],
      [schedule('s1', 'PUBLISHED')],
      candidates,
    )

    expect(result.done.papers).toBe(false)
    expect(result.currentStep?.tab).toBe('papers')
  })

  /** Query nào không chọn `members` thì stepper phải chịu được, không được ném và làm trắng trang. */
  it('không vỡ khi query không trả về danh sách thành viên', () => {
    const withoutMembers = { ...exam(), members: undefined } as unknown as ExamDto

    const result = getExamWorkflowSteps(withoutMembers, [lockedPaper])

    expect(result.done.people).toBe(false)
    expect(result.steps).toHaveLength(5)
  })

  /** Trang danh sách không có ca thi/thí sinh nên phải suy ra từ status thay vì báo "chưa làm". */
  it('thiếu dữ liệu ca thi/thí sinh thì suy ra từ trạng thái kỳ thi', () => {
    const scheduled = getExamWorkflowSteps(exam({ status: 'SCHEDULED' }), [lockedPaper])
    const draft = getExamWorkflowSteps(exam(), [lockedPaper])

    expect(scheduled.completedCount).toBe(5)
    expect(draft.done.schedule).toBe(false)
    expect(draft.done.students).toBe(false)
  })
})

describe('getCentralizedScheduleReadiness — lý do chưa lên lịch được kỳ thi', () => {
  it('chặn khi còn ca thi chưa được công bố', () => {
    const result = getCentralizedScheduleReadiness(
      [lockedPaper],
      [schedule('s1', 'PUBLISHED'), schedule('s2', 'DRAFT')],
      candidates,
    )

    expect(result.ready).toBe(false)
    expect(result.blockingReason).toContain('Còn 1 ca thi đang ở trạng thái Bản nháp')
  })

  it.each([
    ['chưa có ca thi', [] as ExamScheduleDto[], candidates, [lockedPaper], 'Kỳ thi chưa có ca thi nào.'],
    ['ca chưa có phòng', [schedule('s1', 'PUBLISHED', { schoolRoomId: null })], candidates, [lockedPaper], 'Còn ca thi chưa được chọn phòng.'],
    ['ca chưa có giám thị', [schedule('s1', 'PUBLISHED', { proctors: [] })], candidates, [lockedPaper], 'Còn ca thi chưa có giám thị.'],
    ['chưa có thí sinh', [schedule('s1', 'PUBLISHED')], [] as ExamCandidateDto[], [lockedPaper], 'Kỳ thi chưa có thí sinh nào.'],
    ['chưa có mã đề', [schedule('s1', 'PUBLISHED')], candidates, [] as ExamPaperDto[], 'Kỳ thi chưa có mã đề nào.'],
  ])('chặn khi %s', (_label, schedules, examCandidates, papers, reason) => {
    expect(getCentralizedScheduleReadiness(papers, schedules, examCandidates).blockingReason).toBe(reason)
  })

  it('chặn trong lúc dữ liệu ca thi/thí sinh chưa về', () => {
    expect(getCentralizedScheduleReadiness([lockedPaper], undefined, undefined).ready).toBe(false)
  })

  it('cho lên lịch khi mọi ca đã công bố và đủ thí sinh, mã đề', () => {
    const result = getCentralizedScheduleReadiness([lockedPaper], [schedule('s1', 'PUBLISHED')], candidates)

    expect(result).toEqual({ blockingReason: null, ready: true })
  })
})
