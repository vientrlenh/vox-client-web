import { QueryClient } from '@tanstack/react-query'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { renderWithProviders } from '@/test/renderWithProviders'
import type {
  GradingFailureGroup,
  GradingFailureOverview,
  GradingFailureSessionPage,
} from '../api/useGradingFailuresQuery'
import { SystemAdminGradingFailuresPage } from './SystemAdminGradingFailuresPage'

const mockedGraphqlPost = jest.spyOn(graphqlApiClient, 'post')

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function createGroup(overrides: Partial<GradingFailureGroup> = {}): GradingFailureGroup {
  return {
    examCount: 41,
    firstFailedAt: '2026-08-23T02:12:00Z',
    lastFailedAt: '2026-08-23T04:48:00Z',
    sampleError: 'Upstream AI service timed out after 30000ms',
    schoolCount: 9,
    sessionCount: 1147,
    signature: 'upstream ai service timed out after <n>ms',
    retryableCount: 1053,
    ...overrides,
  }
}

function createOverview(overrides: Partial<GradingFailureOverview> = {}): GradingFailureOverview {
  return {
    causeCount: 2,
    groups: [createGroup(), createGroup({ sessionCount: 96, signature: null, sampleError: null, retryableCount: 96 })],
    groupsTruncated: 0,
    retryableCount: 1149,
    schoolCount: 12,
    sessionCount: 1243,
    ...overrides,
  }
}

function createSessionPage(overrides: Partial<GradingFailureSessionPage> = {}): GradingFailureSessionPage {
  return {
    content: [
      {
        candidateName: 'Trần Minh Anh',
        error: 'Upstream AI service timed out after 30000ms',
        examId: 'exam-1',
        examName: 'Giữa kỳ I — Nói',
        failedAt: '2026-08-23T02:14:00Z',
        handedOff: false,
        retryCount: 3,
        retryable: true,
        schoolCode: 'THPT-NH-HCM',
        schoolId: 'school-1',
        schoolName: 'THPT Nguyễn Huệ',
        sessionId: 'session-1',
      },
      {
        candidateName: 'Lê Hoàng Nam',
        error: 'Upstream AI service timed out after 30000ms',
        examId: 'exam-1',
        examName: 'Giữa kỳ I — Nói',
        failedAt: '2026-08-23T02:15:00Z',
        handedOff: true,
        retryCount: 3,
        retryable: true,
        schoolCode: 'THPT-NH-HCM',
        schoolId: 'school-1',
        schoolName: 'THPT Nguyễn Huệ',
        sessionId: 'session-2',
      },
    ],
    page: 1,
    size: 10,
    totalElements: 2,
    totalPages: 1,
    ...overrides,
  }
}

const sentVariables = new Map<string, Record<string, unknown>>()

function mockGraphQL({
  overview,
  sessions,
}: { overview?: GradingFailureOverview; sessions?: GradingFailureSessionPage } = {}) {
  sentVariables.clear()
  mockedGraphqlPost.mockImplementation((_path, body) => {
    const request = body as { query: string; variables?: Record<string, unknown> }
    if (request.query.includes('gradingFailureSessions')) {
      sentVariables.set('sessions', request.variables ?? {})
      return Promise.resolve({ data: { data: { gradingFailureSessions: sessions ?? createSessionPage() } } })
    }
    sentVariables.set('overview', request.variables ?? {})
    return Promise.resolve({ data: { data: { gradingFailureOverview: overview ?? createOverview() } } })
  })
}

function renderPage(route = '/system-admin/grading-failures?from=2026-08-17&to=2026-08-30') {
  return renderWithProviders(<SystemAdminGradingFailuresPage />, { queryClient: createQueryClient(), route })
}

beforeEach(() => {
  mockedGraphqlPost.mockReset()
})

