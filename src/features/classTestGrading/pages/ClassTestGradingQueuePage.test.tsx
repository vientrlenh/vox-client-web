import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { GradingAssignmentRow, GradingTask } from '@/features/grading'
import { ClassTestGradingQueuePage } from './ClassTestGradingQueuePage'

const mockedPost = jest.spyOn(graphqlApiClient, 'post')

function task(overrides: Partial<GradingTask> = {}): GradingTask {
  return {
    assignmentId: 'a1',
    attemptCount: 1,
    attemptNo: 1,
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

function result(overrides: Partial<GradingAssignmentRow> = {}): GradingAssignmentRow {
  return {
    attemptCount: 1,
    attemptNo: 1,
    candidateResultId: 'r1',
    className: '10A1',
    examName: 'Kiểm tra 15 phút',
    flagged: false,
    hasOpenAppeal: false,
    overdue: false,
    resultCode: 'A2041F3C',
    resultStatus: 'PENDING_REVIEW',
    studentName: 'Trần Quang Thiên',
    totalScore: 6.5,
    ...overrides,
  }
}

/**
 * Bốn query của màn (mọi bài, hàng đợi của tôi, thống kê, thông tin bài kiểm tra) đi qua
 * cùng một client, nên phân nhánh theo tên operation thay vì thứ tự gọi.
 */
function givenData(rows: GradingAssignmentRow[], tasks: GradingTask[] = []) {
  mockedPost.mockImplementation((_url, body) => {
    const query = (body as { query: string }).query
    if (query.includes('classTestGradingResults(')) {
      return Promise.resolve({
        data: {
          data: {
            classTestGradingResults: {
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
        data: {
          data: { classTestGradingStats: { assigned: 1, overdue: 0, total: 1, unassigned: 0 } },
        },
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
    givenData([result()])
    renderPage()

    expect(await screen.findByText('Trần Quang Thiên')).toBeInTheDocument()
    expect(screen.getByText(/Lớp 10A1/)).toBeInTheDocument()
  })

  /**
   * Lưới an toàn: nếu học sinh không còn thuộc lớp nào đang hoạt động thì BE trả
   * `className`/`studentName` null — dòng vẫn phải mở được, không được rỗng.
   */
  it('lùi về mã bài khi thiếu dữ liệu học sinh', async () => {
    givenData([result({ className: null, studentName: null })])
    renderPage()

    expect(await screen.findByText('Bài #A2041F3C')).toBeInTheDocument()
  })

  it('chỉ bật nút Nhận chấm sau khi đã chọn bài', async () => {
    givenData([result()])
    renderPage()

    await screen.findByText('Trần Quang Thiên')
    expect(screen.getByRole('button', { name: /Nhận chấm/ })).toBeDisabled()
  })

  /**
   * Lý do màn mặc định liệt kê MỌI bài chứ không chỉ hàng đợi phân công: lượt thi thứ
   * hai thường được AI chấm sạch nên không có phân công, và trước đây nó biến mất khỏi
   * màn chấm.
   */
  it('hiện đủ mọi lượt thi của cùng một học sinh, kèm nhãn lượt', async () => {
    givenData([
      result({ attemptCount: 2, attemptNo: 1, candidateResultId: 'r1' }),
      result({
        attemptCount: 2,
        attemptNo: 2,
        candidateResultId: 'r2',
        resultCode: 'B1130C4D',
        resultStatus: 'RELEASED',
      }),
    ])
    renderPage()

    expect(await screen.findByText('Lượt 1/2')).toBeInTheDocument()
    expect(screen.getByText('Lượt 2/2')).toBeInTheDocument()
  })

  /** Thi một lượt thì gắn "Lượt 1/1" lên mọi dòng chỉ là nhiễu. */
  it('không gắn nhãn lượt khi học sinh chỉ thi một lượt', async () => {
    givenData([result()])
    renderPage()

    await screen.findByText('Trần Quang Thiên')
    expect(screen.queryByText('Lượt 1/1')).not.toBeInTheDocument()
  })

  it('cho nhận chấm lượt thi chưa có phân công', async () => {
    givenData([result({ attemptCount: 2, attemptNo: 2, resultStatus: 'RELEASED' })])
    renderPage()

    await screen.findByText('Trần Quang Thiên')
    await userEvent.click(screen.getByRole('checkbox', { name: /Chọn bài của Trần Quang Thiên/ }))

    expect(screen.getByRole('button', { name: /Nhận chấm/ })).toBeEnabled()
  })

  /** Nhận chấm bài đang có người chấm là ăn lỗi từ BE — khoá ngay ở ô tick. */
  it('khoá ô chọn của bài đang có phân công mở', async () => {
    givenData([result({ assignmentId: 'a1', assignmentStatus: 'ASSIGNED', teacherName: 'Cô Lan' })])
    renderPage()

    await screen.findByText('Trần Quang Thiên')
    expect(screen.getByRole('checkbox', { name: /Chọn bài của Trần Quang Thiên/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Mở bài/ })).toBeInTheDocument()
  })

  it('chuyển sang hàng đợi của chính mình khi đổi chế độ', async () => {
    givenData([result({ studentName: 'Lê Văn Việt' })], [task()])
    renderPage()

    await screen.findByText('Lê Văn Việt')
    await userEvent.click(screen.getByRole('tab', { name: 'Bài tôi đang chấm' }))

    expect(await screen.findByText('Trần Quang Thiên')).toBeInTheDocument()
    expect(screen.queryByText('Lê Văn Việt')).not.toBeInTheDocument()
  })
})
