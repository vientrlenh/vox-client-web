import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { setAuthenticatedUser } from '@/app/store/authSlice'
import { configureAppStore } from '@/app/store/store'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { renderWithProviders } from '@/test/renderWithProviders'
import { TeacherExamPaperEditPage } from './ExamPaperPages'

const mockedPost = jest.spyOn(graphqlApiClient, 'post')

type GraphQLBody = { query: string; variables: Record<string, unknown> }

const PAPER_ID = 'paper-1'
const EXAM_ID = 'exam-1'
const TOPIC_ID = 'topic-1'
const ME = 'user-me'
const SOMEONE_ELSE = 'user-other'

type ItemOverrides = {
  questionId?: string | null
  selectionSpec?: Record<string, unknown> | null
  slotType?: string | null
}

function item(id: string, overrides: ItemOverrides = {}) {
  return {
    blueprintSlotId: overrides.slotType ? `slot-${id}` : null,
    id,
    order: 1,
    question: null,
    questionId: overrides.questionId ?? null,
    sectionId: 'section-1',
    selectionSpec: overrides.selectionSpec ?? null,
    slotType: overrides.slotType ?? null,
    weight: 1,
  }
}

type ExamOverrides = {
  createdBy?: string
  examStatus?: string
  kind?: string
  myRole?: string | null
  paperStatus?: string
}

function mockGraphQL(items: ReturnType<typeof item>[], overrides: ExamOverrides = {}) {
  const kind = overrides.kind ?? 'CENTRALIZED'
  const myRole = overrides.myRole === undefined ? 'AUTHOR' : overrides.myRole
  const paperStatus = overrides.paperStatus ?? 'DRAFT'
  const examStatus = overrides.examStatus ?? 'DRAFT'
  const createdBy = overrides.createdBy ?? ME
  mockedPost.mockImplementation((_url: string, body?: unknown) => {
    const { query } = body as GraphQLBody

    if (query.includes('query ExamPaper')) {
      return Promise.resolve({
        data: {
          data: {
            examPaper: {
              blueprintVersionId: 'version-1',
              code: 'KT-01-P1',
              createdAt: null,
              createdBy,
              examId: EXAM_ID,
              id: PAPER_ID,
              sections: [
                {
                  id: 'section-1',
                  instruction: null,
                  items,
                  order: 1,
                  paperId: PAPER_ID,
                  sectionTimeLimitSeconds: null,
                  title: 'Phần 1',
                  weight: 1,
                },
              ],
              status: paperStatus,
              timeDurationSeconds: 90,
              updatedAt: null,
              variant: 1,
            },
          },
        },
      })
    }

    if (query.includes('query ExamMyRole')) {
      return Promise.resolve({ data: { data: { examMyRole: myRole } } })
    }

    if (query.includes('query Exam(')) {
      return Promise.resolve({
        data: {
          data: {
            exam: { code: 'KT-01', id: EXAM_ID, kind, name: 'Kỳ thi', status: examStatus },
          },
        },
      })
    }

    if (query.includes('questions(')) {
      return Promise.resolve({
        data: { data: { questions: { content: [], page: 0, size: 8, totalElements: 0, totalPages: 1 } } },
      })
    }

    return Promise.resolve({ data: { data: {} } })
  })
}

function renderPage() {
  // Luật quyền đọc `paper.createdBy` so với người đang đăng nhập, nên store phải có user thật —
  // để trống thì mọi mã đề đều là "của người khác" và test đo nhầm nhánh.
  const store = configureAppStore()
  store.dispatch(
    setAuthenticatedUser({
      email: 'me@example.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
      roles: ['TEACHER'],
      userId: ME,
    }),
  )
  return renderWithProviders(
    <Routes>
      <Route element={<TeacherExamPaperEditPage />} path="/teacher/exam-papers/:paperId/edit" />
    </Routes>,
    { route: `/teacher/exam-papers/${PAPER_ID}/edit`, store },
  )
}

