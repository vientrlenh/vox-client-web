import { QueryClient } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { AxiosResponse } from 'axios'
import { apiClient } from '@/shared/api'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { createTestProviders } from '@/test/renderWithProviders'
import type {
  CreateSupportedLanguageRequest,
  SupportedLanguage,
  SupportedLanguagePage,
  UpdateSupportedLanguageRequest,
} from '../types'
import {
  createSupportedLanguage,
  deleteSupportedLanguage,
  updateSupportedLanguage,
} from './useSupportedLanguageMutations'
import { useSupportedLanguageQuery } from './useSupportedLanguageQuery'
import { fetchSupportedLanguages } from './useSupportedLanguagesQuery'

const mockedGraphqlPost = jest.spyOn(graphqlApiClient, 'post')
const mockedRestPost = jest.spyOn(apiClient, 'post')
const mockedRestDelete = jest.spyOn(apiClient, 'delete')

type ApiResponse<T> = {
  data: T
  message: string
}

const mockLanguage: SupportedLanguage = {
  code: 'EN',
  createdAt: '2026-06-01T00:00:00Z',
  description: 'English language',
  id: 'language-1',
  isActive: true,
  name: 'English',
  updatedAt: '2026-06-02T00:00:00Z',
}

const mockLanguagePage: SupportedLanguagePage = {
  content: [mockLanguage],
  page: 1,
  size: 10,
  totalElements: 1,
  totalPages: 1,
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

describe('language management API', () => {
  beforeEach(() => {
    mockedGraphqlPost.mockReset()
    mockedRestPost.mockReset()
    mockedRestDelete.mockReset()
  })

  it('fetches supported languages with filters', async () => {
    mockedGraphqlPost.mockResolvedValue({
      data: {
        data: {
          supportedLanguages: mockLanguagePage,
        },
      },
    })

    await expect(
      fetchSupportedLanguages({
        filters: {
          isActive: 'active',
          search: ' eng ',
        },
        page: 1,
        size: 10,
      }),
    ).resolves.toEqual(mockLanguagePage)

    const requestBody = mockedGraphqlPost.mock.calls[0]?.[1] as {
      query: string
      variables: Record<string, unknown>
    }

    expect(requestBody.query).toContain('supportedLanguages')
    expect(requestBody.variables).toEqual({
      isActive: true,
      page: 1,
      search: 'eng',
      size: 10,
    })
  })

  it('does not request supported language details without an id', () => {
    const providers = createTestProviders({
      queryClient: createQueryClient(),
    })

    renderHook(() => useSupportedLanguageQuery(null), {
      wrapper: providers.Wrapper,
    })

    expect(mockedGraphqlPost).not.toHaveBeenCalled()
  })

  it('requests supported language details when an id is provided', async () => {
    const providers = createTestProviders({
      queryClient: createQueryClient(),
    })

    mockedGraphqlPost.mockResolvedValue({
      data: {
        data: {
          supportedLanguage: mockLanguage,
        },
      },
    })

    const { result } = renderHook(
      () => useSupportedLanguageQuery('language-1'),
      {
        wrapper: providers.Wrapper,
      },
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const requestBody = mockedGraphqlPost.mock.calls[0]?.[1] as {
      query: string
      variables: Record<string, unknown>
    }

    expect(requestBody.query).toContain('supportedLanguage')
    expect(requestBody.variables).toEqual({ id: 'language-1' })
  })

  it('creates a supported language through REST', async () => {
    const payload: CreateSupportedLanguageRequest = {
      code: 'EN',
      description: null,
      name: 'English',
    }

    mockedRestPost.mockResolvedValue({
      data: {
        data: { supportedLanguageId: 'language-1' },
        message: 'Created',
      },
    } as AxiosResponse<ApiResponse<{ supportedLanguageId: string }>>)

    await expect(createSupportedLanguage({ payload })).resolves.toEqual({
      data: { supportedLanguageId: 'language-1' },
      message: 'Created',
    })

    expect(mockedRestPost).toHaveBeenCalledWith(
      '/v1/supported-languages',
      payload,
    )
  })

  it('updates a supported language through GraphQL', async () => {
    const payload: UpdateSupportedLanguageRequest = {
      code: 'EN',
      description: 'Updated',
      isActive: true,
      name: 'English Updated',
    }

    mockedGraphqlPost.mockResolvedValue({
      data: {
        data: {
          updateSupportedLanguage: { supportedLanguageId: 'language-1' },
        },
      },
    })

    await expect(
      updateSupportedLanguage({ id: 'language-1', payload }),
    ).resolves.toEqual({
      data: { supportedLanguageId: 'language-1' },
      message: 'Cập nhật ngôn ngữ thành công',
    })

    const requestBody = mockedGraphqlPost.mock.calls[0]?.[1] as {
      query: string
      variables: Record<string, unknown>
    }

    expect(requestBody.query).toContain('updateSupportedLanguage')
    expect(requestBody.variables).toEqual({
      id: 'language-1',
      input: payload,
    })
  })

  it('deletes a supported language through REST', async () => {
    mockedRestDelete.mockResolvedValue({
      data: {
        data: undefined,
        message: 'Deleted',
      },
    } as AxiosResponse<ApiResponse<void>>)

    await expect(
      deleteSupportedLanguage({ id: 'language-1' }),
    ).resolves.toEqual({
      data: undefined,
      message: 'Deleted',
    })

    expect(mockedRestDelete).toHaveBeenCalledWith(
      '/v1/supported-languages/language-1',
    )
  })
})
