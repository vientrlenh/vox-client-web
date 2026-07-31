import { AUTH_TOKEN_STORAGE_KEYS } from '@/shared/api'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import type { ClassUserCandidate, ClassUserCandidateFilters, PageResult } from '../types'
import { fetchSchoolUsersNotInClass } from './useSchoolUsersNotInClassQuery'

const mockedPost = jest.spyOn(graphqlApiClient, 'post')

const schoolId = '33333333-3333-4333-8333-333333333333'
const classId = 'class-1'

const emptyPage: PageResult<ClassUserCandidate> = {
  content: [],
  page: 1,
  size: 10,
  totalElements: 0,
  totalPages: 0,
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
      userId: 'school-admin-1',
    }),
  )
}

function requestVariables() {
  const requestBody = mockedPost.mock.calls[0]?.[1] as {
    query: string
    variables: Record<string, unknown>
  }

  return requestBody
}

describe('fetchSchoolUsersNotInClass', () => {
  beforeEach(() => {
    localStorage.clear()
    mockedPost.mockReset()
    saveSession()
    mockedPost.mockResolvedValue({
      data: {
        data: {
          schoolUsersBySchool: emptyPage,
        },
      },
    })
  })

  it('sends the class id as excludeClassId and normalises empty filters to null', async () => {
    const filters: ClassUserCandidateFilters = {
      roleCode: '',
      search: '   ',
    }

    await expect(
      fetchSchoolUsersNotInClass(classId, 1, 10, filters),
    ).resolves.toEqual(emptyPage)

    const request = requestVariables()

    expect(request.query).toContain('schoolUsersBySchool')
    expect(request.variables).toEqual({
      excludeClassId: classId,
      page: 1,
      roleCode: null,
      schoolId,
      search: null,
      size: 10,
      status: 'ACTIVE',
    })
  })

  it('forwards the role and trimmed search filters, always asking for active users', async () => {
    const filters: ClassUserCandidateFilters = {
      roleCode: 'STUDENT',
      search: '  nguyễn  ',
    }

    await fetchSchoolUsersNotInClass(classId, 2, 20, filters)

    expect(requestVariables().variables).toEqual({
      excludeClassId: classId,
      page: 2,
      roleCode: 'STUDENT',
      schoolId,
      search: 'nguyễn',
      size: 20,
      status: 'ACTIVE',
    })
  })
})
