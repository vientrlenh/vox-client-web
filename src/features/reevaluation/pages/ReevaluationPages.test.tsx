import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { renderWithProviders } from '@/test/renderWithProviders'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import {
  SchoolAdminReevaluationDetailPage,
  SchoolAdminReevaluationPage,
  TeacherReevaluationPage,
  TeacherReevaluationRescorePage,
} from './ReevaluationPages'

const mockedPost = jest.spyOn(graphqlApiClient, 'post')

type GraphQLBody = { query: string; variables: Record<string, unknown> }

const appealsPage = {
  content: [
    {
      className: '12A1',
      deadline: '2026-07-22T17:00:00+07:00',
      doneCount: 0,
      examName: 'Kỳ thi giữa kỳ',
      id: 'appeal-1',
      originalScore: 6.5,
      overdue: false,
      partLabel: 'Speaking Part 2',
      requestedAt: '2026-07-15T09:00:00+07:00',
      reviewerCount: 0,
      status: 'PENDING',
      studentName: 'Nguyễn Minh An',
    },
  ],
  page: 0,
  size: 20,
  totalElements: 1,
  totalPages: 1,
}

const appealStats = { pending: 1, processing: 0, published: 0, rejected: 0 }

const tasksPage = {
  content: [
    {
      appealId: 'appeal-1',
      deadline: '2026-07-22T17:00:00+07:00',
      examName: 'Kỳ thi giữa kỳ',
      myStatus: 'ASSIGNED',
      overdue: false,
      partLabel: 'Speaking Part 2',
    },
  ],
  page: 0,
  size: 20,
  totalElements: 1,
  totalPages: 1,
}

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
  })
})

describe('TeacherReevaluationPage', () => {
  beforeEach(() => mockedPost.mockReset())

  it('hiển thị việc được phân công cho giáo viên hiện tại', async () => {
    routeGraphql({ myAppealTasks: tasksPage })

    renderWithProviders(<TeacherReevaluationPage />)

    expect(
      screen.getByRole('heading', { name: 'Bài được phân công chấm lại' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Speaking Part 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Chấm ngay/ })).toBeInTheDocument()
  })
})

describe('SchoolAdminReevaluationDetailPage — màn so sánh & công bố', () => {
  beforeEach(() => mockedPost.mockReset())

  const comparingAppeal = {
    aiScores: [{ criterionCode: 'FLU', criterionId: 'c1', label: 'Độ trôi chảy', score: 6.5 }],
    approvedAt: '2026-07-16T09:00:00+07:00',
    className: '12A1',
    deadline: '2026-07-22T17:00:00+07:00',
    decisionNote: null,
    examName: 'Kỳ thi giữa kỳ',
    finalScore: null,
    id: 'appeal-1',
    notes: null,
    originalScore: 6.5,
    overdue: false,
    partLabel: 'Speaking Part 2',
    reason: 'Xin chấm lại phần nói',
    requestedAt: '2026-07-15T09:00:00+07:00',
    resolvedAt: null,
    reviewers: [
      {
        assignedAt: '2026-07-16T09:00:00+07:00',
        done: true,
        note: 'Phát âm tốt.',
        reviewerId: 't1',
        reviewerName: 'Trần Thu Hà',
        scores: [{ criterionCode: 'FLU', criterionId: 'c1', label: 'Độ trôi chảy', score: 7 }],
        status: 'SUBMITTED',
        submittedAt: '2026-07-16T10:00:00+07:00',
        suggestedScore: 7,
      },
      {
        assignedAt: '2026-07-16T09:00:00+07:00',
        done: true,
        note: null,
        reviewerId: 't2',
        reviewerName: 'Nguyễn Văn Minh',
        scores: [{ criterionCode: 'FLU', criterionId: 'c1', label: 'Độ trôi chảy', score: 7.5 }],
        status: 'SUBMITTED',
        submittedAt: '2026-07-16T10:30:00+07:00',
        suggestedScore: 7.5,
      },
    ],
    scoringScaleMax: 9,
    scoringScaleMin: 0,
    status: 'COMPARING',
    studentName: 'Nguyễn Minh An',
    turns: [],
  }

  it('hiển thị tên giám khảo (không còn ẩn danh) ở bảng đối chiếu và thẻ nhận xét', async () => {
    routeGraphql({ appeal: comparingAppeal })

    renderWithProviders(
      <Routes>
        <Route
          element={<SchoolAdminReevaluationDetailPage />}
          path="/school-admin/reevaluation/:requestId"
        />
      </Routes>,
      { route: '/school-admin/reevaluation/appeal-1' },
    )

    // Tên xuất hiện ở cả header bảng lẫn thẻ nhận xét.
    expect((await screen.findAllByText('Trần Thu Hà')).length).toBeGreaterThan(1)
    expect(screen.getAllByText('Nguyễn Văn Minh').length).toBeGreaterThan(1)

    // Không còn nhãn ẩn danh cũ.
    expect(screen.getByText('Nhận xét của giám khảo')).toBeInTheDocument()
    expect(screen.queryByText(/Người chấm 1/)).not.toBeInTheDocument()
    expect(screen.queryByText(/^Chấm 1$/)).not.toBeInTheDocument()
  })
})

describe('TeacherReevaluationRescorePage', () => {
  beforeEach(() => mockedPost.mockReset())

  const submittedTaskDetail = {
    aiScores: [{ criterionCode: 'FLU', criterionId: 'c1', label: 'Độ trôi chảy', score: 7 }],
    appealId: 'appeal-1',
    criteria: [
      { code: 'FLU', description: null, id: 'c1', label: 'Độ trôi chảy', maxScore: 9, minScore: 0 },
    ],
    myReport: {
      assignedAt: '2026-07-16T09:00:00+07:00',
      done: true,
      note: 'Đã chấm',
      reviewerId: 't1',
      reviewerName: 'Trần Thu Hà',
      scores: [{ criterionCode: 'FLU', criterionId: 'c1', label: 'Độ trôi chảy', score: 8 }],
      status: 'SUBMITTED',
      submittedAt: '2026-07-16T10:00:00+07:00',
      suggestedScore: 8,
    },
    partLabel: 'Speaking Part 2',
    turns: [],
  }

  it('khoá màn chấm lại (chỉ-đọc) khi giám khảo đã nộp', async () => {
    routeGraphql({ appealTaskDetail: submittedTaskDetail })

    renderWithProviders(
      <Routes>
        <Route element={<TeacherReevaluationRescorePage />} path="/teacher/reevaluation/:requestId" />
      </Routes>,
      { route: '/teacher/reevaluation/appeal-1' },
    )

    expect(await screen.findByText('Đã nộp — không thể chỉnh sửa')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Nộp báo cáo chấm lại' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('spinbutton')).toBeDisabled()
  })
})
