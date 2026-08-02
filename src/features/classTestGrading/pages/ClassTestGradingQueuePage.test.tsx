import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { GradingTask } from '@/features/grading'
import { ClassTestGradingQueuePage } from './ClassTestGradingQueuePage'

const mockedPost = jest.spyOn(graphqlApiClient, 'post')

function task(overrides: Partial<GradingTask> = {}): GradingTask {
  return {
    assignmentId: 'a1',
    candidateResultId: 'r1',
    className: '10A1',
    currentScore: 6.5,
    examName: 'Kiểm tra 15 phút',
    flagged: false,
    overdue: false,
    partCount: 3,
    resultCode: 'A2041F3C',
    resultStatus: 'PENDING_REVIEW',
    roundType: 'INITIAL',
    status: 'ASSIGNED',
    studentName: 'Trần Quang Thiên',
    ...overrides,
  }
}

/**
 * Cả ba query của màn (danh sách, thống kê, thông tin bài kiểm tra) đi qua cùng một
 * client, nên phân nhánh theo tên operation thay vì thứ tự gọi.
 */
function givenTasks(tasks: GradingTask[]) {
  mockedPost.mockImplementation((_url, body) => {
    const query = (body as { query: string }).query
    if (query.includes('myClassTestGradingTasks(')) {
      return Promise.resolve({
        data: {
          data: {
            myClassTestGradingTasks: {
              content: tasks,
              page: 0,
              size: 20,
              totalElements: tasks.length,
              totalPages: 1,
            },
          },
        },
      } as never)
    }
    if (query.includes('classTestGradingStats(')) {
      return Promise.resolve({
        data: { data: { classTestGradingStats: { assigned: 1, overdue: 0, total: 1, unassigned: 0 } } },
      } as never)
    }
    return Promise.resolve({ data: { data: { exam: { id: 'e1', name: 'Kiểm tra 15 phút' } } } } as never)
  })
}

function renderPage() {
  renderWithProviders(
    <Routes>
      <Route element={<ClassTestGradingQueuePage />} path="/teacher/class-tests/:examId/grading" />
    </Routes>,
    { route: '/teacher/class-tests/e1/grading' },
  )
}

describe('ClassTestGradingQueuePage', () => {
  beforeEach(() => {
    mockedPost.mockReset()
  })

  /** Điểm khác then chốt so với hàng đợi kỳ thi tập trung, vốn chấm ẩn danh. */
  it('hiện tên học sinh và lớp thay cho mã bài ẩn danh', async () => {
    givenTasks([task()])
    renderPage()

    expect(await screen.findByText('Trần Quang Thiên')).toBeInTheDocument()
    expect(screen.getByText(/Lớp 10A1/)).toBeInTheDocument()
  })

  /**
   * Lưới an toàn: nếu học sinh không còn thuộc lớp nào đang hoạt động thì BE trả
   * `className`/`studentName` null — dòng vẫn phải mở được, không được rỗng.
   */
  it('lùi về mã bài khi thiếu dữ liệu học sinh', async () => {
    givenTasks([task({ className: null, studentName: null })])
    renderPage()

    expect(await screen.findByText('Bài #A2041F3C')).toBeInTheDocument()
  })

  it('chỉ bật nút Nhận chấm sau khi đã chọn bài', async () => {
    givenTasks([task()])
    renderPage()

    await screen.findByText('Trần Quang Thiên')
    expect(screen.getByRole('button', { name: /Nhận chấm/ })).toBeDisabled()
  })
})
