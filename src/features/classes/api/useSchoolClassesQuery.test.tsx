import { QueryClient } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { createTestProviders } from '@/test/renderWithProviders'
import type { ClassFilters, PageResult, SchoolClass } from '../types'
import { fetchSchoolClass } from './useSchoolClassQuery'
import { useSchoolClassUsersQuery } from './useSchoolClassUsersQuery'
import { fetchSchoolClasses } from './useSchoolClassesQuery'

const mockedPost = jest.spyOn(graphqlApiClient, 'post')

const mockClass: SchoolClass = {
  code: 'ENG-6A',
  createdAt: '2026-06-01T00:00:00Z',
  description: 'Morning class',
  id: 'class-1',
  languageId: '11111111-1111-4111-8111-111111111111',
  name: 'English 6A',
  schoolGradeId: '22222222-2222-4222-8222-222222222222',
  schoolId: '33333333-3333-4333-8333-333333333333',
  status: 'ACTIVE',
  updatedAt: '2026-06-02T00:00:00Z',
}

const mockClassPage: PageResult<SchoolClass> = {
  content: [mockClass],
  page: 1,
  size: 10,
  totalElements: 1,
  totalPages: 1,
}

const filters: ClassFilters = {
  languageId: '',
  schoolGradeId: '',
  search: 'eng',
  status: 'ACTIVE',
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

describe('class management GraphQL API', () => {
  beforeEach(() => {
    mockedPost.mockReset()
  })

  it('fetches school classes with filters', async () => {
    mockedPost.mockResolvedValue({
      data: {
        data: {
          schoolClasses: mockClassPage,
        },
      },
    })

    await expect(
      fetchSchoolClasses({ filters, page: 1, size: 10 }),
    ).resolves.toEqual(mockClassPage)

    const requestBody = mockedPost.mock.calls[0]?.[1] as {
      query: string
      variables: Record<string, unknown>
    }

    expect(requestBody.query).toContain('schoolClasses')
    expect(requestBody.variables).toEqual({
      languageId: null,
      page: 1,
      schoolGradeId: null,
      search: 'eng',
      size: 10,
      status: 'ACTIVE',
    })
  })

  it('fetches a school class detail', async () => {
    mockedPost.mockResolvedValue({
      data: {
        data: {
          schoolClass: mockClass,
        },
      },
    })

    await expect(fetchSchoolClass('class-1')).resolves.toEqual(mockClass)

    const requestBody = mockedPost.mock.calls[0]?.[1] as {
      query: string
      variables: Record<string, unknown>
    }

    expect(requestBody.query).toContain('schoolClass')
    expect(requestBody.variables).toEqual({ id: 'class-1' })
  })

  it('does not request class users without a selected class id', () => {
    const providers = createTestProviders({
      queryClient: createQueryClient(),
    })

    renderHook(() => useSchoolClassUsersQuery(null, 1, 6), {
      wrapper: providers.Wrapper,
    })

    expect(mockedPost).not.toHaveBeenCalled()
  })

  it('requests class users when a class id is provided', async () => {
    const providers = createTestProviders({
      queryClient: createQueryClient(),
    })

    mockedPost.mockResolvedValue({
      data: {
        data: {
          schoolClassUsers: {
            content: [],
            page: 1,
            size: 6,
            totalElements: 0,
            totalPages: 0,
          },
        },
      },
    })

    const { result } = renderHook(
      () => useSchoolClassUsersQuery('class-1', 1, 6),
      {
        wrapper: providers.Wrapper,
      },
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const requestBody = mockedPost.mock.calls[0]?.[1] as {
      query: string
      variables: Record<string, unknown>
    }

    expect(requestBody.query).toContain('schoolClassUsers')
    expect(requestBody.variables).toEqual({
      page: 1,
      schoolClassId: 'class-1',
      size: 6,
    })
  })
})
