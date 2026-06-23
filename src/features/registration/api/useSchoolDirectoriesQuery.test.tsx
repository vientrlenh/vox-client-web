import { graphqlApiClient } from '@/shared/api/graphqlClient'
import type { PageResult, SchoolDirectory } from '../types'
import { fetchSchoolDirectories } from './useSchoolDirectoriesQuery'

const mockedPost = jest.spyOn(graphqlApiClient, 'post')

const mockDirectory: SchoolDirectory = {
  address: '123 Đường ABC',
  district: 'Quận 1',
  domain: 'nguyendu.edu.vn',
  id: 'directory-1',
  name: 'Trường THPT Nguyễn Du',
  province: 'TP. Hồ Chí Minh',
  source: 'ADMIN_VERIFIED',
}

const mockPage: PageResult<SchoolDirectory> = {
  content: [mockDirectory],
  page: 1,
  size: 8,
  totalElements: 1,
  totalPages: 1,
}

describe('fetchSchoolDirectories', () => {
  beforeEach(() => {
    mockedPost.mockReset()
  })

  it('sends a trimmed search and the requested page/size', async () => {
    mockedPost.mockResolvedValue({
      data: {
        data: { schoolDirectories: mockPage },
      },
    })

    await expect(
      fetchSchoolDirectories({ page: 1, search: '  Nguyễn Du  ', size: 8 }),
    ).resolves.toEqual(mockPage)

    const requestBody = mockedPost.mock.calls[0]?.[1] as {
      query: string
      variables: Record<string, unknown>
    }

    expect(requestBody.query).toContain('schoolDirectories')
    expect(requestBody.variables).toEqual({
      page: 1,
      search: 'Nguyễn Du',
      size: 8,
    })
  })

  it('passes null when the search term is empty', async () => {
    mockedPost.mockResolvedValue({
      data: {
        data: { schoolDirectories: mockPage },
      },
    })

    await fetchSchoolDirectories({ page: 1, search: '   ', size: 8 })

    const requestBody = mockedPost.mock.calls[0]?.[1] as {
      variables: Record<string, unknown>
    }

    expect(requestBody.variables.search).toBeNull()
  })
})
