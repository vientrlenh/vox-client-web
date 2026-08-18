import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { ExamCandidateDto, ExamScheduleDto } from '../../types'
import { AddStudentToRoomModal } from './AddStudentToRoomModal'

const candidates = [
  { id: 'cand-1', scheduleId: null, student: { email: 'a@vox.test', fullName: 'Nguyễn Văn A' }, studentId: 'stu-1' },
  { id: 'cand-2', scheduleId: null, student: { email: 'b@vox.test', fullName: 'Trần Thị B' }, studentId: 'stu-2' },
] as unknown as ExamCandidateDto[]

const schedule = {
  candidateCount: 0,
  endDate: '2026-08-08T04:00:00Z',
  id: 'sch-1',
  proctors: [],
  requiredProctorCount: 1,
  room: { code: 'P101' },
  startDate: '2026-08-08T02:00:00Z',
  status: 'DRAFT',
} as unknown as ExamScheduleDto

function renderModal(conflictReasonByCandidateId?: Map<string, string>, onAssign = jest.fn()) {
  renderWithProviders(
    <AddStudentToRoomModal
      candidates={candidates}
      conflictReasonByCandidateId={conflictReasonByCandidateId}
      onAssign={onAssign}
      onClose={jest.fn()}
      schedule={schedule}
      schedules={[schedule]}
    />,
  )
  return onAssign
}

function checkboxOf(name: string) {
  return screen.getByText(name).closest('label')?.querySelector('input') as HTMLInputElement
}

describe('AddStudentToRoomModal', () => {
  it('should_enable_every_student_when_there_is_no_conflict', () => {
    renderModal()

    expect(checkboxOf('Nguyễn Văn A')).toBeEnabled()
    expect(checkboxOf('Trần Thị B')).toBeEnabled()
  })

  it('should_disable_the_student_who_already_has_a_clashing_schedule', () => {
    renderModal(new Map([['cand-2', 'Đã có ca thi khác trùng giờ với ca này']]))

    expect(checkboxOf('Trần Thị B')).toBeDisabled()
    expect(checkboxOf('Nguyễn Văn A')).toBeEnabled()
    expect(screen.getByText('Đã có ca thi khác trùng giờ với ca này')).toBeInTheDocument()
  })

  /**
   * "Chọn tất cả" mà quét cả người trùng giờ thì cả lượt xếp bị backend từ chối (xếp hàng loạt là
   * all-or-nothing), nên người vướng phải nằm ngoài phép chọn nhanh này.
   */
  it('should_not_sweep_conflicting_students_into_select_all', async () => {
    const onAssign = renderModal(new Map([['cand-2', 'Đã có ca thi khác trùng giờ với ca này']]))

    await userEvent.click(screen.getByText('Chọn tất cả 1 kết quả đang hiện'))
    await userEvent.click(screen.getByRole('button', { name: /Thêm 1 học sinh vào ca/ }))

    expect(onAssign).toHaveBeenCalledWith(['cand-1'])
  })
})
