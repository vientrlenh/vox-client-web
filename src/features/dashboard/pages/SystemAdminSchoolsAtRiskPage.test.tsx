import { QueryClient } from '@tanstack/react-query'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { SchoolAtRisk, SchoolsAtRisk } from '../api/useSchoolsAtRiskQuery'
import { SystemAdminSchoolsAtRiskPage } from './SystemAdminSchoolsAtRiskPage'

const mockedGraphqlPost = jest.spyOn(graphqlApiClient, 'post')

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function createSchool(overrides: Partial<SchoolAtRisk> = {}): SchoolAtRisk {
  return {
    balanceVnd: -2_450_000,
    planName: 'Gói Chuẩn',
    relevantEndDate: '2026-09-04T17:00:00Z',
    schoolCode: 'THPT-NH-HCM',
    schoolId: 'school-1',
    schoolName: 'THPT Nguyễn Huệ',
    suspendedReason: null,
    ...overrides,
  }
}

function createResponse(overrides: Partial<SchoolsAtRisk> = {}): SchoolsAtRisk {
  return {
    bucket: 'EXPIRING_SOON',
    counts: { expiringSoon: 14, inDebt: 3, lapsed: 5, suspended: 2 },
    schools: { content: [createSchool()], page: 1, size: 10, totalElements: 14, totalPages: 2 },
    ...overrides,
  }
}

const sentVariables: Record<string, unknown>[] = []

function mockGraphQL(response?: SchoolsAtRisk) {
  sentVariables.length = 0
  mockedGraphqlPost.mockImplementation((_path, body) => {
    const request = body as { variables?: Record<string, unknown> }
    sentVariables.push(request.variables ?? {})
    return Promise.resolve({ data: { data: { schoolsAtRisk: response ?? createResponse() } } })
  })
}

function renderPage(route = '/system-admin/schools/attention?bucket=EXPIRING_SOON') {
  return renderWithProviders(<SystemAdminSchoolsAtRiskPage />, { queryClient: createQueryClient(), route })
}

beforeEach(() => {
  mockedGraphqlPost.mockReset()
})

describe('SystemAdminSchoolsAtRiskPage', () => {
  it('opens the bucket named in the query string', async () => {
    mockGraphQL()
    renderPage('/system-admin/schools/attention?bucket=SUSPENDED')

    await waitFor(() => expect(sentVariables[0]).toBeDefined())
    expect(sentVariables[0].bucket).toBe('SUSPENDED')
  })

  /** Nhóm lạ trên URL không được làm trắng trang — rơi về nhóm đầu là hành vi an toàn. */
  it('falls back to the first bucket when the query string is not a known bucket', async () => {
    mockGraphQL()
    renderPage('/system-admin/schools/attention?bucket=NOT_A_BUCKET')

    await waitFor(() => expect(sentVariables[0]).toBeDefined())
    expect(sentVariables[0].bucket).toBe('EXPIRING_SOON')
  })

  /**
   * Bốn thẻ đếm hiện ở MỌI nhóm, không chỉ nhóm đang mở: người vận hành cần thấy toàn cảnh trước khi
   * quyết định xem nhóm nào.
   */
  it('shows all four bucket counts regardless of which one is open', async () => {
    mockGraphQL()
    renderPage()

    // Truy theo nút chứ không theo text: nhãn nhóm đang mở còn xuất hiện lần nữa ở tiêu đề bảng.
    expect(await screen.findByRole('button', { name: /Sắp hết hạn.*14/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Đã hết hạn.*5/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Bị đình chỉ.*2/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Đang nợ hạn mức.*3/ })).toBeInTheDocument()
  })

  it('switches bucket without leaving the page', async () => {
    mockGraphQL()
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: /Đã hết hạn/ }))

    await waitFor(() => expect(sentVariables.some((v) => v.bucket === 'LAPSED')).toBe(true))
  })

  /**
   * Lý do đình chỉ chỉ có nghĩa ở nhóm SUSPENDED, và ở đó nó thay chỗ cột ngày hết hạn — đó là thông
   * tin đáng giá nhất của nhóm, không phải một cột phụ.
   */
  it('swaps the expiry column for the suspension reason in the suspended bucket', async () => {
    mockGraphQL(
      createResponse({
        bucket: 'SUSPENDED',
        schools: {
          content: [createSchool({ suspendedReason: 'Chậm thanh toán quá 60 ngày' })],
          page: 1,
          size: 10,
          totalElements: 2,
          totalPages: 1,
        },
      }),
    )
    renderPage('/system-admin/schools/attention?bucket=SUSPENDED')

    expect(await screen.findByText('Lý do đình chỉ')).toBeInTheDocument()
    expect(screen.getByText('Chậm thanh toán quá 60 ngày')).toBeInTheDocument()
    expect(screen.queryByText('Hết hạn vào')).not.toBeInTheDocument()
  })

  it('marks a negative wallet balance as debt', async () => {
    mockGraphQL()
    renderPage()

    const balance = await screen.findByText('-2.450.000 ₫')
    expect(balance).toHaveClass('text-red-600')
  })

  /** Bốn nhóm chồng lấn nhau, nên trang phải nói rõ đừng cộng — cùng lời với thẻ trên trang tổng quan. */
  it('warns that the four counts must not be summed', async () => {
    mockGraphQL()
    renderPage()

    expect(await screen.findByText(/Ba nhóm đầu loại trừ nhau/)).toBeInTheDocument()
    expect(screen.getByText(/chưa từng mua gói nào không nằm trong nhóm nào/)).toBeInTheDocument()
  })

  it('shows an empty state for a bucket with no schools', async () => {
    mockGraphQL(
      createResponse({
        counts: { expiringSoon: 0, inDebt: 0, lapsed: 0, suspended: 0 },
        schools: { content: [], page: 1, size: 10, totalElements: 0, totalPages: 0 },
      }),
    )
    renderPage()

    expect(await screen.findByText(/Không có trường nào ở nhóm/)).toBeInTheDocument()
  })

  it('sends the search keyword to the backend', async () => {
    mockGraphQL()
    renderPage()

    fireEvent.change(await screen.findByPlaceholderText('Tìm theo tên hoặc mã trường'), {
      target: { value: 'nguyễn huệ' },
    })

    await waitFor(() => expect(sentVariables.some((v) => v.keyword === 'nguyễn huệ')).toBe(true))
  })

  /** Ô tìm kiếm trống phải gửi null, không phải chuỗi rỗng — BE coi chuỗi rỗng là "không lọc" nhưng
   * gửi null nói đúng ý định hơn và tránh một cache key thừa. */
  it('sends a null keyword when the search box is empty', async () => {
    mockGraphQL()
    renderPage()

    await waitFor(() => expect(sentVariables[0]).toBeDefined())
    expect(sentVariables[0].keyword).toBeNull()
  })
})
