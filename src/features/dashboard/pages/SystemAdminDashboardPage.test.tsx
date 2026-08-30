import { QueryClient } from '@tanstack/react-query'
import { screen, waitFor } from '@testing-library/react'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { PlatformBusinessHealth } from '../api/usePlatformBusinessHealthQuery'
import type { PlatformOperationalHealth } from '../api/usePlatformOperationalHealthQuery'
import type { SystemAdminDashboard } from '../api/useSystemAdminDashboardQuery'
import { SystemAdminDashboardPage } from './SystemAdminDashboardPage'

const mockedGraphqlPost = jest.spyOn(graphqlApiClient, 'post')

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function createSummary(overrides: Partial<SystemAdminDashboard> = {}): SystemAdminDashboard {
  return {
    activeFrameworkCount: 4,
    activeSchools: 90,
    inactiveSchools: 8,
    monthlyRevenue: [
      { amount: 120_000_000, month: '2026-07' },
      { amount: 412_500_000, month: '2026-08' },
    ],
    pendingRegistrations: 12,
    registrationsLast30Days: 46,
    registrationsLast90Days: 106,
    schoolAdminCount: 130,
    studentCount: 12_840,
    systemRubricCount: 9,
    teacherCount: 520,
    totalRevenue: 3_000_000_000,
    totalSchools: 98,
    ...overrides,
  }
}

function createOperationalHealth(
  overrides: Partial<PlatformOperationalHealth> = {},
): PlatformOperationalHealth {
  return {
    daily: [
      { day: '2026-08-01', failed: 1, graded: 120 },
      { day: '2026-08-02', failed: 0, graded: 0 },
      { day: '2026-08-03', failed: 19, graded: 80 },
    ],
    examsInProgress: 6,
    graded: 200,
    gradingFailed: 20,
    gradingQueueDepth: 41,
    sessionsInProgress: 214,
    successRatePercent: 90.9,
    ...overrides,
  }
}

function createBusinessHealth(overrides: Partial<PlatformBusinessHealth> = {}): PlatformBusinessHealth {
  return {
    aiCostVnd: 132_100_000,
    expiringSoonSchools: 14,
    grossMarginPercent: 68,
    lapsedSchools: 5,
    previousRevenueVnd: 349_200_000,
    revenueVnd: 412_500_000,
    schoolsInDebt: 3,
    subscribedSchools: 96,
    suspendedSchools: 2,
    ...overrides,
  }
}

type MockedResponses = {
  business?: PlatformBusinessHealth
  operational?: PlatformOperationalHealth
  summary?: SystemAdminDashboard
}

/** Ghi lại variables của từng query để test khẳng định được khoảng thời gian gửi lên. */
const sentVariables = new Map<string, Record<string, unknown>>()

function mockGraphQL({ business, operational, summary }: MockedResponses = {}) {
  sentVariables.clear()
  mockedGraphqlPost.mockImplementation((_path, body) => {
    const request = body as { query: string; variables?: Record<string, unknown> }

    if (request.query.includes('platformOperationalHealth')) {
      sentVariables.set('operational', request.variables ?? {})
      return Promise.resolve({
        data: { data: { platformOperationalHealth: operational ?? createOperationalHealth() } },
      })
    }
    if (request.query.includes('platformBusinessHealth')) {
      sentVariables.set('business', request.variables ?? {})
      return Promise.resolve({
        data: { data: { platformBusinessHealth: business ?? createBusinessHealth() } },
      })
    }
    return Promise.resolve({
      data: { data: { systemAdminDashboard: summary ?? createSummary() } },
    })
  })
}

function renderPage() {
  return renderWithProviders(<SystemAdminDashboardPage />, { queryClient: createQueryClient() })
}

beforeEach(() => {
  mockedGraphqlPost.mockReset()
})

