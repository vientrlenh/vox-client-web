import type { ExamCandidateDto, ExamDto, ExamPaperDto, ExamScheduleDto } from '@/features/examCore/types'
import { getCentralizedScheduleReadiness, getExamWorkflowSteps } from './examWorkflow'

type ExamOverrides = Partial<
  Pick<ExamDto, 'blueprintId' | 'blueprintVersionId' | 'candidateCount' | 'members' | 'schedules' | 'status'>
>

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
  it('dựng đúng 5 bước theo thứ tự phân công giáo viên → chốt khung đề → tạo mã đề → thêm thí sinh → xếp lịch', () => {
    const { steps } = getExamWorkflowSteps(exam(), [lockedPaper], [schedule('s1', 'PUBLISHED')], candidates)

    expect(steps.map((step) => step.tab)).toEqual(['people', 'blueprint', 'papers', 'students', 'schedule'])
  })

  it('đủ cả 5 bước thì không còn bước hiện tại', () => {
    const result = getExamWorkflowSteps(exam(), [lockedPaper], [schedule('s1', 'PUBLISHED')], candidates)

    expect(result.completedCount).toBe(5)
    expect(result.currentStep).toBeNull()
  })

  it('thiếu người ra đề thì kẹt ở bước phân công giáo viên', () => {
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

  it('chưa có thí sinh thì kẹt ở bước thêm thí sinh', () => {
    const result = getExamWorkflowSteps(exam(), [lockedPaper], [schedule('s1', 'PUBLISHED')], [])

    expect(result.done.students).toBe(false)
    expect(result.currentStep?.tab).toBe('students')
  })

  it('còn mã đề chưa khóa thì kẹt ở bước tạo mã đề', () => {
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

  /** Chỉ khi không có CẢ candidateCount lẫn schedules mới được suy ra từ status. */
  it('thiếu hẳn dữ liệu ca thi/thí sinh thì suy ra từ trạng thái kỳ thi', () => {
    const scheduled = getExamWorkflowSteps(exam({ status: 'SCHEDULED' }), [lockedPaper])
    const draft = getExamWorkflowSteps(exam(), [lockedPaper])

    expect(scheduled.completedCount).toBe(5)
    expect(draft.done.schedule).toBe(false)
    expect(draft.done.students).toBe(false)
  })

  /**
   * Đây là chỗ trang danh sách từng lệch với trang chi tiết: nó suy bước thí sinh/xếp lịch từ status
   * nên kỳ thi DRAFT dù đã đủ thí sinh và công bố hết ca vẫn hiện "chưa làm".
   */
  it('trang danh sách đọc candidateCount + schedules trên exam thay vì suy từ status', () => {
    const fromList = getExamWorkflowSteps(
      exam({ candidateCount: 12, schedules: [{ id: 's1', status: 'PUBLISHED' }] }),
      [lockedPaper],
    )

    expect(fromList.done.students).toBe(true)
    expect(fromList.done.schedule).toBe(true)
    expect(fromList.completedCount).toBe(5)
  })

  it('cho ra cùng kết quả với trang chi tiết trên cùng một kỳ thi', () => {
    const listExam = exam({ candidateCount: 1, schedules: [{ id: 's1', status: 'PUBLISHED' }, { id: 's2', status: 'DRAFT' }] })
    const fromList = getExamWorkflowSteps(listExam, [lockedPaper])
    const fromDetail = getExamWorkflowSteps(
      listExam,
      [lockedPaper],
      [schedule('s1', 'PUBLISHED'), schedule('s2', 'DRAFT')],
      candidates,
    )

    expect(fromList.done).toEqual(fromDetail.done)
    expect(fromList.steps.map((step) => step.sublabel)).toEqual(fromDetail.steps.map((step) => step.sublabel))
  })

  it('kỳ thi đã lên lịch nhưng chưa có thí sinh thì vẫn báo thiếu thí sinh', () => {
    // Ngược lại của case trên: candidateCount = 0 phải thắng suy luận "SCHEDULED nên chắc có rồi".
    const result = getExamWorkflowSteps(exam({ candidateCount: 0, status: 'SCHEDULED' }), [lockedPaper])

    expect(result.done.students).toBe(false)
    expect(result.steps[3].sublabel).toBe('Chưa có thí sinh nào')
  })

  it('tham số truyền vào được ưu tiên hơn dữ liệu gắn sẵn trên exam', () => {
    // Trang chi tiết vừa thêm thí sinh xong: danh sách mới về sớm hơn candidateCount trong bundle.
    const result = getExamWorkflowSteps(exam({ candidateCount: 0 }), [lockedPaper], [schedule('s1', 'PUBLISHED')], candidates)

    expect(result.done.students).toBe(true)
  })

  it('trả về số liệu tóm tắt để trang danh sách hiện kỳ thi đang tới đâu', () => {
    const result = getExamWorkflowSteps(
      exam({ candidateCount: 30, schedules: [{ id: 's1', status: 'PUBLISHED' }, { id: 's2', status: 'DRAFT' }] }),
      [lockedPaper, { id: 'paper-2', status: 'IN_REVIEW' } as ExamPaperDto],
    )

    expect(result.summary).toEqual({
      candidateCount: 30,
      lockedPaperCount: 1,
      paperCount: 2,
      publishedScheduleCount: 1,
      scheduleCount: 2,
    })
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
