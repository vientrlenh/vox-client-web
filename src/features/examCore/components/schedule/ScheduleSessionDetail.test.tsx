import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { ExamCandidateDto, ExamPaperDto, ExamScheduleDto } from '../../types'
import { ScheduleSessionDetail } from './ScheduleSessionDetail'

const lockedPapers = [
  { code: 'DE01', id: 'paper-1', status: 'LOCKED' },
  { code: 'DE02', id: 'paper-2', status: 'LOCKED' },
] as ExamPaperDto[]

const candidates = [
  { assignedPaperId: 'paper-1', id: 'cand-1', scheduleId: 'sch-1', student: { fullName: 'Nguyễn Văn A' } },
  { assignedPaperId: null, id: 'cand-2', scheduleId: 'sch-1', student: { fullName: 'Trần Thị B' } },
] as ExamCandidateDto[]

const schedule = {
  candidateCount: 2,
  endDate: '2026-08-08T04:00:00Z',
  id: 'sch-1',
  proctors: [],
  requiredProctorCount: 1,
  startDate: '2026-08-08T02:00:00Z',
  status: 'DRAFT',
} as unknown as ExamScheduleDto

function renderDetail(canEdit: boolean, paperDraftCount = 0) {
  renderWithProviders(
    <ScheduleSessionDetail
      canEdit={canEdit}
      candidates={candidates}
      hasUnassignedCandidates
      lockedPapers={lockedPapers}
      onAddStudent={jest.fn()}
      onApplyPaperDraft={jest.fn()}
      onAssignPapersForSchedule={jest.fn()}
      onAutoFill={jest.fn()}
      onChangePaper={jest.fn()}
      onPageChange={jest.fn()}
      onRemoveCandidate={jest.fn()}
      onRemoveCandidates={jest.fn()}
      onSearchChange={jest.fn()}
      page={1}
      paperDraftCount={paperDraftCount}
      resolvePaperId={(candidate) => candidate.assignedPaperId ?? null}
      schedule={schedule}
      search=""
    />,
  )
}

describe('ScheduleSessionDetail — quyền xếp học sinh & phân đề', () => {
  it('mở đủ thao tác xếp học sinh và phân đề khi có quyền quản lý', () => {
    renderDetail(true, 2)

    expect(screen.getByRole('button', { name: /Tự động xếp/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Thêm học sinh vào ca/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Phân đề cho ca này/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Áp dụng phân đề/ })).toBeInTheDocument()
    screen.getAllByRole('combobox').forEach((select) => expect(select).toBeEnabled())
  })

  it('chỉ cho xem khi không có quyền quản lý', () => {
    // Vai trò Ra đề/Duyệt đề vẫn mở được tab Xếp lịch nhưng không được ghi gì.
    renderDetail(false, 2)

    expect(screen.queryByRole('button', { name: /Tự động xếp/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Phân đề cho ca này/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Áp dụng phân đề/ })).not.toBeInTheDocument()
    screen.getAllByRole('combobox').forEach((select) => expect(select).toBeDisabled())
  })

  it('chỉ hiện nút áp dụng khi bản nháp phân đề có thay đổi', () => {
    renderDetail(true, 0)

    expect(screen.queryByRole('button', { name: /Áp dụng phân đề/ })).not.toBeInTheDocument()
  })
})
