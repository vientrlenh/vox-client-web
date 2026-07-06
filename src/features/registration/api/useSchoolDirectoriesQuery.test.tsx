import { graphqlApiClient } from '@/shared/api/graphqlClient'
import type { SchoolDirectory } from '../types'
import { fetchSchoolDirectoryCursorPage } from './useSchoolDirectoriesQuery'

const mockedPost = jest.spyOn(graphqlApiClient, 'post')

const mockDirectory: SchoolDirectory = {
  address: '123 Đường ABC',
  code: 'HCM001',
  districtName: 'Quận 1',
  domain: 'nguyendu.edu.vn',
  id: 'directory-1',
  name: 'Trường THPT Nguyễn Du',
  provinceName: 'TP. Hồ Chí Minh',
  verified: true,
}

const mockCursorPage = {
  content: [mockDirectory],
  hasNext: true,
  nextCursor: 'directory-1',
}

describe('fetchSchoolDirectoryCursorPage', () => {
  beforeEach(() => {
    mockedPost.mockReset()
  })

  it('requests the cursor page with the given cursor and limit', async () => {
    mockedPost.mockResolvedValue({
      data: {
        data: { schoolDirectoryCursorPage: mockCursorPage },
      },
    })

    await expect(
      fetchSchoolDirectoryCursorPage({ cursor: 'directory-0', limit: 8 }),
    ).resolves.toEqual(mockCursorPage)

    const requestBody = mockedPost.mock.calls[0]?.[1] as {
      query: string
      variables: Record<string, unknown>
    }

    expect(requestBody.query).toContain('schoolDirectoryCursorPage')
    expect(requestBody.variables).toEqual({
      cursor: 'directory-0',
      limit: 8,
    })
  })

  it('passes a null cursor for the first page', async () => {
    mockedPost.mockResolvedValue({
      data: {
        data: { schoolDirectoryCursorPage: mockCursorPage },
      },
    })

    await fetchSchoolDirectoryCursorPage({ cursor: null, limit: 8 })

    const requestBody = mockedPost.mock.calls[0]?.[1] as {
      variables: Record<string, unknown>
    }

    expect(requestBody.variables.cursor).toBeNull()
  })
})
