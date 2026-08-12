import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AxiosResponse } from 'axios'
import { apiClient, AUTH_TOKEN_STORAGE_KEYS } from '@/shared/api'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { QuestionDto, QuestionStatus } from '../types'
import { SchoolAdminQuestionsPage } from './TeacherQuestionsPage'

const mockedGraphql = jest.spyOn(graphqlApiClient, 'post')
const mockedPatch = jest.spyOn(apiClient, 'patch')

function createJwt(payload: Record<string, unknown>) {
  const encode = (value: Record<string, unknown>) =>
    btoa(JSON.stringify(value))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '')

  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`
}

function saveSchoolAdminSession() {
  localStorage.setItem(
    AUTH_TOKEN_STORAGE_KEYS.accessToken,
    createJwt({
      email: 'school-admin@vox.edu.vn',
      exp: Math.floor(Date.now() / 1000) + 3600,
      roles: ['SCHOOL_ADMIN'],
      schoolId: 'school-1',
      userId: 'school-admin-1',
    }),
  )
}

function question(code: string, status: QuestionStatus): QuestionDto {
  return {
    code,
    createdAt: null,
    createdBy: 'teacher-1',
    confidentiality: 'OPEN',
    id: `question-${code}`,
    instructionText: null,
    locked: false,
    maxResponseSeconds: 60,
    minResponseSeconds: 10,
    preparationText: null,
    preparationTimeSeconds: 10,
    promptText: null,
    questionBankId: 'bank-1',
    questionText: `Nội dung ${code}`,
    questionTopicId: 'topic-1',
    securePoolId: null,
    sharing: 'SCHOOL_SHARED',
    sourceQuestionId: null,
    status,
    type: 'SHORT_ANSWER',
    updatedAt: null,
    updatedBy: null,
  } as QuestionDto
}

const QUESTIONS = [
  question('Q-IMPORT-020', 'APPROVED'),
  question('Q-IMPORT-019', 'APPROVED'),
  question('Q-IMPORT-018', 'SUBMITTED_FOR_REVIEW'),
]

function mockQuestionList() {
  mockedGraphql.mockResolvedValue({
    data: {
      data: {
        questions: {
          content: QUESTIONS,
          page: 0,
          size: 10,
          totalElements: QUESTIONS.length,
          totalPages: 1,
        },
      },
    },
  } as AxiosResponse)
}

async function renderPageWithSelection() {
  const user = userEvent.setup()
  renderWithProviders(<SchoolAdminQuestionsPage />, { route: '/school-admin/questions/all' })

  await screen.findByText('Nội dung Q-IMPORT-020')
  // Ô đầu tiên là "chọn tất cả" ở dòng tiêu đề.
  await user.click(screen.getAllByRole('checkbox')[0])

  return user
}

describe('Duyệt hàng loạt câu hỏi', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    saveSchoolAdminSession()
    mockQuestionList()
  })

  it('cảnh báo trước số câu sai trạng thái và cho chọn nhanh câu hợp lệ', async () => {
    const user = await renderPageWithSelection()

    expect(
      await screen.findByText(
        /Chỉ 1 câu đang ở trạng thái "Chờ duyệt" nên có thể duyệt; 2 câu còn lại sẽ bị bỏ qua/,
      ),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Chỉ chọn 1 câu hợp lệ' }))

    expect(screen.getByText('Đang chọn 1 câu hỏi trên trang hiện tại để xử lý hàng loạt.')).toBeInTheDocument()
    expect(
      screen.getByText(/Tất cả câu đã chọn đều đúng trạng thái để duyệt/),
    ).toBeInTheDocument()
  })

  /**
   * Hồi quy: trước đây mọi lý do bị nối bằng " | " vào một toast tự tắt sau 4,5 giây nên người dùng
   * không kịp đọc và không biết câu nào hỏng vì sao.
   */
  it('hiện kết quả trong hộp thoại ở lại đến khi người dùng đóng, gom theo lý do', async () => {
    const reason =
      'Không thể duyệt: câu hỏi đang ở trạng thái "Đã duyệt", thao tác này chỉ áp dụng cho câu hỏi ở trạng thái "Chờ duyệt"'
    mockedPatch.mockResolvedValue({
      data: {
        data: {
          failed: [
            {
              currentStatus: 'APPROVED',
              questionCode: 'Q-IMPORT-020',
              questionId: 'question-Q-IMPORT-020',
              reason,
              reasonCode: 'INVALID_STATUS',
            },
            {
              currentStatus: 'APPROVED',
              questionCode: 'Q-IMPORT-019',
              questionId: 'question-Q-IMPORT-019',
              reason,
              reasonCode: 'INVALID_STATUS',
            },
          ],
          updated: [QUESTIONS[2]],
        },
        message: 'Cap nhat trang thai hang loat thanh cong',
      },
    } as AxiosResponse)

    const user = await renderPageWithSelection()
    await user.click(screen.getByRole('button', { name: 'Duyệt hàng loạt' }))
    await user.click(screen.getByRole('button', { name: 'Xác nhận' }))

    const resultDialog = await screen.findByRole('dialog', { name: /Kết quả duyệt hàng loạt/ })
    const dialog = within(resultDialog)

    expect(
      dialog.getByText('Đã duyệt 1/3 câu hỏi. 2 câu bị bỏ qua và giữ nguyên trạng thái.'),
    ).toBeInTheDocument()
    expect(dialog.getByText(reason)).toBeInTheDocument()
    expect(dialog.getByText('2 câu')).toBeInTheDocument()
    expect(dialog.getByText('Q-IMPORT-020')).toBeInTheDocument()
    expect(dialog.getByText('Q-IMPORT-019')).toBeInTheDocument()

    // Không có timer nào tự đóng: hộp thoại vẫn còn cho tới khi bấm nút.
    await user.click(screen.getByRole('button', { name: 'Đã hiểu' }))
    await waitFor(() => expect(resultDialog).not.toBeInTheDocument())
  })

  it('giữ lại đúng những câu bị bỏ qua trong vùng chọn để xử lý tiếp', async () => {
    mockedPatch.mockResolvedValue({
      data: {
        data: {
          failed: [
            {
              currentStatus: 'APPROVED',
              questionCode: 'Q-IMPORT-020',
              questionId: 'question-Q-IMPORT-020',
              reason: 'Không thể duyệt: câu hỏi đang ở trạng thái "Đã duyệt"',
              reasonCode: 'INVALID_STATUS',
            },
          ],
          updated: [QUESTIONS[2]],
        },
        message: 'Cap nhat trang thai hang loat thanh cong',
      },
    } as AxiosResponse)

    const user = await renderPageWithSelection()
    await user.click(screen.getByRole('button', { name: 'Duyệt hàng loạt' }))
    await user.click(screen.getByRole('button', { name: 'Xác nhận' }))

    await screen.findByRole('dialog', { name: /Kết quả duyệt hàng loạt/ })
    await user.click(screen.getByRole('button', { name: 'Đã hiểu' }))

    expect(
      await screen.findByText('Đang chọn 1 câu hỏi trên trang hiện tại để xử lý hàng loạt.'),
    ).toBeInTheDocument()
  })
})