describe('SystemAdminGradingFailuresPage', () => {
  it('groups failures by cause instead of listing every session', async () => {
    mockGraphQL()
    renderPage()

    expect(await screen.findByText('Upstream AI service timed out after 30000ms')).toBeInTheDocument()
    expect(screen.getByText('1.147')).toBeInTheDocument()
    expect(screen.getByText('Không rõ nguyên nhân')).toBeInTheDocument()
    expect(screen.getByText('96')).toBeInTheDocument()
  })

  /**
   * Khoảng thời gian đọc từ query string và gửi lên dưới dạng mốc neo giờ VN, mốc cuối là 00:00 của
   * NGÀY KẾ TIẾP — cùng quy ước nửa mở với trang tổng quan. Lệch chỗ này là hai màn hình nói hai con
   * số khác nhau.
   */
  it('sends the window from the query string as Vietnam-anchored instants', async () => {
    mockGraphQL()
    renderPage()

    await waitFor(() => expect(sentVariables.get('overview')).toBeDefined())

    const variables = sentVariables.get('overview') as { dateFrom: string; dateTo: string }
    expect(variables.dateFrom).toBe('2026-08-17T00:00:00+07:00')
    expect(new Date(variables.dateTo).toISOString()).toBe('2026-08-30T17:00:00.000Z')
  })

  /** Nhóm đông nhất mở sẵn: câu hỏi "một sự cố hay nghìn sự cố" nằm ở nhóm lớn nhất. */
  it('opens the largest group and loads its sessions', async () => {
    mockGraphQL()
    renderPage()

    expect(await screen.findByText('Trần Minh Anh')).toBeInTheDocument()
    await waitFor(() => expect(sentVariables.get('sessions')).toBeDefined())
    expect((sentVariables.get('sessions') as { signature: string }).signature).toBe(
      'upstream ai service timed out after <n>ms',
    )
  })

  /**
   * Chữ ký null chọn ĐÚNG nhóm không rõ nguyên nhân, không phải "bỏ lọc" — cùng quy ước với BE, nơi
   * phép so là IS NOT DISTINCT FROM.
   */
  it('opens the unknown-cause group with a null signature', async () => {
    mockGraphQL()
    renderPage()

    fireEvent.click(await screen.findByText('Không rõ nguyên nhân'))

    await waitFor(() =>
      expect((sentVariables.get('sessions') as { signature: string | null }).signature).toBeNull(),
    )
  })

  /**
   * Đóng một nhóm phải là ĐÓNG, không phải mở nhóm không rõ nguyên nhân. Nếu state gộp "đã đóng" và
   * "nhóm chữ ký null" vào cùng một giá trị null thì bấm đóng sẽ bật nhóm kia lên.
   */
  it('closes a group instead of opening the unknown-cause one', async () => {
    mockGraphQL()
    renderPage()

    const header = await screen.findByText('Upstream AI service timed out after 30000ms')
    expect(await screen.findByText('Trần Minh Anh')).toBeInTheDocument()

    fireEvent.click(header)

    await waitFor(() => expect(screen.queryByText('Trần Minh Anh')).not.toBeInTheDocument())
    // Nhóm không rõ nguyên nhân vẫn đóng: tiêu đề còn đó nhưng bảng của nó không mở ra.
    expect(screen.getByText('Không rõ nguyên nhân')).toBeInTheDocument()
    expect(screen.queryByText('Thí sinh')).not.toBeInTheDocument()
  })

  /**
   * Hand-off cố ý không đổi trạng thái phiên, nên phiên đã giao vẫn nằm trong danh sách. Cột "Xử lý"
   * là thứ duy nhất phân biệt phiên đã có người nhận với phiên chưa ai đụng tới.
   */
  it('marks sessions already handed off to a human grader', async () => {
    mockGraphQL()
    renderPage()

    expect(await screen.findByText('Đã chuyển người chấm')).toBeInTheDocument()
    expect(screen.getByText('Chưa xử lý')).toBeInTheDocument()
  })

  it('shows the all-clear state when nothing failed', async () => {
    mockGraphQL({ overview: createOverview({ causeCount: 0, groups: [], sessionCount: 0, schoolCount: 0 }) })
    renderPage()

    expect(await screen.findByText('Không có phiên nào chấm lỗi')).toBeInTheDocument()
    expect(screen.queryByText('Nguyên nhân')).not.toBeInTheDocument()
  })

  /**
   * Nhóm bị cắt là DẤU HIỆU CHẨN ĐOÁN chứ không phải chuyện phân trang: chuẩn hóa thông điệp mà
   * không gom được thì số nhóm nở gần bằng số phiên và cả trang mất tác dụng.
   */
  it('warns when the cause grouping is producing too many groups', async () => {
    mockGraphQL({ overview: createOverview({ causeCount: 812, groupsTruncated: 810 }) })
    renderPage()

    expect(await screen.findByText(/810/)).toBeInTheDocument()
    expect(screen.getByText(/chưa gom được về cùng chữ ký/)).toBeInTheDocument()
  })

  it('reports how many sessions the published-results rule blocks', async () => {
    mockGraphQL()
    renderPage()

    expect(await screen.findByText(/phiên chấm lại được/)).toHaveTextContent('94')
  })
})
