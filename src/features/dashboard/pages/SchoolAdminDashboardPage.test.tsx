import { QueryClient } from '@tanstack/react-query'
import { screen } from '@testing-library/react'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { SchoolAdminDashboard } from '../api/useSchoolAdminDashboardQuery'
import { SchoolAdminDashboardPage } from './SchoolAdminDashboardPage'

const mockedGraphqlPost = jest.spyOn(graphqlApiClient, 'post')

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function createDashboard(overrides: Partial<SchoolAdminDashboard> = {}): SchoolAdminDashboard {
  return {
    appealStats: { pending: 12, processing: 3, published: 8, rejected: 2 },
    examStatusCounts: {
      cancelled: 0,
      closed: 3,
      draft: 1,
      inProgress: 1,
      resultsPublished: 5,
      scheduled: 2,
      total: 12,
    },
    examsAwaitingPublish: [],
    funding: {
      balanceVnd: '0',
      examQuotaRemainingVnd: '4900000',
      examQuotaTotalVnd: '12000000',
      locked: false,
      spendableVnd: '4900000',
    },
    monthlySpending: [],
    oldestPendingAppealDays: 19,
    revenue: 0,
    // Có gói đang chạy: thẻ gia hạn hiện số ngày thay vì "—", nên "—" trên trang là duy nhất và
    // test phân biệt "hàng đợi khiếu nại sạch" khỏi mọi ô trống khác được.
    subscriptionRenewal: { endDate: '2026-12-31', planName: 'Gói Chuẩn', status: 'ACTIVE' },
    tokenAllocated: 12_000_000,
    tokenUsed: 7_100_000,
    unscored: {
      aiFailed: 0,
      aiFailedNoRetryLeft: 0,
      aiFailedRetryLeft: 0,
      assignedInProgress: 0,
      assignedOverdue: 0,
      awaitingAssignment: 0,
      examCount: 0,
      oldestWaitingDays: null,
      total: 0,
    },
    ...overrides,
  }
}

function mockGraphQL(dashboard: SchoolAdminDashboard = createDashboard()) {
  mockedGraphqlPost.mockImplementation((_path, body) => {
    const request = body as { query: string }

    if (request.query.includes('schoolAdminDashboard')) {
      return Promise.resolve({ data: { data: { schoolAdminDashboard: dashboard } } })
    }
    if (request.query.includes('aiQualityReport')) {
      return Promise.resolve({
        data: {
          data: {
            aiQualityReport: {
              averageDelta: 0.7,
              byTeacher: [],
              invalidated: 0,
              maxDelta: 1.8,
              regradeRate: 18,
              regraded: 38,
              reviewed: 210,
              upheld: 172,
            },
          },
        },
      })
    }
    if (request.query.includes('nearestCentralizedExam')) {
      return Promise.resolve({ data: { data: { nearestCentralizedExam: null } } })
    }
    if (request.query.includes('questionBankStats')) {
      return Promise.resolve({ data: { data: { questionBankStats: null } } })
    }
    return Promise.resolve({ data: { data: { examStatusCounts: null } } })
  })
}

function renderPage() {
  return renderWithProviders(<SchoolAdminDashboardPage />, { queryClient: createQueryClient() })
}

beforeEach(() => {
  mockedGraphqlPost.mockReset()
})

