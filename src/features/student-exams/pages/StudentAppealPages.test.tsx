import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { renderWithProviders } from '@/test/renderWithProviders'
import { StudentAppealDetailPage } from './StudentAppealPages'

const mockedPost = jest.spyOn(graphqlApiClient, 'post')

function appeal(overrides: Record<string, unknown> = {}) {
  return {
    approvedAt: null,
    className: 'IELTS 01',
    decisionNote: null,
    deadline: '2026-08-20T10:00:00Z',
    examName: 'Kỳ thi giữa kỳ',
    finalScore: null,
    id: 'appeal-1',
    items: [],
    notes: null,
    originalScore: 6.5,
    overdue: false,
    reason: 'Điểm chưa phản ánh đúng bài nói',
    requestedAt: '2026-08-10T03:00:00Z',
    resolvedAt: null,
    scoringScaleMax: 9,
    scoringScaleMin: 0,
    status: 'PENDING',
    ...overrides,
  }
}

function renderDetailPage(data: Record<string, unknown>) {
  mockedPost.mockResolvedValue({ data: { data: { myAppeal: data } } } as never)
  return renderWithProviders(
    <Routes>
      <Route element={<StudentAppealDetailPage />} path="/student/appeals/:appealId" />
    </Routes>,
    { route: '/student/appeals/appeal-1' },
  )
}

describe('StudentAppealDetailPage', () => {
  beforeEach(() => {
    mockedPost.mockReset()
  })

  /**
   * Lỗi đang sửa: `decisionNote` chỉ được vẽ trong khối `status === 'PUBLISHED'`, nên đơn bị
   * từ chối chỉ còn cái badge đỏ — học sinh không biết vì sao bị từ chối dù BE bắt buộc
   * người duyệt nhập lý do.
   */
  it('hiện lý do từ chối khi đơn bị từ chối', async () => {
    renderDetailPage(appeal({
      decisionNote: 'Bài nói đã được chấm đúng thang điểm, không có sai sót.',
      resolvedAt: '2026-08-11T04:00:00Z',
      status: 'REJECTED',
    }))

    expect(await screen.findByText('Lý do từ chối')).toBeInTheDocument()
    expect(screen.getByText('Bài nói đã được chấm đúng thang điểm, không có sai sót.')).toBeInTheDocument()
  })

  // Điểm không đổi khi bị từ chối — nói rõ để học sinh không chờ điểm mới.
  it('nói rõ điểm giữ nguyên khi đơn bị từ chối', async () => {
    renderDetailPage(appeal({
      decisionNote: 'Không đủ căn cứ phúc khảo.',
      resolvedAt: '2026-08-11T04:00:00Z',
      status: 'REJECTED',
    }))

    expect(await screen.findByText(/Điểm giữ nguyên/)).toBeInTheDocument()
    expect(screen.queryByText('Điểm sau phúc khảo')).not.toBeInTheDocument()
  })

  it('đơn chờ xử lý thì chưa có khối quyết định nào', async () => {
    renderDetailPage(appeal())

    expect(await screen.findByText('Lý do phúc khảo')).toBeInTheDocument()
    expect(screen.queryByText('Lý do từ chối')).not.toBeInTheDocument()
    expect(screen.queryByText('Ghi chú công bố')).not.toBeInTheDocument()
  })

  it('đơn đã công bố vẫn hiện điểm mới và ghi chú công bố', async () => {
    renderDetailPage(appeal({
      approvedAt: '2026-08-11T04:00:00Z',
      decisionNote: 'Điểm phần 2 được nâng sau khi chấm lại.',
      finalScore: 7.5,
      resolvedAt: '2026-08-12T04:00:00Z',
      status: 'PUBLISHED',
    }))

    expect(await screen.findByText('Ghi chú công bố')).toBeInTheDocument()
    expect(screen.getByText('Điểm sau phúc khảo')).toBeInTheDocument()
    expect(screen.queryByText('Lý do từ chối')).not.toBeInTheDocument()
  })
})