describe('SystemAdminDashboardPage', () => {
  it('shows the operational health card with live counts and success rate', async () => {
    mockGraphQL()
    renderPage()

    expect(await screen.findByText('Sức khỏe vận hành')).toBeInTheDocument()
    expect(await screen.findByText('90,9')).toBeInTheDocument()
    expect(screen.getByText('lượt chấm AI thành công')).toBeInTheDocument()
    // Kỳ thi đang chạy (6) và số phiên đang thi (214) là hai con số khác nhau, phải hiện cả hai.
    expect(screen.getByText('6')).toBeInTheDocument()
    expect(screen.getByText('214')).toBeInTheDocument()
    expect(screen.getByText('41')).toBeInTheDocument()
  })

  /**
   * Chưa có lượt chấm nào KHÔNG phải là tỷ lệ thành công 0% — nếu vẽ 0% thì một hệ thống vừa khởi
   * động trông như đang hỏng toàn bộ.
   */
  it('renders an em dash instead of 0% when nothing was graded in the window', async () => {
    mockGraphQL({
      operational: createOperationalHealth({
        daily: [{ day: '2026-08-01', failed: 0, graded: 0 }],
        graded: 0,
        gradingFailed: 0,
        successRatePercent: null,
      }),
    })
    renderPage()

    expect(await screen.findByText('chưa có lượt chấm nào trong khoảng này')).toBeInTheDocument()
    expect(screen.queryByText('lượt chấm AI thành công')).not.toBeInTheDocument()
  })

  it('shows the four at-risk school buckets', async () => {
    mockGraphQL()
    renderPage()

    expect(await screen.findByText('Trường cần chú ý')).toBeInTheDocument()
    expect(screen.getByText('Sắp hết hạn (≤ 30 ngày)')).toBeInTheDocument()
    expect(screen.getByText('Đã hết hạn')).toBeInTheDocument()
    expect(screen.getByText('Bị tạm ngưng')).toBeInTheDocument()
    expect(screen.getByText('Đang nợ hạn mức')).toBeInTheDocument()
    // Không có dòng tổng: bốn nhóm chồng lấn nhau nên cộng lại là sai.
    expect(screen.getByText(/Một trường có thể xuất hiện ở nhiều dòng/)).toBeInTheDocument()
  })

  it('shows the subscription-based school count, not the manual isActive flag', async () => {
    mockGraphQL()
    renderPage()

    expect(await screen.findByText('Trường đang hoạt động')).toBeInTheDocument()
    // 96 = subscribedSchools; 90 = activeSchools của cờ isActive cũ, không được dùng nữa.
    expect(screen.getByText('96')).toBeInTheDocument()
    expect(screen.queryByText('90')).not.toBeInTheDocument()
  })

  /**
   * Điểm dễ sai nhất của cả trang: ngày người dùng chọn là ngày LỊCH VIỆT NAM, nên phải gửi lên kèm
   * offset +07:00, và mốc cuối phải là 00:00 của NGÀY KẾ TIẾP vì BE dùng khoảng nửa mở. Đóng dấu `Z`
   * sẽ đẩy cả khoảng đi 7 tiếng.
   */
  it('sends the picked range as Vietnam-anchored instants with an exclusive end', async () => {
    mockGraphQL()
    renderPage()

    await waitFor(() => expect(sentVariables.get('operational')).toBeDefined())

    const variables = sentVariables.get('operational') as { dateFrom: string; dateTo: string }
    expect(variables.dateFrom).toMatch(/^\d{4}-\d{2}-01T00:00:00\+07:00$/)

    // Mốc cuối là hôm nay + 1 ngày, tính theo lịch VN.
    const exclusiveEnd = new Date(variables.dateTo)
    const startOfToday = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00+07:00`)
    expect(exclusiveEnd.getTime()).toBeGreaterThan(startOfToday.getTime())
  })

  it('keeps the rest of the page usable when the operational query fails', async () => {
    mockedGraphqlPost.mockImplementation((_path, body) => {
      const request = body as { query: string }
      if (request.query.includes('platformOperationalHealth')) {
        return Promise.reject(new Error('boom'))
      }
      if (request.query.includes('platformBusinessHealth')) {
        return Promise.resolve({ data: { data: { platformBusinessHealth: createBusinessHealth() } } })
      }
      return Promise.resolve({ data: { data: { systemAdminDashboard: createSummary() } } })
    })
    renderPage()

    expect(await screen.findByText('Không tải được tình trạng vận hành.')).toBeInTheDocument()
    // Thẻ khác vẫn hiển thị bình thường -- một query hỏng không kéo cả trang xuống.
    expect(screen.getByText('Trường cần chú ý')).toBeInTheDocument()
    expect(screen.getByText('Đăng ký chờ duyệt')).toBeInTheDocument()
  })
})
