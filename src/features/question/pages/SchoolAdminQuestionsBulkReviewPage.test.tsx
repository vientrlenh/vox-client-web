import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AxiosResponse } from 'axios'
import { apiClient, AUTH_TOKEN_STORAGE_KEYS } from '@/shared/api'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { QuestionDto, QuestionStatus } from '../types'
import { SchoolAdminReviewQuestionsPage } from './TeacherQuestionsPage'

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

/** Trang 1 cố ý trộn trạng thái: đó là tình huống sinh ra cảnh báo "sẽ bị bỏ qua". */
const FIRST_PAGE = [
  question('Q-IMPORT-020', 'APPROVED'),
  question('Q-IMPORT-019', 'APPROVED'),
  question('Q-IMPORT-018', 'SUBMITTED_FOR_REVIEW'),
  question('Q-IMPORT-017', 'SUBMITTED_FOR_REVIEW'),
]
const SECOND_PAGE = [question('Q-IMPORT-016', 'SUBMITTED_FOR_REVIEW')]

const ELIGIBLE_IDS = ['question-Q-IMPORT-018', 'question-Q-IMPORT-017']

/** Backend trả đủ một dòng cho mọi trạng thái, kể cả count = 0. */
const STATUS_COUNTS = [
  { count: 0, status: 'DRAFT' },
  { count: 3, status: 'SUBMITTED_FOR_REVIEW' },
  { count: 0, status: 'REVISION_REQUESTED' },
  { count: 2, status: 'APPROVED' },
  { count: 0, status: 'REJECTED' },
  { count: 0, status: 'PUBLISHED' },
  { count: 0, status: 'ARCHIVED' },
]

function emptyPage(key: string) {
  return {
    data: { data: { [key]: { content: [], page: 0, size: 100, totalElements: 0, totalPages: 0 } } },
  } as AxiosResponse
}

function mockQuestionList() {
  mockedGraphql.mockImplementation(async (_url, body) => {
    const { query, variables } = body as {
      query: string
      variables?: { page?: number }
    }

    // Bộ lọc ngân hàng / chủ đề nạp danh sách chọn riêng; test này không quan tâm nội dung của chúng.
    if (query.includes('questionBanks(')) {
      return emptyPage('questionBanks')
    }
    if (query.includes('questionTopics(')) {
      return emptyPage('questionTopics')
    }

    if (query.includes('questionStatusCounts(')) {
      return {
        data: { data: { questionStatusCounts: STATUS_COUNTS } },
      } as AxiosResponse
    }

    const isFirstPage = (variables?.page ?? 0) === 0

    return {
      data: {
        data: {
          questions: {
            content: isFirstPage ? FIRST_PAGE : SECOND_PAGE,
            page: variables?.page ?? 0,
            size: 10,
            totalElements: FIRST_PAGE.length + SECOND_PAGE.length,
            totalPages: 2,
          },
        },
      },
    } as AxiosResponse
  })
}

