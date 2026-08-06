import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { ExamCandidateDto, ExamPaperDto, ExamScheduleDto } from '../../types'
import { PaperAssignmentPanel } from './PaperAssignmentPanel'

const papers = [
  { code: 'DE01', id: 'paper-1', status: 'LOCKED' },
  { code: 'DE02', id: 'paper-2', status: 'LOCKED' },
] as ExamPaperDto[]

const candidates = [
  { id: 'cand-1', scheduleId: 'sch-1', student: { fullName: 'Nguyễn Văn A' } },
  { id: 'cand-2', scheduleId: 'sch-1', student: { fullName: 'Trần Thị B' } },
] as ExamCandidateDto[]

const schedules = [{ id: 'sch-1', proctors: [], status: 'DRAFT' }] as unknown as ExamScheduleDto[]

function renderPanel(canManage: boolean) {
  renderWithProviders(
    <PaperAssignmentPanel
      canManage={canManage}
      candidates={candidates}
      examId="exam-1"
      papers={papers}
      schedules={schedules}
    />,
  )
}

describe('PaperAssignmentPanel — quyền phân đề', () => {
  it('cho phân đề khi có quyền quản lý', () => {
    renderPanel(true)

    expect(screen.getByRole('button', { name: /Áp dụng phân đề/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Chạy lại/ })).toBeInTheDocument()
  })

  it('chỉ cho xem khi không có quyền quản lý', () => {
    // Vai trò Ra đề/Duyệt đề vẫn mở được tab Xếp lịch nhưng không được ghi gì.
    renderPanel(false)

    expect(screen.queryByRole('button', { name: /Áp dụng phân đề/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Chạy lại/ })).not.toBeInTheDocument()
    screen.getAllByRole('combobox').forEach((select) => expect(select).toBeDisabled())
  })
})
