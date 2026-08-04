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

function mockGraphQL() {
  mockedPost.mockImplementation((_url, body) => {
    const { query } = body as GraphQLBody
    const payload = query.includes('examSchedules')
      ? { examSchedules: [] }
      : { examCandidates: [candidate] }
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
})
