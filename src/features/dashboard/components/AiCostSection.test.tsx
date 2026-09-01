import { QueryClient } from '@tanstack/react-query'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { SchoolAiCostTimeseries, SchoolAiSpendByUserPage } from '../api/useSchoolAiCostQueries'
import { AiCostSection } from './AiCostSection'

// requireSchoolId đọc claims trong token đã lưu; test không có token nên hai ô hạn mức sẽ im lặng
// đứng ở 0 ₫ nếu không stub. Đây là phụ thuộc THẬT của truy vấn subscriptionUsage, không phải mẹo.
jest.mock('@/shared/api', () => ({
  ...jest.requireActual('@/shared/api'),
  requireSchoolId: () => 'school-1',
}))

const mockedGraphqlPost = jest.spyOn(graphqlApiClient, 'post')

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function createTimeseries(overrides: Partial<SchoolAiCostTimeseries> = {}): SchoolAiCostTimeseries {
  return {
    granularity: 'DAY',
    points: [],
    recordedFrom: '2026-01-01T00:00:00Z',
    totalCostVnd: '7140000',
    ...overrides,
  }
}

function createSpendPage(overrides: Partial<SchoolAiSpendByUserPage> = {}): SchoolAiSpendByUserPage {
  return {
    content: [
      {
        allocatedAmountVnd: '2000000',
        fullName: 'Phạm Thu Hằng',
        quotaType: 'EXAM',
        spentVnd: '1910000',
        userId: 'user-1',
      },
      {
        allocatedAmountVnd: null,
        fullName: 'Lê Quang Vinh',
        quotaType: 'EXAM',
        spentVnd: '840000',
        userId: 'user-2',
      },
    ],
    page: 1,
    schoolWideCostVnd: '4390000',
    size: 10,
    totalElements: 2,
    totalPages: 1,
    ...overrides,
  }
}

const sentVariables: Record<string, Record<string, unknown>> = {}

function mockGraphQL(timeseries = createTimeseries(), spend = createSpendPage()) {
  for (const key of Object.keys(sentVariables)) {
    delete sentVariables[key]
  }
  mockedGraphqlPost.mockImplementation((_path, body) => {
    const request = body as { query: string; variables?: Record<string, unknown> }

    if (request.query.includes('schoolAiCostTimeseries')) {
      sentVariables.timeseries = request.variables ?? {}
      return Promise.resolve({ data: { data: { schoolAiCostTimeseries: timeseries } } })
    }
    if (request.query.includes('schoolAiSpendByUser')) {
      sentVariables.spend = request.variables ?? {}
      return Promise.resolve({ data: { data: { schoolAiSpendByUser: spend } } })
    }
    return Promise.resolve({
      data: {
        data: {
          subscriptionUsage: [
            { id: 'q1', quotaType: 'EXAM', totalAllocatedAmountVnd: 12_000_000, usedAmountVnd: 9_480_000 },
            { id: 'q2', quotaType: 'PRACTICE', totalAllocatedAmountVnd: 8_000_000, usedAmountVnd: 3_100_000 },
          ],
        },
      },
    })
  })
}

function renderSection() {
  return renderWithProviders(<AiCostSection />, { queryClient: createQueryClient() })
}

beforeEach(() => {
  mockedGraphqlPost.mockReset()
})

