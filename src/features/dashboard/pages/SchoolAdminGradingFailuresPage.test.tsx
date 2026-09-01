import { QueryClient } from '@tanstack/react-query'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { apiClient } from '@/shared/api'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { SchoolGradingFailure, SchoolGradingFailurePage } from '../api/useSchoolGradingFailuresQuery'
import { SchoolAdminGradingFailuresPage } from './SchoolAdminGradingFailuresPage'

const mockedGraphqlPost = jest.spyOn(graphqlApiClient, 'post')
// Chuyển sang chấm tay đi REST, không GraphQL: backend chỉ phơi endpoint đó ở ExamSessionController.
const mockedRestPost = jest.spyOn(apiClient, 'post')

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function createRow(overrides: Partial<SchoolGradingFailure> = {}): SchoolGradingFailure {
  return {
    aiRetryCount: 3,
    candidateName: 'Nguyễn Minh Anh',
    className: '11A3',
    error: 'upstream timeout after 120s',
    examCode: 'NT-2026-GK1-A11',
    examId: 'exam-1',
    examName: 'Kiểm tra giữa kỳ I — Tiếng Anh 11',
    failedAt: '2026-08-27T02:14:00Z',
    schoolRetryLeft: true,
    sessionId: 'session-1',
    ...overrides,
  }
}

function createPage(overrides: Partial<SchoolGradingFailurePage> = {}): SchoolGradingFailurePage {
  return {
    content: [createRow()],
    noRetryLeftCount: 5,
    page: 1,
    retryLeftCount: 9,
    size: 20,
    totalElements: 1,
    totalPages: 1,
    ...overrides,
  }
}

/** Ghi lại variables để test khẳng định được bộ lọc thật sự đi lên server. */
const sentVariables: Record<string, unknown>[] = []
const mutationsSent: string[] = []

function mockGraphQL(page: SchoolGradingFailurePage = createPage()) {
  sentVariables.length = 0
  mutationsSent.length = 0
  mockedGraphqlPost.mockImplementation((_path, body) => {
    const request = body as { query: string; variables?: Record<string, unknown> }

    if (request.query.includes('schoolGradingFailures')) {
      sentVariables.push(request.variables ?? {})
      return Promise.resolve({ data: { data: { schoolGradingFailures: page } } })
    }
    if (request.query.includes('retryGradingExamSession')) {
      mutationsSent.push('retry')
      return Promise.resolve({ data: { data: { retryGradingExamSession: 'session-1' } } })
    }
    return Promise.resolve({ data: { data: {} } })
  })

  mockedRestPost.mockImplementation((path: string) => {
    if (path.includes('hand-off-grading')) {
      mutationsSent.push('handOff')
    }
    return Promise.resolve({ data: { data: 'result-1' } })
  })
}

function renderPage(route = '/school-admin/grading-failures') {
  return renderWithProviders(<SchoolAdminGradingFailuresPage />, { queryClient: createQueryClient(), route })
}

beforeEach(() => {
  mockedGraphqlPost.mockReset()
  mockedRestPost.mockReset()
})

