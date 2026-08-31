import { QueryClient } from '@tanstack/react-query'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { renderWithProviders } from '@/test/renderWithProviders'
import { CandidatesTab } from './CandidatesTab'

const mockedPost = jest.spyOn(graphqlApiClient, 'post')

type GraphQLBody = { query: string; variables: Record<string, unknown> }

const candidate = {
  assignedPaperId: 'paper-1',
  attempts: [
    { flagged: false, sessionId: 'session-1', startedAt: '2026-08-04T01:00:00Z', status: 'IN_PROGRESS' },
  ],
  blockedAt: null,
  id: 'candidate-1',
  scheduleId: 'schedule-1',
  status: 'ATTENDED',
  student: { email: 'an@example.com', fullName: 'Nguyễn Văn An' },
  studentId: 'student-1',
}

// Thí sinh vừa được thêm: chưa xếp ca, chưa có bài thi nào — đúng trạng thái mà nút "..." từng chết.
const freshCandidate = {
  assignedPaperId: null,
  attempts: [],
  blockedAt: null,
  id: 'candidate-2',
  scheduleId: null,
  status: 'ASSIGNED',
  student: { email: 'binh@example.com', fullName: 'Trần Văn Bình' },
  studentId: 'student-2',
}

const schedule = {
  candidateCount: 0,
  endDate: '2026-08-05T03:00:00Z',
  examId: 'exam-1',
  id: 'schedule-1',
  proctors: [],
  requiredProctorCount: 1,
  room: { code: 'P.101', id: 'room-1', name: 'Phòng máy 1' },
  schoolRoomId: 'room-1',
  startDate: '2026-08-05T01:00:00Z',
  status: 'PUBLISHED',
}

function mockGraphQL(
  candidates: unknown[] = [candidate],
  schedules: unknown[] = [],
  studentBusySlots: unknown[] = [],
) {
  mockedPost.mockImplementation((_url, body) => {
    const { query } = body as GraphQLBody
    let payload: Record<string, unknown> = { examCandidates: candidates }
    if (query.includes('examSchedules')) {
      payload = { examSchedules: schedules }
    } else if (query.includes('studentBusySlots')) {
      payload = { studentBusySlots }
    }
    return Promise.resolve({ data: { data: payload } })
  })
}

