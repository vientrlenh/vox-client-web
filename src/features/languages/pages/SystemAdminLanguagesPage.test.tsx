import { QueryClient } from '@tanstack/react-query'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AxiosResponse } from 'axios'
import { apiClient } from '@/shared/api'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { SupportedLanguage, SupportedLanguagePage } from '../types'
import { SystemAdminLanguagesPage } from './SystemAdminLanguagesPage'

const mockedGraphqlPost = jest.spyOn(graphqlApiClient, 'post')
const mockedRestPost = jest.spyOn(apiClient, 'post')
const mockedRestDelete = jest.spyOn(apiClient, 'delete')

type ApiResponse<T> = {
  data: T
  message: string
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

function createLanguage(
  overrides: Partial<SupportedLanguage> = {},
): SupportedLanguage {
  return {
    code: 'EN',
    createdAt: '2026-06-01T00:00:00Z',
    description: 'English language',
    id: 'language-1',
    isActive: true,
    name: 'English',
    updatedAt: '2026-06-02T00:00:00Z',
    ...overrides,
  }
}

function createLanguagePage(
  content: SupportedLanguage[],
  overrides: Partial<SupportedLanguagePage> = {},
): SupportedLanguagePage {
  return {
    content,
    page: 1,
    size: 10,
    totalElements: content.length,
    totalPages: content.length ? 1 : 0,
    ...overrides,
  }
}

function renderPage() {
  return renderWithProviders(<SystemAdminLanguagesPage />, {
    queryClient: createQueryClient(),
  })
}

function mockGraphQLSuccess(pages: Record<number, SupportedLanguagePage>) {
  mockedGraphqlPost.mockImplementation((_path, body) => {
    const request = body as {
      query: string
      variables?: Record<string, unknown>
    }
    const page = Number(request.variables?.page ?? 1)
    const id = String(request.variables?.id ?? '')

    if (request.query.includes('updateSupportedLanguage')) {
      return Promise.resolve({
        data: {
          data: {
            updateSupportedLanguage: { supportedLanguageId: id },
          },
        },
      })
    }

    if (request.query.includes('supportedLanguages')) {
      return Promise.resolve({
        data: {
          data: {
            supportedLanguages: pages[page] ?? createLanguagePage([]),
          },
        },
      })
    }

    const allLanguages = Object.values(pages).flatMap(
      (pageData) => pageData.content,
    )

    return Promise.resolve({
      data: {
        data: {
          supportedLanguage:
            allLanguages.find((language) => language.id === id) ?? null,
        },
      },
    })
  })
}

async function openRowActionMenu(
  user: ReturnType<typeof userEvent.setup>,
  row: HTMLElement,
) {
  await user.click(
    within(row).getByRole('button', { name: /mở hành động/i }),
  )
}

describe('SystemAdminLanguagesPage', () => {
  beforeEach(() => {
    mockedGraphqlPost.mockReset()
    mockedRestPost.mockReset()
    mockedRestDelete.mockReset()
  })

  it('renders the loading state', () => {
    mockedGraphqlPost.mockReturnValue(new Promise(() => {}))

    renderPage()

    expect(
      screen.getByText(/đang tải danh sách ngôn ngữ/i),
    ).toBeInTheDocument()
  })

  it('renders the empty state', async () => {
    mockGraphQLSuccess({
      1: createLanguagePage([]),
    })

    renderPage()

    expect(await screen.findByText(/chưa có ngôn ngữ/i)).toBeInTheDocument()
  })

  it('renders the error state from GraphQL errors', async () => {
    mockedGraphqlPost.mockResolvedValue({
      data: {
        errors: [{ message: 'Forbidden' }],
      },
    })

    renderPage()

    expect(await screen.findByText('Forbidden')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /thử lại/i })).toBeInTheDocument()
  })

  it('filters search and active status', async () => {
    const user = userEvent.setup()
    mockGraphQLSuccess({
      1: createLanguagePage([createLanguage()]),
    })

    renderPage()

    await screen.findByText('English')

    await user.type(
      screen.getByRole('searchbox', { name: /tìm kiếm ngôn ngữ/i }),
      'eng',
    )
    await user.selectOptions(
      screen.getByRole('combobox', { name: /lọc trạng thái ngôn ngữ/i }),
      'inactive',
    )

    await waitFor(() => {
      const latestRequest = mockedGraphqlPost.mock.calls.at(-1)?.[1] as {
        variables: Record<string, unknown>
      }

      expect(latestRequest.variables).toMatchObject({
        isActive: false,
        page: 1,
        search: 'eng',
      })
    })
  })

  it('creates a supported language from the form dialog', async () => {
    const user = userEvent.setup()
    mockGraphQLSuccess({
      1: createLanguagePage([]),
    })
    mockedRestPost.mockResolvedValue({
      data: {
        data: { supportedLanguageId: 'language-2' },
        message: 'Tạo ngôn ngữ thành công',
      },
    } as AxiosResponse<ApiResponse<{ supportedLanguageId: string }>>)

    renderPage()

    await screen.findByRole('heading', { name: /quản lý ngôn ngữ/i })
    await user.click(screen.getByRole('button', { name: /tạo ngôn ngữ/i }))

    const dialog = screen.getByRole('dialog', { name: /tạo ngôn ngữ/i })
    await user.type(within(dialog).getByLabelText(/mã ngôn ngữ/i), 'FR')
    await user.type(within(dialog).getByLabelText(/tên ngôn ngữ/i), 'French')
    await user.type(within(dialog).getByLabelText(/mô tả/i), 'French language')
    await user.click(within(dialog).getByRole('button', { name: /tạo ngôn ngữ/i }))

    await waitFor(() => {
      expect(mockedRestPost).toHaveBeenCalledWith('/v1/supported-languages', {
        code: 'FR',
        description: 'French language',
        name: 'French',
      })
    })
    expect(
      await screen.findByText('Tạo ngôn ngữ thành công'),
    ).toBeInTheDocument()
  })

  it('opens update dialog and submits the full update payload', async () => {
    const user = userEvent.setup()
    mockGraphQLSuccess({
      1: createLanguagePage([createLanguage()]),
    })

    renderPage()

    const row = (await screen.findByText('English')).closest('tr')

    if (!row) {
      throw new Error('Expected language row to render')
    }

    await openRowActionMenu(user, row)
    await user.click(screen.getByRole('menuitem', { name: /sửa ngôn ngữ/i }))

    const dialog = screen.getByRole('dialog', { name: /cập nhật ngôn ngữ/i })
    await user.clear(within(dialog).getByLabelText(/tên ngôn ngữ/i))
    await user.type(
      within(dialog).getByLabelText(/tên ngôn ngữ/i),
      'English Updated',
    )
    await user.click(
      within(dialog).getByRole('button', { name: /lưu thay đổi/i }),
    )

    await waitFor(() => {
      const updateRequest = mockedGraphqlPost.mock.calls.find(([, body]) => {
        const request = body as { query: string }
        return request.query.includes('updateSupportedLanguage')
      })?.[1] as { variables: Record<string, unknown> }

      expect(updateRequest.variables).toEqual({
        id: 'language-1',
        input: {
          code: 'EN',
          description: 'English language',
          isActive: true,
          name: 'English Updated',
        },
      })
    })
  })

  it('opens and closes the right-side detail drawer', async () => {
    const user = userEvent.setup()
    mockGraphQLSuccess({
      1: createLanguagePage([createLanguage()]),
    })

    renderPage()

    const row = (await screen.findByText('English')).closest('tr')

    if (!row) {
      throw new Error('Expected language row to render')
    }

    await openRowActionMenu(user, row)
    await user.click(screen.getByRole('menuitem', { name: /xem chi tiết/i }))

    const drawer = await screen.findByRole('dialog', {
      name: /chi tiết ngôn ngữ/i,
    })

    expect(within(drawer).getByText('language-1')).toBeInTheDocument()

    await user.click(
      within(drawer).getByRole('button', {
        name: /đóng chi tiết ngôn ngữ/i,
      }),
    )

    expect(
      screen.queryByRole('dialog', { name: /chi tiết ngôn ngữ/i }),
    ).not.toBeInTheDocument()
  })

  it('confirms supported language deletion', async () => {
    const user = userEvent.setup()
    mockGraphQLSuccess({
      1: createLanguagePage([createLanguage()]),
    })
    mockedRestDelete.mockResolvedValue({
      data: {
        data: undefined,
        message: 'Xóa ngôn ngữ thành công',
      },
    } as AxiosResponse<ApiResponse<void>>)

    renderPage()

    const row = (await screen.findByText('English')).closest('tr')

    if (!row) {
      throw new Error('Expected language row to render')
    }

    await openRowActionMenu(user, row)
    await user.click(
      screen.getByRole('menuitem', { name: /lưu trữ ngôn ngữ/i }),
    )
    await user.click(screen.getByRole('button', { name: /^lưu trữ$/i }))

    await waitFor(() => {
      expect(mockedRestDelete).toHaveBeenCalledWith(
        '/v1/supported-languages/language-1',
      )
    })
    expect(
      await screen.findByText('Xóa ngôn ngữ thành công'),
    ).toBeInTheDocument()
  })
})
