import { AUTH_TOKEN_STORAGE_KEYS } from '@/shared/api'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import type { SchoolGrade, SchoolGradePage } from '../types'
import { fetchSchoolGrades } from './useSchoolGradesQuery'

const mockedPost = jest.spyOn(graphqlApiClient, 'post')

const schoolId = '33333333-3333-4333-8333-333333333333'

const mockGrade: SchoolGrade = {
  code: 'NH2024-2025',
  createdAt: '2026-06-01T00:00:00Z',
  description: null,
  endDate: '2025-05-31',
  id: 'grade-1',
  name: 'Năm học 2024-2025',
  startDate: '2024-09-01',
  status: 'ACTIVE',
  updatedAt: '2026-06-02T00:00:00Z',
}

const mockGradePage: SchoolGradePage = {
  content: [mockGrade],
  page: 1,
  size: 10,
  totalElements: 1,
  totalPages: 1,
}

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
      schoolId,
      userId: 'user-1',
    }),
  )
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEYS.refreshToken, 'refresh-token')
}

describe('grade management GraphQL API', () => {
  beforeEach(() => {
    localStorage.clear()
    mockedPost.mockReset()
    saveSession()
  })

  it('fetches school grades with schoolId and pagination', async () => {
    mockedPost.mockResolvedValue({
      data: {
        data: {
          schoolGrades: mockGradePage,
        },
      },
    })

    await expect(fetchSchoolGrades(1, 10)).resolves.toEqual(mockGradePage)

    const requestBody = mockedPost.mock.calls[0]?.[1] as {
      query: string
      variables: Record<string, unknown>
    }

    expect(requestBody.query).toContain('schoolGrades')
    expect(requestBody.variables).toEqual({
      page: 1,
      schoolId,
      size: 10,
    })
  })
})
