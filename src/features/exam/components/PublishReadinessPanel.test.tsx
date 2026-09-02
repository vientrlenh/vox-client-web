import { screen } from '@testing-library/react'
import { apiClient } from '@/shared/api'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { BulkFinalizePreview } from '@/features/grading'
import { PublishReadinessPanel } from './PublishReadinessPanel'

const mockedGet = jest.spyOn(apiClient, 'get')
const mockedGraphql = jest.spyOn(graphqlApiClient, 'post')

function preview(overrides: Partial<BulkFinalizePreview> = {}): BulkFinalizePreview {
  return {
    blockingResultIds: [],
    invalid: 0,
    openAppeals: 0,
    pendingAssigned: 0,
    pendingUnassigned: 0,
    readyToFinalize: 10,
    total: 10,
    ...overrides,
  }
}

function givenPreview(value: BulkFinalizePreview) {
  mockedGet.mockResolvedValue({ data: { data: value, message: 'ok' } } as never)
}

function givenAppeals(rows: Array<Record<string, unknown>>) {
  mockedGraphql.mockResolvedValue({
    data: {
      data: {
        examAppeals: {
          content: rows,
          page: 0,
          size: 5,
          totalElements: rows.length,
          totalPages: 1,
        },
      },
    },
  } as never)
}

function renderPanel(canFinalize: boolean) {
  renderWithProviders(<PublishReadinessPanel canFinalize={canFinalize} examId="e1" />)
}

describe('PublishReadinessPanel', () => {
  beforeEach(() => {
    mockedGet.mockReset()
    mockedGraphql.mockReset()
    givenAppeals([])
  })

  it('kỳ thi sạch thì mời bấm công bố', async () => {
    givenPreview(preview())
    renderPanel(true)

    expect(await screen.findByText('Sẵn sàng công bố kết quả')).toBeInTheDocument()
  })

  /**
   * Lý do cả bảng này tồn tại: chủ tịch kỳ thi tập trung bấm được nút công bố nhưng KHÔNG chốt sổ
   * được, nên chỗ vướng phải chỉ sang nhà trường thay vì mời họ làm một việc họ sẽ bị 403.
   */
  it('chủ tịch không chốt sổ được thì được chỉ sang nhà trường', async () => {
    givenPreview(preview({ pendingUnassigned: 3, readyToFinalize: 7 }))
    renderPanel(false)

    expect(await screen.findByText('Chưa công bố kết quả được')).toBeInTheDocument()
    expect(screen.getByText(/việc của nhà trường/)).toBeInTheDocument()
    expect(screen.queryByText(/Chốt sổ" ở trang chấm bài/)).not.toBeInTheDocument()
  })

  it('school admin thì được chỉ tới đúng nút chốt sổ', async () => {
    givenPreview(preview({ pendingUnassigned: 3, readyToFinalize: 7 }))
    renderPanel(true)

    expect(await screen.findByText(/Chốt sổ" ở trang chấm bài/)).toBeInTheDocument()
  })

  /** Con số suông là ngõ cụt cũ — phải đọc ra được đơn nào, ai đang cầm. */
  it('liệt kê đơn phúc khảo đang chặn, kèm người chấm', async () => {
    givenPreview(preview({ openAppeals: 1, readyToFinalize: 9 }))
    givenAppeals([
      {
        className: '12A2',
        examName: 'Thi thử',
        id: 'ap-1',
        originalScore: 6,
        overdue: true,
        partLabels: [],
        requestedAt: '2026-08-30T02:00:00Z',
        reviewerName: 'Cô Lan',
        status: 'GRADING',
        studentName: 'Nguyễn An',
      },
    ])
    renderPanel(false)

    expect(await screen.findByText('Nguyễn An')).toBeInTheDocument()
    expect(screen.getByText(/Đang chấm lại/)).toBeInTheDocument()
    expect(screen.getByText(/Cô Lan/)).toBeInTheDocument()
    expect(screen.getByText(/quá hạn/)).toBeInTheDocument()
  })

  /** Kỳ thi sạch không được tốn thêm một query danh sách đơn. */
  it('không hỏi danh sách đơn khi không còn đơn nào', async () => {
    givenPreview(preview())
    renderPanel(true)

    await screen.findByText('Sẵn sàng công bố kết quả')
    expect(mockedGraphql).not.toHaveBeenCalled()
  })
})
