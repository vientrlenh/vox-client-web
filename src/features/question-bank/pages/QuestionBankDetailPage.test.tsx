import { QueryClient } from '@tanstack/react-query'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AxiosResponse } from 'axios'
import { Route, Routes } from 'react-router'
import { AUTH_TOKEN_STORAGE_KEYS } from '@/shared/api'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { renderWithProviders } from '@/test/renderWithProviders'
import { TeacherQuestionBankDetailPage } from './QuestionBankDetailPage'

const mockedPost = jest.spyOn(graphqlApiClient, 'post')

const bankId = 'bank-1'

function createJwt(payload: Record<string, unknown>) {
  const encode = (value: Record<string, unknown>) =>
    btoa(JSON.stringify(value))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '')

  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`
}

function saveSession() {
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

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
}

/** GraphQL đi chung một endpoint nên phải phân nhánh theo tên query trong body. */
function mockGraphQL() {
  mockedPost.mockImplementation((_url, body) => {
    const query = String((body as { query?: string })?.query ?? '')

    if (query.includes('questionTopics(')) {
      return Promise.resolve({
        data: {
          data: {
            questionTopics: {
              content: [],
              page: 0,
              size: 10,
              totalElements: 0,
              totalPages: 0,
            },
          },
        },
      } as AxiosResponse)
    }

    return Promise.resolve({
      data: {
        data: {
          questionBank: {
            code: 'BANK-1',
            createdAt: '2026-06-01T00:00:00Z',
            createdBy: 'admin-1',
            description: 'Mô tả ngân hàng',
            id: bankId,
            languageId: 'lang-1',
            name: 'Ngân hàng tiếng Anh',
            ownerType: 'SCHOOL',
            schoolId: 'school-1',
            status: 'DRAFT',
            updatedAt: '2026-06-01T00:00:00Z',
            updatedBy: 'admin-1',
          },
        },
      },
    } as AxiosResponse)
  })
}

function renderPage(route: string) {
  renderWithProviders(
    <Routes>
      <Route
        element={<TeacherQuestionBankDetailPage />}
        path="/teacher/question-banks/:bankId"
      />
    </Routes>,
    {
      queryClient: createQueryClient(),
      route,
    },
  )
}

describe('QuestionBankDetailPage', () => {
  beforeEach(() => {
    localStorage.clear()
    mockedPost.mockReset()
    saveSession()
    mockGraphQL()
  })

  it('mặc định mở tab thông tin ngân hàng', async () => {
    renderPage(`/teacher/question-banks/${bankId}`)

    expect(
      await screen.findByRole('tab', { name: /thông tin ngân hàng/i }),
    ).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Ngân hàng tiếng Anh')).toBeInTheDocument()
  })

  it('mở thẳng tab chủ đề khi URL có ?tab=topics', async () => {
    renderPage(`/teacher/question-banks/${bankId}?tab=topics`)

    expect(
      await screen.findByRole('tab', { name: /^chủ đề$/i }),
    ).toHaveAttribute('aria-selected', 'true')
    expect(
      await screen.findByRole('heading', { name: /^chủ đề$/i }),
    ).toBeInTheDocument()
  })

  it('chuyển qua lại giữa hai tab', async () => {
    const user = userEvent.setup()
    renderPage(`/teacher/question-banks/${bankId}?tab=topics`)

    await screen.findByRole('heading', { name: /^chủ đề$/i })
    await user.click(screen.getByRole('tab', { name: /thông tin ngân hàng/i }))

    expect(
      await screen.findByText('Ngân hàng tiếng Anh'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('tab', { name: /thông tin ngân hàng/i }),
    ).toHaveAttribute('aria-selected', 'true')
  })
})
