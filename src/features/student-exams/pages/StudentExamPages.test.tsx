import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { apiClient } from '@/shared/api'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { renderWithProviders } from '@/test/renderWithProviders'
import { StudentClassTestResultPage } from './StudentExamPages'

const mockedPost = jest.spyOn(graphqlApiClient, 'post')
const mockedRestPost = jest.spyOn(apiClient, 'post')

type GraphQLBody = { query: string; variables: Record<string, unknown> }

const session = {
  candidateBlocked: false,
  candidateId: 'candidate-1',
  examId: 'exam-1',
  flagged: false,
  flagReason: null,
  id: 'session-1',
  paperId: 'paper-1',
  startedAt: '2026-08-01T01:00:00Z',
  status: 'GRADED',
  submittedAt: '2026-08-01T01:30:00Z',
}

function result(overrides: Record<string, unknown> = {}) {
  return {
    candidateId: 'candidate-1',
    examId: 'exam-1',
    flagReason: null,
    flagged: false,
    id: 'result-1',
    items: [{
      itemScore: 8, paperItemId: 'item-1', responseId: 'response-1',
      sectionId: 'section-1', weightedScore: 8,
    }],
    paperId: 'paper-1',
    rubricResultBandCode: 'B2',
    rubricResultBandId: 'band-1',
    rubricResultBandName: 'Khá',
    scoreVisible: true,
    sections: [{ score: 8, sectionId: 'section-1', title: 'Part 1' }],
    sessionId: 'session-1',
    status: 'RELEASED',
    targetFrameworkBandCode: null,
    targetFrameworkBandId: null,
    targetFrameworkBandLabel: null,
    totalScore: 7.5,
    ...overrides,
  }
}

// Trang bắn nhiều query song song — định tuyến theo tên để mỗi query nhận đúng dữ liệu.
// Khớp kèm dấu '(' vì `examSessionResult` chứa nguyên chuỗi `examSession`.
function routeGraphql(data: Record<string, unknown>) {
  mockedPost.mockImplementation((_endpoint, body) => {
    const { query } = body as GraphQLBody
    const key = Object.keys(data).find((name) => query.includes(`${name}(`))
    return Promise.resolve({ data: { data: key ? { [key]: data[key] } : {} } })
  })
}

function renderResultPage() {
  return renderWithProviders(
    <Routes>
      <Route element={<StudentClassTestResultPage />} path="/student/class-tests/:sessionId/result" />
    </Routes>,
    { route: '/student/class-tests/session-1/result' },
  )
}

