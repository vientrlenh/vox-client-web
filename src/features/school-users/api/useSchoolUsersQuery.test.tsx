import { AUTH_TOKEN_STORAGE_KEYS } from '@/shared/api'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import type { PageResult, SchoolUser } from '../types'
import { fetchSchoolUser } from './useSchoolUserQuery'
import { fetchSchoolUsers } from './useSchoolUsersQuery'

const mockedPost = jest.spyOn(graphqlApiClient, 'post')

const schoolId = '33333333-3333-4333-8333-333333333333'

const mockSchoolUser: SchoolUser = {
  endDate: '2026-05-31T00:00:00Z',
  id: 'membership-1',
  schoolId,
  startDate: '2025-09-01T00:00:00Z',
  user: {
    address: 'Hà Nội',
    avatarUrl: null,
    dateOfBirth: '2010-01-01',
    email: 'student@vox.edu.vn',
    fullName: 'Nguyễn Văn A',
    gender: 'MALE',
    id: 'user-1',
    phone: '0901234567',
    schoolRoles: [{ code: 'STUDENT', id: 'role-1', name: 'Học sinh' }],
  },
  userId: 'user-1',
}

const mockPage: PageResult<SchoolUser> = {
  content: [mockSchoolUser],
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
      userId: 'admin-1',
    }),
  )
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEYS.refreshToken, 'refresh-token')
}

describe('school user GraphQL API', () => {
  beforeEach(() => {
    mockedPost.mockReset()
    localStorage.clear()
    saveSession()
  })

  it('fetches school users with search/role/status and the current schoolId', async () => {
    mockedPost.mockResolvedValue({
      data: {
        data: {
          schoolUsersBySchool: mockPage,
        },
      },
    })

    await expect(
      fetchSchoolUsers({
        filters: { role: 'STUDENT', search: 'nguyen', status: 'ACTIVE' },
        page: 1,
        size: 10,
      }),
    ).resolves.toEqual(mockPage)

    const requestBody = mockedPost.mock.calls[0]?.[1] as {
      query: string
      variables: Record<string, unknown>
    }

    expect(requestBody.query).toContain('schoolUsersBySchool')
    expect(requestBody.variables).toEqual({
      page: 1,
      role: 'STUDENT',
      schoolId,
      search: 'nguyen',
      size: 10,
      status: 'ACTIVE',
    })
  })

  it('sends nulls for empty filters', async () => {
    mockedPost.mockResolvedValue({
      data: { data: { schoolUsersBySchool: mockPage } },
    })

    await fetchSchoolUsers({
      filters: { role: '', search: '   ', status: '' },
      page: 2,
      size: 20,
    })

    const requestBody = mockedPost.mock.calls[0]?.[1] as {
      variables: Record<string, unknown>
    }

    expect(requestBody.variables).toEqual({
      page: 2,
      role: null,
      schoolId,
      search: null,
      size: 20,
      status: null,
    })
  })

  it('fetches a single school user detail', async () => {
    mockedPost.mockResolvedValue({
      data: { data: { schoolUser: mockSchoolUser } },
    })

    await expect(fetchSchoolUser('user-1')).resolves.toEqual(mockSchoolUser)

    const requestBody = mockedPost.mock.calls[0]?.[1] as {
      query: string
      variables: Record<string, unknown>
    }

    expect(requestBody.query).toContain('schoolUser(')
    expect(requestBody.variables).toEqual({ schoolId, userId: 'user-1' })
  })
})
