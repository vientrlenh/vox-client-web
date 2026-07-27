import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { renderWithProviders } from '@/test/renderWithProviders'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { SchoolAdminReevaluationDetailPage, SchoolAdminReevaluationPage } from './ReevaluationPages'

const mockedPost = jest.spyOn(graphqlApiClient, 'post')

type GraphQLBody = { query: string; variables: Record<string, unknown> }

const appealsPage = {
  content: [
    {
      className: '12A1',
      deadline: '2026-07-22T17:00:00+07:00',
      examName: 'Kỳ thi giữa kỳ',
      id: 'appeal-1',
      originalScore: 6.5,
      overdue: false,
      partLabels: ['Speaking Part 2'],
      requestedAt: '2026-07-15T09:00:00+07:00',
      reviewerName: null,
      reviewerStatus: null,
      status: 'PENDING',
      studentName: 'Nguyễn Minh An',
    },
  ],
  page: 0,
  size: 20,
  totalElements: 1,
  totalPages: 1,
}

const appealStats = { pending: 1, processing: 0, published: 0, rejected: 0, withdrawn: 2 }

// Định tuyến mock theo tên query để một trang bắn nhiều query cùng lúc vẫn resolve đúng.
function routeGraphql(data: Record<string, unknown>) {
  mockedPost.mockImplementation((_endpoint, body) => {
    const { query } = body as GraphQLBody
    const key = Object.keys(data).find((name) => query.includes(name))
    return Promise.resolve({ data: { data: key ? { [key]: data[key] } : {} } })
  })
}

describe('SchoolAdminReevaluationPage', () => {
  beforeEach(() => mockedPost.mockReset())

  it('hiển thị tiêu đề, thống kê và danh sách đơn từ API', async () => {
    routeGraphql({ appealStats, appeals: appealsPage })

    renderWithProviders(<SchoolAdminReevaluationPage />)

    expect(screen.getByRole('heading', { name: 'Yêu cầu phúc khảo' })).toBeInTheDocument()
    expect(await screen.findByText('Nguyễn Minh An')).toBeInTheDocument()
    expect(screen.getByText('Lớp 12A1')).toBeInTheDocument()
    // Đơn chưa giao ai — cột giám khảo phải nói rõ thay vì để trống.
    expect(screen.getByText('Chưa phân công')).toBeInTheDocument()
  })

  it('có thẻ thống kê và bộ lọc cho đơn học sinh đã rút', async () => {
    routeGraphql({ appealStats, appeals: appealsPage })

    renderWithProviders(<SchoolAdminReevaluationPage />)

    expect(await screen.findByText('Học sinh đã rút')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Đã rút' })).toBeInTheDocument()
    // COMPARING đã bị BE xoá khỏi enum — bộ lọc không được còn giá trị này.
    expect(screen.queryByRole('button', { name: 'Chờ đối chiếu' })).not.toBeInTheDocument()
  })
})

describe('SchoolAdminReevaluationDetailPage', () => {
  beforeEach(() => mockedPost.mockReset())

  const baselineScores = [
    { criterionCode: 'FLU', criterionId: 'c1', label: 'Độ trôi chảy', score: 6.5 },
  ]

  const gradingAppeal = {
    approvedAt: '2026-07-16T09:00:00+07:00',
    className: '12A1',
    deadline: '2026-07-22T17:00:00+07:00',
    decisionNote: null,
    examName: 'Kỳ thi giữa kỳ',
    finalScore: null,
    id: 'appeal-1',
    items: [
      {
        appealItemId: 'i1',
        baselineScores,
        finalScore: null,
        paperItemId: 'p1',
        partLabel: 'Speaking Part 2',
        turns: [],
      },
    ],
    notes: null,
    originalScore: 6.5,
    overdue: false,
    reason: 'Xin chấm lại phần nói',
    requestedAt: '2026-07-15T09:00:00+07:00',
    resolvedAt: null,
    reviewer: {
      assignedAt: '2026-07-16T09:00:00+07:00',
      assignmentId: 'asg-1',
      completedAt: null,
      deadlineAt: '2026-07-22T17:00:00+07:00',
      outcome: null,
      overdue: false,
      reviewerId: 't1',
      reviewerName: 'Trần Thu Hà',
      status: 'ASSIGNED',
    },
    reviewerOverrideReason: 'Chỉ còn một giáo viên đủ chuyên môn',
    scoringScaleMax: 9,
    scoringScaleMin: 0,
    status: 'GRADING',
    studentName: 'Nguyễn Minh An',
    withdrawnAt: null,
  }

  function renderDetail() {
    renderWithProviders(
      <Routes>
        <Route
          element={<SchoolAdminReevaluationDetailPage />}
          path="/school-admin/reevaluation/:requestId"
        />
      </Routes>,
      { route: '/school-admin/reevaluation/appeal-1' },
    )
  }

  it('hiển thị một giám khảo kèm lý do bỏ qua xung đột lợi ích', async () => {
    routeGraphql({ appeal: gradingAppeal })

    renderDetail()

    expect(await screen.findByText('Trần Thu Hà')).toBeInTheDocument()
    expect(screen.getByText('Đang chờ chấm')).toBeInTheDocument()
    expect(screen.getByText(/Chỉ còn một giáo viên đủ chuyên môn/)).toBeInTheDocument()
    // Bước admin công bố đã bị BE xoá — giám khảo nộp là công bố luôn.
    expect(screen.queryByRole('button', { name: /Công bố/ })).not.toBeInTheDocument()
  })

  it('cho đổi giám khảo khi vòng chấm chưa xong, thay cho thao tác gỡ đã bị bỏ', async () => {
    const user = userEvent.setup()
    routeGraphql({ appeal: gradingAppeal, appealReviewers: [] })

    renderDetail()

    expect(screen.queryByRole('button', { name: /Gỡ giám khảo/ })).not.toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: /Đổi giám khảo/ }))
    expect(
      await screen.findByRole('button', { name: /Xác nhận đổi giám khảo/ }),
    ).toBeInTheDocument()
  })

  it('nêu rõ đơn đã bị học sinh rút', async () => {
    routeGraphql({
      appeal: {
        ...gradingAppeal,
        status: 'WITHDRAWN',
        withdrawnAt: '2026-07-18T08:00:00+07:00',
      },
    })

    renderDetail()

    expect(await screen.findByText(/Học sinh đã rút đơn lúc/)).toBeInTheDocument()
  })
})
