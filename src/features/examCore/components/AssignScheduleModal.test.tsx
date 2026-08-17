import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { ExamScheduleDto } from '../types'
import { AssignScheduleModal } from './AssignScheduleModal'

const schedules = [
  {
    candidateCount: 3,
    endDate: '2026-08-08T04:00:00Z',
    id: 'sch-1',
    proctors: [],
    requiredProctorCount: 1,
    room: { code: 'Ca 1' },
    startDate: '2026-08-08T02:00:00Z',
    status: 'DRAFT',
  },
  {
    candidateCount: 5,
    endDate: '2026-08-09T04:00:00Z',
    id: 'sch-2',
    proctors: [],
    requiredProctorCount: 1,
    room: { code: 'Ca 2' },
    startDate: '2026-08-09T02:00:00Z',
    status: 'PUBLISHED',
  },
] as unknown as ExamScheduleDto[]

function renderModal(conflictReasonByScheduleId?: Map<string, string>) {
  renderWithProviders(
    <AssignScheduleModal
      candidateName="Nguyễn Văn A"
      conflictReasonByScheduleId={conflictReasonByScheduleId}
      onClose={jest.fn()}
      onSelect={jest.fn()}
      schedules={schedules}
    />,
  )
}

/** Nút của một ca — mỗi ca hiện đúng một nút, nhận diện qua nhãn ca. */
function scheduleButton(label: string) {
  return screen.getByText(label).closest('button') as HTMLButtonElement
}

describe('AssignScheduleModal', () => {
  it('should_enable_every_assignable_schedule_when_there_is_no_conflict', () => {
    renderModal()

    expect(scheduleButton('Ca 1')).toBeEnabled()
    expect(scheduleButton('Ca 2')).toBeEnabled()
  })

  it('should_disable_the_schedule_that_clashes_with_the_student_timetable', () => {
    renderModal(new Map([['sch-2', 'Học sinh đã có ca thi khác trùng giờ']]))

    expect(scheduleButton('Ca 2')).toBeDisabled()
    // Ca không vướng vẫn phải chọn được — làm mờ đúng một ca, không khoá cả màn.
    expect(scheduleButton('Ca 1')).toBeEnabled()
  })

  it('should_explain_why_a_schedule_is_disabled', () => {
    renderModal(new Map([['sch-2', 'Học sinh đã có ca thi khác trùng giờ']]))

    expect(screen.getByText('Học sinh đã có ca thi khác trùng giờ')).toBeInTheDocument()
  })

  it('should_keep_the_current_schedule_badge_instead_of_a_conflict_reason', () => {
    // Ca hiện tại của chính thí sinh không phải là trùng giờ — xếp lại vào đó chỉ là no-op,
    // và backend cũng tự loại ca này khỏi phép kiểm tra.
    renderWithProviders(
      <AssignScheduleModal
        candidateName="Nguyễn Văn A"
        conflictReasonByScheduleId={new Map([['sch-1', 'Học sinh đã có ca thi khác trùng giờ']])}
        currentScheduleId="sch-1"
        onClose={jest.fn()}
        onSelect={jest.fn()}
        schedules={schedules}
      />,
    )

    expect(screen.getByText('Ca hiện tại')).toBeInTheDocument()
    expect(screen.queryByText('Học sinh đã có ca thi khác trùng giờ')).not.toBeInTheDocument()
  })
})