describe('SchoolAdminDashboardPage', () => {
  /**
   * Số dư âm là thứ chặn giám thị mở ca thi bằng OTP. Trước bản này dashboard không hiện số dư ở bất
   * kỳ đâu, nên trường phát hiện mình bị khoá khi đã có một phòng đầy học sinh ngồi chờ.
   */
  it('cảnh báo ngay đầu trang khi trường đang bị khóa vì ví âm', async () => {
    mockGraphQL(
      createDashboard({
        funding: {
          balanceVnd: '-1240000',
          examQuotaRemainingVnd: '0',
          examQuotaTotalVnd: '12000000',
          locked: true,
          spendableVnd: '0',
        },
      }),
    )
    renderPage()

    expect(await screen.findByText('Trường đang bị khóa — không mở được ca thi mới')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nạp tiền vào ví' })).toBeInTheDocument()
  })

  /** Trường đang dùng bình thường không được thấy băng chặn nào — nó chỉ hiện khi có chuyện. */
  it('không hiện băng chặn khi hạn mức còn thoải mái', async () => {
    mockGraphQL()
    renderPage()

    expect(await screen.findByText('Bài chưa có điểm')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  /** Hạn mức sắp cạn vẫn phải báo TRƯỚC khi ví bị âm, chứ không đợi tới lúc đã khoá. */
  it('cảnh báo sớm khi hạn mức chấm thi sắp cạn', async () => {
    mockGraphQL(
      createDashboard({
        funding: {
          balanceVnd: '0',
          examQuotaRemainingVnd: '900000',
          examQuotaTotalVnd: '12000000',
          locked: false,
          spendableVnd: '900000',
        },
      }),
    )
    renderPage()

    expect(await screen.findByText('Hạn mức chấm thi sắp hết')).toBeInTheDocument()
  })

  /**
   * Bốn dòng của thẻ hàng đợi phải cộng lại đúng bằng tổng — backend đảm bảo các nhóm loại trừ nhau,
   * và thẻ này là chỗ người dùng nhìn thấy phép cộng đó.
   */
  it('chia bài chưa có điểm theo đúng thứ đang chặn', async () => {
    mockGraphQL(
      createDashboard({
        unscored: {
          aiFailed: 14,
          aiFailedNoRetryLeft: 5,
          aiFailedRetryLeft: 9,
          assignedInProgress: 6,
          assignedOverdue: 6,
          awaitingAssignment: 11,
          examCount: 4,
          oldestWaitingDays: 11,
          total: 37,
        },
      }),
    )
    renderPage()

    expect(await screen.findByText('AI chấm lỗi, chưa ai xử lý')).toBeInTheDocument()
    expect(screen.getByText('9 còn lượt AI')).toBeInTheDocument()
    expect(screen.getByText('5 chỉ còn chấm tay')).toBeInTheDocument()
    // Dòng này phải DẪN đi đâu đó — trước khi có màn xử lý, nó chỉ in một con số rồi bỏ mặc.
    expect(screen.getByRole('link', { name: /AI chấm lỗi, chưa ai xử lý/ })).toHaveAttribute(
      'href',
      '/school-admin/grading-failures',
    )
    expect(screen.getByText('Đã chuyển người chấm, chưa phân công ai')).toBeInTheDocument()
    expect(screen.getByText('Đã phân công nhưng quá hạn chấm')).toBeInTheDocument()
    expect(screen.getByText('11 ngày')).toBeInTheDocument()
  })

  /** Hàng đợi sạch là một trạng thái riêng, không phải một thẻ toàn số 0. */
  it('nói rõ khi mọi bài đã có điểm thay vì hiện bốn dòng rỗng', async () => {
    mockGraphQL()
    renderPage()

    expect(
      await screen.findByText('Mọi bài đã thi đều đã có điểm hoặc đang được chấm đúng hạn.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('AI chấm lỗi, chưa ai xử lý')).not.toBeInTheDocument()
  })

  /**
   * Công bố điểm chặn cả chấm lại bằng AI lẫn chuyển người chấm, nên thẻ này phải nói rõ cái giá của
   * cú bấm đó TRƯỚC khi người dùng bấm.
   */
  it('cảnh báo kỳ thi sắp công bố khi còn bài chưa có điểm', async () => {
    mockGraphQL(
      createDashboard({
        examsAwaitingPublish: [
          {
            aiFailedNoRetryLeft: 5,
            aiFailedRetryLeft: 3,
            awaitingHumanGrading: 4,
            closeAt: '2026-08-28T04:00:00Z',
            code: 'NT-2026-GK1-A11',
            examId: 'exam-1',
            name: 'Kiểm tra giữa kỳ I — Tiếng Anh 11',
            unscoredCount: 12,
          },
        ],
      }),
    )
    renderPage()

    expect(await screen.findByText('Kỳ thi sắp công bố điểm')).toBeInTheDocument()
    expect(screen.getByText('Kiểm tra giữa kỳ I — Tiếng Anh 11')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Xem kết quả kỳ thi/ })).toHaveAttribute(
      'href',
      '/school-admin/exam-results?examId=exam-1',
    )
  })

  /**
   * Hai nhóm định mức cần hai hành động khác nhau, nên hai ô dẫn sang danh sách ĐÃ lọc sẵn — mở
   * chung một danh sách là bắt người dùng tự lọc lại bằng mắt.
   */
  it('dẫn từng nhóm định mức của kỳ sắp công bố sang danh sách đã lọc sẵn', async () => {
    mockGraphQL(
      createDashboard({
        examsAwaitingPublish: [
          {
            aiFailedNoRetryLeft: 5,
            aiFailedRetryLeft: 3,
            awaitingHumanGrading: 4,
            closeAt: '2026-08-28T04:00:00Z',
            code: 'NT-2026-GK1-A11',
            examId: 'exam-1',
            name: 'Kiểm tra giữa kỳ I — Tiếng Anh 11',
            unscoredCount: 12,
          },
        ],
      }),
    )
    renderPage()

    expect(await screen.findByRole('link', { name: /AI lỗi, còn lượt chấm lại/ })).toHaveAttribute(
      'href',
      '/school-admin/grading-failures?examId=exam-1&allowance=retry-left',
    )
    expect(screen.getByRole('link', { name: /đã dùng hết lượt AI/ })).toHaveAttribute(
      'href',
      '/school-admin/grading-failures?examId=exam-1&allowance=no-retry',
    )
  })

  /** Không kỳ nào sắp công bố thì thẻ biến mất hẳn — nó là cảnh báo, không phải mục cố định. */
  it('ẩn thẻ kỳ sắp công bố khi không có kỳ nào', async () => {
    mockGraphQL()
    renderPage()

    expect(await screen.findByText('Bài chưa ra được điểm')).toBeInTheDocument()
    expect(screen.queryByText('Kỳ thi sắp công bố điểm')).not.toBeInTheDocument()
  })

  /**
   * "12 đơn chờ" không cho biết có đơn nào đang trễ hay không. Chỉ số đầu trang vì thế là SỐ NGÀY của
   * đơn cũ nhất — cùng bài học với oldestPendingRegistrationDays bên trang quản trị hệ thống.
   */
  it('đặt đồng hồ của đơn khiếu nại cũ nhất lên chỉ số đầu trang', async () => {
    mockGraphQL()
    renderPage()

    expect(await screen.findByText('Khiếu nại chờ lâu nhất')).toBeInTheDocument()
    expect(screen.getByText('19')).toBeInTheDocument()
    expect(screen.getByText(/Đơn chờ lâu nhất đã chờ/)).toBeInTheDocument()
  })

  /** Hàng đợi khiếu nại sạch phải ra "—", KHÔNG phải 0 ngày — 0 nghĩa là có đơn vừa nộp hôm nay. */
  it('phân biệt hàng đợi khiếu nại sạch với đơn vừa nộp hôm nay', async () => {
    mockGraphQL(createDashboard({ oldestPendingAppealDays: null }))
    renderPage()

    expect(await screen.findByText('Khiếu nại chờ lâu nhất')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryByText(/Đơn chờ lâu nhất đã chờ/)).not.toBeInTheDocument()
  })

  it('hiện mức lệch điểm của AI đo từ các vòng hậu kiểm', async () => {
    mockGraphQL()
    renderPage()

    expect(await screen.findByText('Chất lượng chấm của AI')).toBeInTheDocument()
    expect(screen.getByText('18%')).toBeInTheDocument()
    expect(screen.getByText('38 / 210 bài hậu kiểm bị sửa điểm')).toBeInTheDocument()
  })
})
