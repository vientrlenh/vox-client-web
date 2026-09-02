import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { apiClient } from '@/shared/api'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { AppealSummary } from '@/features/reevaluation'
import { ClassTestReevaluationPage } from './ClassTestReevaluationPage'

const mockedGraphql = jest.spyOn(graphqlApiClient, 'post')
const mockedPost = jest.spyOn(apiClient, 'post')

function appeal(overrides: Partial<AppealSummary> = {}): AppealSummary {
  return {
    className: '10A1',
    examName: 'Kiểm tra 15 phút',
    id: 'ap-1',
    originalScore: 6.5,
    overdue: false,
    partLabels: ['Part 1'],
    requestedAt: '2026-07-20T02:00:00Z',
    status: 'PENDING',
    studentName: 'Trần Quang Thiên',
    ...overrides,
  }
}

/** Đếm riêng số lần gọi `examAppeals` — đó là query nuôi cái bảng. */
function appealQueryCallCount() {
  return mockedGraphql.mock.calls.filter((call) =>
    ((call[1] as { query: string }).query ?? '').includes('examAppeals('),
  ).length
}

function givenAppeals(rows: AppealSummary[]) {
  mockedGraphql.mockImplementation((_url, body) => {
    const query = (body as { query: string }).query
    if (query.includes('examAppeals(')) {
      return Promise.resolve({
        data: {
          data: {
            examAppeals: {
              content: rows,
              page: 0,
              size: 20,
              totalElements: rows.length,
              totalPages: 1,
            },
          },
        },
      } as never)
    }
    return Promise.resolve({
      data: { data: { exam: { id: 'e1', name: 'Kiểm tra 15 phút' } } },
    } as never)
  })
}

function renderPage() {
  renderWithProviders(
    <Routes>
      <Route
        element={<ClassTestReevaluationPage />}
        path="/teacher/class-tests/:examId/reevaluation"
      />
    </Routes>,
    { route: '/teacher/class-tests/e1/reevaluation' },
  )
}

describe('ClassTestReevaluationPage', () => {
  beforeEach(() => {
    mockedGraphql.mockReset()
    mockedPost.mockReset()
    mockedPost.mockResolvedValue({ data: { data: 'asg-1', message: 'ok' } } as never)
  })

  it('đơn chờ duyệt chỉ có "Duyệt & nhận chấm" và "Từ chối"', async () => {
    givenAppeals([appeal()])
    renderPage()

    expect(await screen.findByRole('button', { name: /Duyệt & nhận chấm/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Từ chối/ })).toBeInTheDocument()
    // Nút "Duyệt" đơn lẻ đã biến mất — còn nó là còn hai bước.
    expect(screen.queryByRole('button', { name: /^Duyệt$/ })).not.toBeInTheDocument()
  })

  /** Cả điểm của việc gộp: không hỏi hạn chót, không hỏi lý do override. */
  it('hộp thoại xác nhận không hỏi thêm gì', async () => {
    givenAppeals([appeal()])
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: /Duyệt & nhận chấm/ }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Duyệt & nhận chấm phúc khảo')
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(dialog.querySelector('input[type="datetime-local"]')).toBeNull()
  })

  it('gọi endpoint gộp, không kèm body', async () => {
    givenAppeals([appeal()])
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: /Duyệt & nhận chấm/ }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Duyệt & nhận chấm' }),
    )

    await waitFor(() =>
      expect(mockedPost).toHaveBeenCalledWith('/v1/exam-appeals/ap-1/approve-and-claim'),
    )
  })

  /**
   * Hồi quy cho đúng lỗi đang sửa: bảng đọc qua key `exam-appeals`, mà
   * `useInvalidateReevaluation` trước đây chỉ đụng tới `reevaluation` + `grading` nên
   * hàng đứng im cho tới khi F5.
   */
  it('tải lại bảng ngay sau khi duyệt, không cần F5', async () => {
    givenAppeals([appeal()])
    renderPage()

    await screen.findByRole('button', { name: /Duyệt & nhận chấm/ })
    const before = appealQueryCallCount()

    await userEvent.click(screen.getByRole('button', { name: /Duyệt & nhận chấm/ }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Duyệt & nhận chấm' }))

    await waitFor(() => expect(appealQueryCallCount()).toBeGreaterThan(before))
  })

  /** Đơn đã ở APPROVED từ trước khi deploy vẫn phải gỡ được. */
  it('đơn đã duyệt vẫn còn nút "Nhận chấm" dự phòng', async () => {
    givenAppeals([appeal({ status: 'APPROVED' })])
    renderPage()

    expect(await screen.findByRole('button', { name: /Nhận chấm/ })).toBeInTheDocument()
  })

  it('cột phạm vi luôn hiện "Toàn bài" kể cả khi đơn có nhãn phần', async () => {
    givenAppeals([appeal({ partLabels: ['Part 1', 'Part 2'] })])
    renderPage()

    expect(await screen.findByText('Toàn bài')).toBeInTheDocument()
    expect(screen.queryByText('Part 1, Part 2')).not.toBeInTheDocument()
  })
})