describe('AiCostSection', () => {
  it('hiện tổng chi phí AI bằng tiền, không phải token', async () => {
    mockGraphQL()
    renderSection()

    expect(await screen.findByText('Chi phí AI theo ngày')).toBeInTheDocument()
    expect(await screen.findByText('7.140.000 ₫')).toBeInTheDocument()
  })

  /**
   * Hai ô hạn mức đọc `subscriptionUsage` — truy vấn CÓ THẬT. Trước đây chúng ăn chung truy vấn với
   * biểu đồ, mà truy vấn đó không tồn tại, nên cả hai đứng ở 0 ₫ với mọi trường.
   */
  it('lấy hai ô hạn mức từ truy vấn gói dịch vụ, không từ biểu đồ', async () => {
    mockGraphQL()
    renderSection()

    expect(await screen.findByText('9.480.000 ₫')).toBeInTheDocument()
    expect(screen.getByText('3.100.000 ₫')).toBeInTheDocument()
  })

  /** Mặc định 30 ngày, và cửa sổ gửi lên phải là NỬA MỞ — mốc cuối là đầu ngày hôm sau. */
  it('gửi khoảng mặc định 30 ngày dưới dạng nửa mở', async () => {
    mockGraphQL()
    renderSection()

    await screen.findByText('7.140.000 ₫')

    const variables = sentVariables.timeseries
    expect(variables.granularity).toBe('DAY')
    expect(typeof variables.dateFrom).toBe('string')
    expect(typeof variables.dateTo).toBe('string')
    const spanDays =
      (new Date(variables.dateTo as string).getTime() - new Date(variables.dateFrom as string).getTime()) / 86_400_000
    expect(spanDays).toBe(30)
  })

  it('cho phép tự chọn ngày bắt đầu và ngày kết thúc', async () => {
    const user = userEvent.setup()
    mockGraphQL()
    renderSection()

    await screen.findByText('7.140.000 ₫')
    await user.click(screen.getByRole('button', { name: 'Tùy chỉnh' }))

    await user.clear(screen.getByLabelText('Từ ngày'))
    await user.type(screen.getByLabelText('Từ ngày'), '2026-08-01')
    await user.clear(screen.getByLabelText('Đến ngày'))
    await user.type(screen.getByLabelText('Đến ngày'), '2026-08-31')
    await user.click(screen.getByRole('button', { name: 'Áp dụng' }))

    // So theo MỐC THỜI GIAN chứ không theo chuỗi: helper gửi lên dạng "+07:00" (đúng ISO-8601 và
    // server parse được), nên khẳng định theo hình thức chuỗi sẽ gãy nếu ai đó đổi cách viết mà
    // không đổi ý nghĩa.
    await waitFor(() => {
      expect(new Date(sentVariables.timeseries.dateFrom as string).toISOString())
        .toBe('2026-07-31T17:00:00.000Z')
    })
    // Nửa mở: mốc cuối là 00:00 ngày 01/09 giờ VN (= 17:00Z ngày 31/08), để cả ngày 31/08 nằm trong
    // khoảng. Cắt ở 00:00 ngày 31/08 sẽ đánh rơi đúng ngày người dùng vừa chọn.
    expect(new Date(sentVariables.timeseries.dateTo as string).toISOString())
      .toBe('2026-08-31T17:00:00.000Z')
  })

  /** Khoảng dài thì gom theo tuần/tháng — người dùng chỉ chọn ngày, không phải tự đoán đơn vị. */
  it('tự chuyển sang gom theo tuần khi khoảng quá dài để vẽ theo ngày', async () => {
    const user = userEvent.setup()
    mockGraphQL()
    renderSection()

    await screen.findByText('7.140.000 ₫')
    await user.click(screen.getByRole('button', { name: 'Tùy chỉnh' }))

    await user.clear(screen.getByLabelText('Từ ngày'))
    await user.type(screen.getByLabelText('Từ ngày'), '2025-01-01')
    await user.clear(screen.getByLabelText('Đến ngày'))
    await user.type(screen.getByLabelText('Đến ngày'), '2025-12-31')
    await user.click(screen.getByRole('button', { name: 'Áp dụng' }))

    await waitFor(() => expect(sentVariables.timeseries.granularity).toBe('WEEK'))
  })

  it('xếp người tiêu nhiều nhất lên đầu bảng', async () => {
    mockGraphQL()
    renderSection()

    // Tiêu đề bảng có mặt ngay từ lần render đầu; chờ một ô DỮ LIỆU trước, nếu không phép khẳng
    // định chạy trên bản render còn đang tải.
    expect(await screen.findByText('Phạm Thu Hằng')).toBeInTheDocument()
    const rows = screen.getAllByRole('row')
    expect(within(rows[1]).getByText('Phạm Thu Hằng')).toBeInTheDocument()
    expect(within(rows[1]).getByText('1.910.000 ₫')).toBeInTheDocument()
  })

  /** Không có trần chi vẫn phải hiện — người đó vẫn tiêu tiền của trường, chỉ là không có mức để so. */
  it('vẫn liệt kê người chưa được chia trần chi', async () => {
    mockGraphQL()
    renderSection()

    expect(await screen.findByText('Lê Quang Vinh')).toBeInTheDocument()
    expect(screen.getByText('Chưa chia trần chi')).toBeInTheDocument()
  })

  /**
   * Khoản của kỳ thi tập trung không thuộc về ai nên không nằm trong bảng. Không nói ra thì người
   * đọc cộng bảng, so với biểu đồ, rồi đi tìm một khoản thất thoát không tồn tại.
   */
  it('nói rõ phần chi không thuộc trần chi của ai', async () => {
    mockGraphQL()
    renderSection()

    expect(await screen.findByText(/chi cho kỳ thi tập trung/)).toBeInTheDocument()
    expect(screen.getByText('4.390.000 ₫')).toBeInTheDocument()
  })

  /**
   * Sổ chi phí không backfill, nên khoảng nằm trước ngày bắt đầu ghi sổ vẽ ra đường phẳng ở 0 dù
   * trường có tiêu tiền thật. Hai chuyện đó phải phân biệt được.
   */
  it('cảnh báo khi khoảng đang xem nằm trước ngày hệ thống bắt đầu ghi sổ', async () => {
    const user = userEvent.setup()
    mockGraphQL(createTimeseries({ recordedFrom: '2026-08-15T00:00:00Z' }))
    renderSection()

    await screen.findByText('7.140.000 ₫')
    await user.click(screen.getByRole('button', { name: 'Tùy chỉnh' }))

    await user.clear(screen.getByLabelText('Từ ngày'))
    await user.type(screen.getByLabelText('Từ ngày'), '2026-07-01')
    await user.clear(screen.getByLabelText('Đến ngày'))
    await user.type(screen.getByLabelText('Đến ngày'), '2026-08-31')
    await user.click(screen.getByRole('button', { name: 'Áp dụng' }))

    expect(await screen.findByText(/bắt đầu ghi sổ chi phí AI từ/)).toBeInTheDocument()
  })

  it('nói rõ khi trường không tiêu đồng nào trong khoảng', async () => {
    mockGraphQL(createTimeseries({ points: [], totalCostVnd: '0' }))
    renderSection()

    expect(await screen.findByText('Trường không tiêu đồng nào cho AI trong khoảng này.')).toBeInTheDocument()
  })
})