async function renderPageWithSelection() {
  const user = userEvent.setup()
  renderWithProviders(<SchoolAdminReviewQuestionsPage />, {
    route: '/school-admin/questions/review',
  })

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

  it('hiện số câu theo từng trạng thái trên tab', async () => {
    renderWithProviders(<SchoolAdminReviewQuestionsPage />, {
      route: '/school-admin/questions/review',
    })

    expect(await screen.findByRole('button', { name: 'Chờ duyệt (3)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Đã duyệt (2)' })).toBeInTheDocument()
    // Trạng thái không có câu nào vẫn hiện, để trục tab không co giãn theo dữ liệu.
    expect(screen.getByRole('button', { name: 'Bị từ chối (0)' })).toBeInTheDocument()
  })

  it('cảnh báo trước số câu sai trạng thái và cho chọn nhanh câu hợp lệ', async () => {
    const user = await renderPageWithSelection()

    expect(await screen.findByText('Đang chọn 4 câu hỏi.')).toBeInTheDocument()
    expect(screen.getByText('2 câu sẽ được duyệt.')).toBeInTheDocument()
    expect(
      screen.getByText(
        /2 câu bị bỏ qua và giữ nguyên trạng thái: 2 câu đang ở trạng thái "Đã duyệt"/,
      ),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Chỉ chọn 2 câu hợp lệ' }))

    expect(screen.getByText('Đang chọn 2 câu hỏi.')).toBeInTheDocument()
    expect(screen.getByText('2 câu sẽ được duyệt.')).toBeInTheDocument()
    expect(screen.queryByText(/bị bỏ qua và giữ nguyên trạng thái/)).not.toBeInTheDocument()
  })

  /**
   * Hồi quy: trước đây toàn bộ lựa chọn được gửi lên kể cả những câu đã biết chắc là sai trạng
   * thái, nên bảng lỗi trả về lẫn lộn giữa lỗi đã cảnh báo trước và lỗi thật sự cần xử lý.
   */
  it('chỉ gửi lên những câu thật sự duyệt được', async () => {
    mockedPatch.mockResolvedValue({
      data: {
        data: { failed: [], updated: [FIRST_PAGE[2], FIRST_PAGE[3]] },
        message: 'Cap nhat trang thai hang loat thanh cong',
      },
    } as AxiosResponse)

    const user = await renderPageWithSelection()
    await user.click(screen.getByRole('button', { name: /^Duyệt hàng loạt/ }))
    await user.click(screen.getByRole('button', { name: 'Xác nhận' }))

    await waitFor(() => expect(mockedPatch).toHaveBeenCalled())
    expect(mockedPatch.mock.calls[0][1]).toEqual({
      action: 'APPROVE',
      note: null,
      questionIds: ELIGIBLE_IDS,
    })
  })

  /**
   * Hồi quy: trước đây mọi lý do bị nối bằng " | " vào một toast tự tắt sau 4,5 giây nên người dùng
   * không kịp đọc và không biết câu nào hỏng vì sao.
   */
  it('hiện kết quả trong hộp thoại ở lại đến khi người dùng đóng, gom theo lý do', async () => {
    const reason = 'Không thể duyệt: bạn không có quyền duyệt câu hỏi trong ngân hàng này'
    mockedPatch.mockResolvedValue({
      data: {
        data: {
          failed: [
            {
              currentStatus: 'SUBMITTED_FOR_REVIEW',
              questionCode: 'Q-IMPORT-017',
              questionId: 'question-Q-IMPORT-017',
              reason,
              reasonCode: 'NO_PERMISSION',
            },
          ],
          updated: [FIRST_PAGE[2]],
        },
        message: 'Cap nhat trang thai hang loat thanh cong',
      },
    } as AxiosResponse)

    const user = await renderPageWithSelection()
    await user.click(screen.getByRole('button', { name: /^Duyệt hàng loạt/ }))
    await user.click(screen.getByRole('button', { name: 'Xác nhận' }))

    const resultDialog = await screen.findByRole('dialog', { name: /Kết quả duyệt hàng loạt/ })
    const dialog = within(resultDialog)

    expect(
      dialog.getByText('Đã duyệt 1/2 câu hỏi. 1 câu bị bỏ qua và giữ nguyên trạng thái.'),
    ).toBeInTheDocument()
    expect(dialog.getByText(reason)).toBeInTheDocument()
    expect(dialog.getByText('1 câu')).toBeInTheDocument()
    expect(dialog.getByText('Q-IMPORT-017')).toBeInTheDocument()

    // Không có timer nào tự đóng: hộp thoại vẫn còn cho tới khi bấm nút.
    await user.click(screen.getByRole('button', { name: 'Đã hiểu' }))
    await waitFor(() => expect(resultDialog).not.toBeInTheDocument())
  })

  it('chỉ bỏ khỏi vùng chọn những câu đã đổi trạng thái', async () => {
    mockedPatch.mockResolvedValue({
      data: {
        data: {
          failed: [
            {
              currentStatus: 'SUBMITTED_FOR_REVIEW',
              questionCode: 'Q-IMPORT-017',
              questionId: 'question-Q-IMPORT-017',
              reason: 'Không thể duyệt: bạn không có quyền duyệt câu hỏi trong ngân hàng này',
              reasonCode: 'NO_PERMISSION',
            },
          ],
          updated: [FIRST_PAGE[2]],
        },
        message: 'Cap nhat trang thai hang loat thanh cong',
      },
    } as AxiosResponse)

    const user = await renderPageWithSelection()
    await user.click(screen.getByRole('button', { name: /^Duyệt hàng loạt/ }))
    await user.click(screen.getByRole('button', { name: 'Xác nhận' }))

    await screen.findByRole('dialog', { name: /Kết quả duyệt hàng loạt/ })
    await user.click(screen.getByRole('button', { name: 'Đã hiểu' }))

    // 1 câu đã duyệt xong bị bỏ ra; câu thất bại và 2 câu sai trạng thái vẫn nằm trong vùng chọn
    // để người dùng đổi thao tác và chạy tiếp.
    expect(await screen.findByText('Đang chọn 3 câu hỏi.')).toBeInTheDocument()
  })

  /**
   * Hồi quy: trước đây vùng chọn bị lọc theo trang đang hiển thị, nên chuyển trang là mất lựa
   * chọn — người dùng phải chọn lại và chạy thao tác nhiều lần cho mỗi trang.
   */
  it('giữ nguyên lựa chọn khi chuyển trang', async () => {
    const user = await renderPageWithSelection()
    expect(await screen.findByText('Đang chọn 4 câu hỏi.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Trang sau' }))
    await screen.findByText('Nội dung Q-IMPORT-016')

    expect(
      await screen.findByText('Đang chọn 4 câu hỏi (0 câu trên trang này).'),
    ).toBeInTheDocument()

    const row = screen.getByText('Nội dung Q-IMPORT-016').closest('tr')
    await user.click(within(row as HTMLElement).getByRole('checkbox'))

    expect(
      await screen.findByText('Đang chọn 5 câu hỏi (1 câu trên trang này).'),
    ).toBeInTheDocument()
    expect(screen.getByText('3 câu sẽ được duyệt.')).toBeInTheDocument()
  })
})