describe('StudentClassTestResultPage', () => {
  beforeEach(() => {
    mockedPost.mockReset()
    mockedRestPost.mockReset()
    mockedRestPost.mockResolvedValue({ data: { data: 'ap-1', message: 'ok' } } as never)
  })

  it('hiện điểm và chi tiết khi bài đã công bố', async () => {
    routeGraphql({ examSession: session, examSessionResult: result() })

    renderResultPage()

    expect(await screen.findByText('Tổng điểm')).toBeInTheDocument()
    expect(screen.getByText('7,5')).toBeInTheDocument()
    expect(screen.getByText('Chi tiết từng câu')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /gửi đơn phúc khảo/i })).toBeInTheDocument()
  })

  /**
   * Lỗi đang sửa: trang tự suy `flagged && PENDING_REVIEW` nên bài chưa ai soát mà không
   * bị gắn cờ vẫn lộ hết điểm. Giờ chỉ nghe theo `scoreVisible` của BE.
   */
  it('giấu điểm và chi tiết khi bài chưa được công bố', async () => {
    routeGraphql({
      examSession: session,
      examSessionResult: result({
        items: [], rubricResultBandId: null, rubricResultBandName: null,
        scoreVisible: false, sections: [], status: 'PENDING_REVIEW', totalScore: null,
      }),
    })

    renderResultPage()

    expect(await screen.findByText('Kết quả đang chờ công bố')).toBeInTheDocument()
    expect(screen.queryByText('Tổng điểm')).not.toBeInTheDocument()
    expect(screen.queryByText('Chi tiết từng câu')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /gửi đơn phúc khảo/i })).not.toBeInTheDocument()
  })

  it('nói đúng lý do khi bài đang phúc khảo', async () => {
    routeGraphql({
      examSession: session,
      examSessionResult: result({
        items: [], scoreVisible: false, sections: [], status: 'APPEALED', totalScore: null,
      }),
    })

    renderResultPage()

    expect(await screen.findByText('Đang xử lý phúc khảo')).toBeInTheDocument()
  })

  it('vẫn hiện trạng thái bài để học sinh biết đang chờ gì', async () => {
    routeGraphql({
      examSession: session,
      examSessionResult: result({
        items: [], scoreVisible: false, sections: [], status: 'PENDING_REVIEW', totalScore: null,
      }),
    })

    renderResultPage()

    // Che điểm chứ không chặn trang: chặn thì học sinh chỉ thấy "không tìm thấy".
    expect(await screen.findByText('Chờ soát điểm AI')).toBeInTheDocument()
  })

  /**
   * Bước chọn câu đã bỏ: giám khảo phúc khảo bắt buộc chấm lại toàn bài rồi tính lại
   * tổng điểm từ mọi câu, nên danh sách học sinh chọn không thu hẹp được gì.
   */
  it('form phúc khảo chỉ hỏi lý do — không chọn câu, không ghi chú', async () => {
    routeGraphql({ examSession: session, examSessionResult: result() })
    renderResultPage()

    await userEvent.click(await screen.findByRole('button', { name: /gửi đơn phúc khảo/i }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).queryAllByRole('checkbox')).toHaveLength(0)
    expect(within(dialog).queryByText('Ghi chú')).not.toBeInTheDocument()
    expect(dialog).toHaveTextContent(/toàn bộ bài làm/)
  })

  it('gửi đơn chỉ với kết quả và lý do', async () => {
    routeGraphql({ examSession: session, examSessionResult: result() })
    renderResultPage()

    await userEvent.click(await screen.findByRole('button', { name: /gửi đơn phúc khảo/i }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByRole('textbox'), 'Điểm chưa phản ánh đúng bài nói')
    await userEvent.click(within(dialog).getByRole('button', { name: /^Gửi đơn$/ }))

    await waitFor(() =>
      expect(mockedRestPost).toHaveBeenCalledWith('/v1/exam-appeals', {
        candidateResultId: 'result-1',
        reason: 'Điểm chưa phản ánh đúng bài nói',
      }),
    )
  })

  it('hiện phân tích của AI khi giáo viên đã chấm lại', async () => {
    routeGraphql({
      examItemResponseEvaluation: {
        ai: {
          engineType: 'AI_SINGLE',
          evaluatedAt: '2026-08-01T02:00:00Z',
          evaluationId: 'eval-ai',
          feedbackSummary: 'AI: còn ngập ngừng ở đoạn giữa',
          gradedByModel: 'gpt-x',
          markedInvalid: false,
          overallConfidence: 0.82,
          promptVersion: 'v3',
          requiresHumanReview: false,
          requiresRetake: false,
          reviewReasonCode: null,
          signals: null,
          suggestions: null,
          validity: null,
        },
        criteria: [{
          criterionCode: 'FLU', criterionName: 'Fluency', finalScore: 8, id: 'cs-1',
          maxScore: 9, minScore: 0, rationale: 'GV: trôi chảy', rawScore: 8,
          rubricCriterionId: 'crit-1',
        }],
        engineType: 'HUMAN',
        evaluatedAt: '2026-08-02T03:00:00Z',
        feedbackSummary: 'GV: đạt yêu cầu',
        gradedByModel: 'HUMAN',
        id: 'eval-human',
        itemScore: 8,
        markedInvalid: false,
        overallConfidence: null,
        paperItemId: 'item-1',
        promptVersion: null,
        rawItemScore: 8,
        requiresHumanReview: false,
        requiresRetake: false,
        responseId: 'response-1',
        reviewReasonCode: null,
        signals: null,
        status: 'FINALIZED',
        suggestions: null,
        // Turn đến từ bản AI — đây là nguồn duy nhất của nội dung câu hỏi.
        turns: [{
          asrConfidence: 0.9, audioUrl: null, durationSeconds: 30, id: 'turn-1',
          promptText: 'Describe a place you like', pronunciationOverall: null,
          transcript: 'I like...', turnOrder: 1, turnType: 'MAIN', wordCount: 12,
          wordFeedback: null,
        }],
        validity: null,
      },
      examSession: session,
      examSessionResult: result(),
    })

    renderResultPage()

    await userEvent.click(await screen.findByRole('button', { name: /câu 1/i }))

    // Nội dung câu hỏi phải sống sót qua lần chấm lại — chính là lỗi đang sửa.
    // Hiện ở cả tiêu đề thẻ lẫn khối lượt nói, nên khớp nhiều phần tử là đúng.
    expect(await screen.findAllByText('Describe a place you like')).not.toHaveLength(0)
    expect(screen.getByText('Giáo viên chấm lại')).toBeInTheDocument()
    expect(screen.getByText('Nhận xét của AI (tham khảo)')).toBeInTheDocument()
    expect(screen.getByText('AI: còn ngập ngừng ở đoạn giữa')).toBeInTheDocument()
    // Điểm tiêu chí vẫn là của giáo viên.
    expect(screen.getByText('GV: trôi chảy')).toBeInTheDocument()
  })
})