describe('TeacherExamPaperEditPage', () => {
  beforeEach(() => {
    mockedPost.mockReset()
  })

  it('hiển thị nút gán câu hỏi cho ô SELECTION', async () => {
    mockGraphQL([item('item-1', { slotType: 'SELECTION' })])
    renderPage()

    expect(await screen.findByRole('button', { name: 'Gán câu hỏi' })).toBeInTheDocument()
    expect(screen.getByText('Chọn theo tiêu chí')).toBeInTheDocument()
  })

  it('không hiển thị nút gán cho ô FIXED', async () => {
    mockGraphQL([item('item-1', { slotType: 'FIXED' })])
    renderPage()

    expect(await screen.findByText('Cố định theo khung đề')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Gán câu hỏi' })).not.toBeInTheDocument()
  })

  /** Slot đã bị xoá hoặc câu soạn tay: backend cho gán, UI cũng phải cho. */
  it('vẫn cho gán khi slotType null', async () => {
    mockGraphQL([item('item-1')])
    renderPage()

    expect(await screen.findByRole('button', { name: 'Gán câu hỏi' })).toBeInTheDocument()
    expect(screen.queryByText('Cố định theo khung đề')).not.toBeInTheDocument()
  })

  it('mở picker với bộ lọc theo tiêu chí của ô', async () => {
    const user = userEvent.setup()
    mockGraphQL([
      item('item-1', {
        selectionSpec: { difficulty: null, questionType: 'READ_ALOUD', skillCode: null, targetBandLevel: null, topicId: TOPIC_ID },
        slotType: 'SELECTION',
      }),
    ])
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Gán câu hỏi' }))

    const questionsCall = mockedPost.mock.calls.find((call) =>
      (call[1] as GraphQLBody).query.includes('questions('),
    )
    expect((questionsCall?.[1] as GraphQLBody).variables).toMatchObject({
      questionTopicId: TOPIC_ID,
      type: 'READ_ALOUD',
    })
  })

  it('hiển thị tiêu chí của ô SELECTION dưới dạng gợi ý', async () => {
    mockGraphQL([
      item('item-1', {
        selectionSpec: { difficulty: 'EASY', questionType: 'READ_ALOUD', skillCode: null, targetBandLevel: null, topicId: null },
        slotType: 'SELECTION',
      }),
    ])
    renderPage()

    expect(await screen.findByText('Tiêu chí:')).toBeInTheDocument()
    expect(screen.getByText('Mức độ: EASY')).toBeInTheDocument()
  })
})

/**
 * Chủ tịch hội đồng giờ chạy trọn quy trình ra đề: tự soạn, và khoá một bước mã đề của chính mình.
 * Ranh giới duy nhất còn lại là maker-checker — không ai tự duyệt đề mình soạn.
 */
describe('TeacherExamPaperEditPage — quyền của CHAIR trên mã đề', () => {
  beforeEach(() => {
    mockedPost.mockReset()
  })

  it('CHAIR soạn được nội dung mã đề', async () => {
    mockGraphQL([item('item-1', { slotType: 'SELECTION' })], { myRole: 'CHAIR', paperStatus: 'DRAFT' })
    renderPage()

    expect(await screen.findByRole('button', { name: 'Sửa phần Phần 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gán câu hỏi' })).toBeInTheDocument()
  })

  it('CHAIR khoá một bước mã đề của chính mình, không phải đi qua nộp duyệt', async () => {
    mockGraphQL([item('item-1', { questionId: 'question-1', slotType: 'SELECTION' })], {
      createdBy: ME,
      myRole: 'CHAIR',
      paperStatus: 'DRAFT',
    })
    renderPage()

    expect(await screen.findByRole('button', { name: 'Khóa mã đề' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Nộp duyệt' })).not.toBeInTheDocument()
  })

  /** Chốt hồi quy cho maker-checker: đường tắt chỉ nới nhánh khoá, không nới nhánh duyệt. */
  it('CHAIR không tự duyệt được mã đề do chính mình soạn', async () => {
    mockGraphQL([item('item-1', { questionId: 'question-1', slotType: 'SELECTION' })], {
      createdBy: ME,
      myRole: 'CHAIR',
      paperStatus: 'IN_REVIEW',
    })
    renderPage()

    expect(await screen.findByText('Phần 1')).toBeInTheDocument()
    await waitFor(() => expect(mockedPost.mock.calls.some((call) => (call[1] as GraphQLBody).query.includes('query ExamMyRole'))).toBe(true))
    expect(screen.queryByRole('button', { name: 'Duyệt mã đề' })).not.toBeInTheDocument()
  })

  it('CHAIR duyệt được mã đề do người khác soạn', async () => {
    mockGraphQL([item('item-1', { questionId: 'question-1', slotType: 'SELECTION' })], {
      createdBy: SOMEONE_ELSE,
      myRole: 'CHAIR',
      paperStatus: 'IN_REVIEW',
    })
    renderPage()

    expect(await screen.findByRole('button', { name: 'Duyệt mã đề' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Yêu cầu sửa lại' })).toBeInTheDocument()
  })

  it('AUTHOR nộp duyệt chứ không khoá, và vẫn xóa được mã đề bản nháp', async () => {
    mockGraphQL([item('item-1', { questionId: 'question-1', slotType: 'SELECTION' })], {
      myRole: 'AUTHOR',
      paperStatus: 'DRAFT',
    })
    renderPage()

    expect(await screen.findByRole('button', { name: 'Nộp duyệt' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Khóa mã đề' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sửa phần Phần 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Xóa mã đề/ })).toBeInTheDocument()
  })

  /** Bài trên lớp không có hội đồng nên `examMyRole` ở đó không phải tín hiệu để gác. */
  it('bài kiểm tra trên lớp không có hội đồng nên vẫn sửa được', async () => {
    mockGraphQL([item('item-1', { slotType: 'SELECTION' })], { kind: 'CLASS_TEST', myRole: null, paperStatus: 'LOCKED' })
    renderPage()

    expect(await screen.findByRole('button', { name: 'Sửa phần Phần 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gán câu hỏi' })).toBeInTheDocument()
  })
})

/**
 * Trang này vào thẳng bằng URL được, nên nó phải tự gác trạng thái kỳ thi — ẩn nút "Soạn đề" ở trang
 * chi tiết không đủ.
 */
describe('TeacherExamPaperEditPage — kỳ thi đã khóa', () => {
  beforeEach(() => {
    mockedPost.mockReset()
  })

  it.each(['IN_PROGRESS', 'CLOSED', 'RESULTS_PUBLISHED', 'CANCELLED'])(
    'chuyển sang chỉ xem khi kỳ thi ở trạng thái %s',
    async (examStatus) => {
      mockGraphQL([item('item-1', { questionId: 'question-1', slotType: 'SELECTION' })], {
        createdBy: ME,
        examStatus,
        myRole: 'CHAIR',
        paperStatus: 'DRAFT',
      })
      renderPage()

      expect(await screen.findByText(/Kỳ thi đã bắt đầu/)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Gán câu hỏi' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Đổi câu hỏi' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Sửa phần Phần 1' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Xóa mã đề/ })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Khóa mã đề' })).not.toBeInTheDocument()
    },
  )

  it('vẫn cho soạn khi kỳ thi mới chỉ lên lịch', async () => {
    mockGraphQL([item('item-1', { slotType: 'SELECTION' })], { examStatus: 'SCHEDULED', myRole: 'CHAIR' })
    renderPage()

    expect(await screen.findByRole('button', { name: 'Gán câu hỏi' })).toBeInTheDocument()
    expect(screen.queryByText(/Kỳ thi đã bắt đầu/)).not.toBeInTheDocument()
  })
})