function renderTab(overrides: Record<string, unknown> = {}) {
  return renderWithProviders(
    <CandidatesTab canManage examId="exam-1" examKind="CLASS_TEST" papers={[]} {...overrides} />,
    // QueryClient của app retry 1 lần; chờ hết retry là quá timeout mặc định của findBy*.
    { queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
  )
}

describe('CandidatesTab', () => {
  beforeEach(() => {
    mockedPost.mockReset()
    mockGraphQL()
  })

  it('bài chưa bắt đầu: cho thêm và nhập thí sinh', async () => {
    renderTab()

    expect(await screen.findByText('Nguyễn Văn An')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thêm thí sinh' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nhập theo lớp/khối' })).toBeInTheDocument()
    expect(screen.queryByText(/Bài kiểm tra đã bắt đầu/)).not.toBeInTheDocument()
  })

  it('bài đã bắt đầu: ẩn lối sửa danh sách và báo lý do', async () => {
    renderTab({ locked: true })

    expect(await screen.findByText('Nguyễn Văn An')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Thêm thí sinh' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Nhập theo lớp/khối' })).not.toBeInTheDocument()
    expect(screen.getByText(/Bài kiểm tra đã bắt đầu/)).toBeInTheDocument()
  })

  // Backend cố ý để mở các thao tác này trong lúc thi (xem ExamEditingGuard) — khoá theo
  // `locked` sẽ làm giáo viên mất khả năng xử lý sự cố giữa giờ.
  it('bài đã bắt đầu: vẫn giữ thao tác giám thị trên từng thí sinh', async () => {
    const user = userEvent.setup()
    renderTab({ locked: true })

    await user.click(await screen.findByRole('button', { name: 'Thao tác cho Nguyễn Văn An' }))

    expect(await screen.findByRole('menuitem', { name: 'Buộc kết thúc' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Đánh dấu nghi vấn' })).toBeInTheDocument()
  })

  // Trước đây menu chỉ có thao tác giám thị, nên thí sinh chưa thi làm nút "..." rỗng → disabled,
  // trông y hệt nút hỏng.
  it('thí sinh chưa xếp ca: mở được menu với thao tác xếp ca và xóa', async () => {
    const user = userEvent.setup()
    mockGraphQL([freshCandidate], [schedule])
    renderTab()

    await user.click(await screen.findByRole('button', { name: 'Thao tác cho Trần Văn Bình' }))

    expect(await screen.findByRole('menuitem', { name: 'Xếp ca thi' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Xóa khỏi kỳ thi' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Bỏ khỏi ca thi' })).not.toBeInTheDocument()
  })

  it('thí sinh chưa xếp ca: chọn "Xếp ca thi" mở danh sách ca khả dụng', async () => {
    const user = userEvent.setup()
    mockGraphQL([freshCandidate], [schedule])
    renderTab()

    await user.click(await screen.findByRole('button', { name: 'Thao tác cho Trần Văn Bình' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Xếp ca thi' }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /P\.101/ })).toBeInTheDocument()
  })

  // Backend vẫn là chỗ chặn thật; đây chỉ là lớp tiện dụng để không phải bấm rồi ăn lỗi.
  it('thí sinh đã có ca thi khác trùng giờ: ca bị làm mờ kèm lý do', async () => {
    const user = userEvent.setup()
    mockGraphQL([freshCandidate], [schedule], [
      {
        busyScheduleId: 'schedule-9',
        endDate: '2026-08-05T03:00:00Z',
        startDate: '2026-08-05T01:00:00Z',
        studentId: 'student-2',
        targetScheduleId: 'schedule-1',
      },
    ])
    renderTab()

    await user.click(await screen.findByRole('button', { name: 'Thao tác cho Trần Văn Bình' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Xếp ca thi' }))

    expect(await screen.findByText('Học sinh đã có ca thi khác trùng giờ')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /P\.101/ })).toBeDisabled()
  })

  it('bài đã bắt đầu: không cho sửa danh sách từ menu của thí sinh', async () => {
    const user = userEvent.setup()
    mockGraphQL([freshCandidate], [schedule])
    renderTab({ locked: true })

    const trigger = await screen.findByRole('button', { name: 'Thao tác cho Trần Văn Bình' })
    expect(trigger).toBeDisabled()
    expect(trigger).toHaveAttribute('title', expect.stringContaining('Kỳ thi đã bắt đầu'))

    await user.click(trigger)
    expect(screen.queryByRole('menuitem', { name: 'Xếp ca thi' })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Xóa khỏi kỳ thi' })).not.toBeInTheDocument()
  })

  it('không có quyền quản lý: nút thao tác bị khóa và nói rõ lý do', async () => {
    mockGraphQL([freshCandidate], [schedule])
    renderTab({ canManage: false })

    const trigger = await screen.findByRole('button', { name: 'Thao tác cho Trần Văn Bình' })
    expect(trigger).toBeDisabled()
    expect(trigger).toHaveAttribute('title', expect.stringContaining('không có quyền'))
  })

  // Bàn phím không bật bộ gõ tiếng Việt là mặc định — lọc phân biệt dấu thì giáo viên gõ tên
  // học sinh của chính mình mà báo "không tìm thấy".
  it('ô tìm kiếm: gõ không dấu vẫn ra tên có dấu', async () => {
    const user = userEvent.setup()
    renderTab()

    await screen.findByText('Nguyễn Văn An')
    await user.type(screen.getByPlaceholderText('Tìm theo tên hoặc email...'), 'nguyen van an')

    expect(await screen.findByText('Nguyễn Văn An')).toBeInTheDocument()
    expect(screen.queryByText('Không tìm thấy thí sinh phù hợp.')).not.toBeInTheDocument()
  })
})