describe('SchoolAdminGradingFailuresPage', () => {
  it('liệt kê bài AI chấm lỗi kèm học sinh, kỳ thi và nguyên nhân', async () => {
    mockGraphQL()
    renderPage()

    expect(await screen.findByText('Nguyễn Minh Anh')).toBeInTheDocument()
    expect(screen.getByText('11A3')).toBeInTheDocument()
    expect(screen.getByText('Kiểm tra giữa kỳ I — Tiếng Anh 11')).toBeInTheDocument()
    expect(screen.getByText('upstream timeout after 120s')).toBeInTheDocument()
    expect(screen.getByText('Dịch vụ chấm đã tự thử 3 lần')).toBeInTheDocument()
  })

  /**
   * Phiên hỏng qua nhánh DLT không mang thông điệp nào. Đó là một tình huống THẬT — để ô trống thì
   * người dùng đi tìm một lỗi hiển thị không tồn tại.
   */
  it('nói rõ khi phiên hỏng mà không kèm lý do', async () => {
    mockGraphQL(createPage({ content: [createRow({ aiRetryCount: null, error: null })] }))
    renderPage()

    expect(await screen.findByText('Không rõ nguyên nhân')).toBeInTheDocument()
    expect(screen.queryByText(/Dịch vụ chấm đã tự thử/)).not.toBeInTheDocument()
  })

  /** Hết lượt AI thì nút chấm lại phải BIẾN MẤT, không phải mờ đi rồi ném lỗi khi bấm. */
  it('không cho nhờ AI chấm lại khi phiên đã dùng hết lượt', async () => {
    mockGraphQL(createPage({ content: [createRow({ schoolRetryLeft: false })] }))
    renderPage()

    expect(await screen.findByText('Hết lượt AI')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Nhờ AI chấm lại' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Chuyển người chấm' })).toBeInTheDocument()
  })

  /** Hai số trên nút lọc đứng ngay cạnh nhau nên chúng phải là hai nhóm, không phải một tổng. */
  it('hiện số bài của từng nhóm định mức trên nút lọc', async () => {
    mockGraphQL()
    renderPage()

    // Nút lọc có mặt ngay từ lần render đầu, số đếm thì phải chờ dữ liệu về — chờ một ô của bảng
    // trước, nếu không phép khẳng định chạy trên bản render chưa có số.
    await screen.findByText('Nguyễn Minh Anh')

    expect(screen.getByRole('button', { name: /Còn lượt AI/ })).toHaveTextContent('9')
    expect(screen.getByRole('button', { name: /Chỉ còn chấm tay/ })).toHaveTextContent('5')
    expect(screen.getByRole('button', { name: /Tất cả/ })).toHaveTextContent('14')
  })

  it('đọc bộ lọc từ URL và gửi lên server', async () => {
    mockGraphQL()
    renderPage('/school-admin/grading-failures?examId=exam-1&allowance=no-retry')

    await screen.findByText('Nguyễn Minh Anh')
    expect(sentVariables[0]).toMatchObject({ examId: 'exam-1', page: 1, retryLeft: false, size: 20 })
  })

  it('không lọc theo định mức khi URL không nói gì', async () => {
    mockGraphQL()
    renderPage()

    await screen.findByText('Nguyễn Minh Anh')
    expect(sentVariables[0]).toMatchObject({ examId: null, retryLeft: null })
  })

  it('gửi yêu cầu chấm lại sau khi người dùng xác nhận', async () => {
    const user = userEvent.setup()
    mockGraphQL()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Nhờ AI chấm lại' }))
    await user.click(await screen.findByRole('button', { name: /Xác nhận|Đồng ý|OK/ }))

    await waitFor(() => expect(mutationsSent).toContain('retry'))
  })

  /** Bỏ qua hộp xác nhận thì KHÔNG được gửi gì — mỗi bài chỉ có một lượt, bấm nhầm là mất. */
  it('không gửi gì khi người dùng hủy hộp xác nhận', async () => {
    const user = userEvent.setup()
    mockGraphQL()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Nhờ AI chấm lại' }))
    await user.click(await screen.findByRole('button', { name: 'Không' }))

    expect(mutationsSent).not.toContain('retry')
  })

  it('cho biết còn phải phân công giáo viên sau khi chuyển sang chấm tay', async () => {
    const user = userEvent.setup()
    mockGraphQL()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Chuyển người chấm' }))
    await user.click(await screen.findByRole('button', { name: /Xác nhận|Đồng ý|OK/ }))

    await waitFor(() => expect(mutationsSent).toContain('handOff'))
    expect(await screen.findByText(/Vào bảng điều phối để phân công giáo viên/)).toBeInTheDocument()
  })

  it('mở màn chi tiết phiên khi cần xem sâu hơn', async () => {
    mockGraphQL()
    renderPage()

    expect(await screen.findByRole('link', { name: 'Chi tiết' })).toHaveAttribute(
      'href',
      '/school-admin/exam-results/session-1',
    )
  })

  it('nói rõ khi không còn bài nào phải xử lý', async () => {
    mockGraphQL(createPage({ content: [], noRetryLeftCount: 0, retryLeftCount: 0, totalElements: 0 }))
    renderPage()

    expect(await screen.findByText('Không còn bài nào AI chấm lỗi mà chưa ai xử lý.')).toBeInTheDocument()
  })
})
