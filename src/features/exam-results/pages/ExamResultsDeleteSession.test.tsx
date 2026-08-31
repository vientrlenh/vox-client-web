import { QueryClient } from '@tanstack/react-query'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { apiClient } from '@/shared/api/apiClient'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { renderWithProviders } from '@/test/renderWithProviders'
import { SchoolAdminExamResultsListPage } from './ExamResultPages'

const mockedGraphql = jest.spyOn(graphqlApiClient, 'post')
const mockedDelete = jest.spyOn(apiClient, 'delete')

type GraphQLBody = { query: string }

function attempt(overrides: Record<string, unknown> = {}) {
  return {
    deletedReason: null,
    flagged: false,
    flagReason: null,
    resultStatus: 'PENDING_REVIEW',
    rubricResultBandCode: null,
    rubricResultBandName: null,
    scoringScaleMax: 10,
    scoringScaleMin: 0,
    sessionId: 'session-1',
    startedAt: '2026-08-20T01:00:00Z',
    status: 'GRADED',
    submittedAt: '2026-08-20T02:00:00Z',
    totalScore: 8,
    ...overrides,
  }
}

function candidate(attempts: unknown[]) {
  return {
    assignedPaperId: null,
    attempts,
    blockedAt: null,
    id: 'candidate-1',
    officialAttempt: null,
    officialScore: null,
    scheduleId: null,
    status: 'ATTENDED',
    student: { email: 'an@test.local', fullName: 'Nguyễn Văn An' },
    studentId: 'user-1',
  }
}

function mockBackend({ examStatus = 'IN_PROGRESS', attempts = [attempt()] } = {}) {
  mockedGraphql.mockImplementation((_url, body) => {
    const { query } = body as GraphQLBody
    if (query.includes('examCandidates')) {
      return Promise.resolve({ data: { data: { examCandidates: [candidate(attempts)] } } })
    }
    if (query.includes('exam(')) {
      return Promise.resolve({
        data: {
          data: {
            exam: { id: 'exam-1', kind: 'CENTRALIZED', name: 'Kỳ thi thử', papers: [], status: examStatus },
          },
        },
      })
    }
    return Promise.resolve({ data: { data: {} } })
  })
}

function renderPage() {
  return renderWithProviders(<SchoolAdminExamResultsListPage />, {
    queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
    route: '/school-admin/exam-results?examId=exam-1',
  })
}

/** Mở khối lượt thi của thí sinh — nút xoá nằm trong phần mở rộng theo từng người. */
async function expandCandidate(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByText('Nguyễn Văn An')
  await user.click(await screen.findByRole('button', { name: /Xem \d+ lượt/ }))
}

describe('Kết quả kỳ thi · xóa bài thi', () => {
  beforeEach(() => {
    mockedGraphql.mockReset()
    mockedDelete.mockReset()
    mockedDelete.mockResolvedValue({ data: { data: null, message: 'Xóa bài thi thành công' } })
  })

  it('bắt buộc nhập lý do và gửi lý do đó lên server', async () => {
    const user = userEvent.setup()
    mockBackend()
    renderPage()
    await expandCandidate(user)

    await user.click(await screen.findByRole('button', { name: 'Xóa bài thi này' }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Xác nhận xóa bài thi')
    // Chưa nhập lý do thì không xác nhận được.
    expect(within(dialog).getByRole('button', { name: 'Xóa bài thi' })).toBeDisabled()

    await user.type(within(dialog).getByRole('textbox'), 'Vào phòng thi lỗi')
    await user.click(within(dialog).getByRole('button', { name: 'Xóa bài thi' }))

    await waitFor(() => expect(mockedDelete).toHaveBeenCalledTimes(1))
    expect(mockedDelete).toHaveBeenCalledWith('/v1/exam-sessions/session-1', {
      data: { reason: 'Vào phòng thi lỗi' },
    })
  })

  it('bấm Không thì không gửi gì lên server', async () => {
    const user = userEvent.setup()
    mockBackend()
    renderPage()
    await expandCandidate(user)

    await user.click(await screen.findByRole('button', { name: 'Xóa bài thi này' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Không' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(mockedDelete).not.toHaveBeenCalled()
  })

  // Backend từ chối xoá khi kỳ thi đã chốt sổ (Exam.isResultsFinalized) — khoá nút kèm lý do thay
  // vì để giáo viên bấm rồi ăn lỗi.
  it.each(['CLOSED', 'RESULTS_PUBLISHED'])('khóa nút xóa khi kỳ thi ở trạng thái %s', async (examStatus) => {
    const user = userEvent.setup()
    mockBackend({ examStatus })
    renderPage()
    await expandCandidate(user)

    const button = await screen.findByRole('button', { name: 'Xóa bài thi này' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('title', expect.stringContaining('không thể xóa'))
  })

  it('kỳ thi đang diễn ra vẫn xóa được — đó là lúc cần gỡ bài hỏng nhất', async () => {
    const user = userEvent.setup()
    mockBackend({ examStatus: 'IN_PROGRESS' })
    renderPage()
    await expandCandidate(user)

    expect(await screen.findByRole('button', { name: 'Xóa bài thi này' })).toBeEnabled()
  })

  it('lượt đã xóa hiện nhãn "Đã xóa" kèm lý do, và không xóa lại được', async () => {
    const user = userEvent.setup()
    mockBackend({
      attempts: [attempt({ deletedReason: 'Vào phòng thi lỗi', status: 'DELETED' })],
    })
    renderPage()
    await expandCandidate(user)

    expect(await screen.findByText('Đã xóa')).toBeInTheDocument()
    expect(screen.getByText('Vào phòng thi lỗi')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Xóa bài thi này' })).not.toBeInTheDocument()
  })
})
