import type { AxiosResponse } from 'axios'
import { apiClient } from '@/shared/api'
import { AUTH_TOKEN_STORAGE_KEYS } from '@/shared/api'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import type { CreateSchoolGradeRequest } from '../types'
import {
  createSchoolGrade,
  deleteSchoolGrade,
  updateSchoolGrade,
} from './useSchoolGradeMutations'

const mockedGraphqlPost = jest.spyOn(graphqlApiClient, 'post')

jest.mock('@/shared/api/apiClient', () => ({
  apiClient: {
    delete: jest.fn(),
    post: jest.fn(),
  },
}))

type ApiResponse<T> = {
  data: T
  message: string
}

const schoolId = '33333333-3333-4333-8333-333333333333'
const schoolGradeLevelId = '44444444-4444-4444-8444-444444444444'
const payload: CreateSchoolGradeRequest = {
  code: 'NH2024-2025',
  endDate: '2025-05-31',
  name: 'Năm học 2024-2025',
  startDate: '2024-09-01',
}

function createJwt(payload: Record<string, unknown>) {
  const encode = (value: Record<string, unknown>) =>
    btoa(JSON.stringify(value))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '')

  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`
}

function saveSession(nextSchoolId: string | null = schoolId) {
  localStorage.setItem(
    AUTH_TOKEN_STORAGE_KEYS.accessToken,
    createJwt({
      email: 'school-admin@vox.edu.vn',
      exp: Math.floor(Date.now() / 1000) + 3600,
      roles: ['SCHOOL_ADMIN'],
      ...(nextSchoolId ? { schoolId: nextSchoolId } : {}),
      userId: 'user-1',
    }),
  )
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEYS.refreshToken, 'refresh-token')
}

describe('grade management mutations', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.mocked(apiClient.post).mockReset()
    jest.mocked(apiClient.delete).mockReset()
    mockedGraphqlPost.mockReset()
    saveSession()
  })

  it('creates a grade under a grade level and unwraps the REST response', async () => {
    jest.mocked(apiClient.post).mockResolvedValue({
      data: {
        data: { schoolGradeId: 'grade-1' },
        message: 'Created',
      },
    } as AxiosResponse<ApiResponse<{ schoolGradeId: string }>>)

    await expect(
      createSchoolGrade({ payload, schoolGradeLevelId }),
    ).resolves.toEqual({
      data: { schoolGradeId: 'grade-1' },
      message: 'Created',
    })

    expect(apiClient.post).toHaveBeenCalledWith(
      `/v1/schools/${schoolId}/grade-levels/${schoolGradeLevelId}/grades`,
      payload,
    )
  })

  it('blocks REST mutations when school id is missing', async () => {
    saveSession(null)

    await expect(
      createSchoolGrade({ payload, schoolGradeLevelId }),
    ).rejects.toMatchObject({
      message: 'Missing schoolId in access token.',
    })
    expect(apiClient.post).not.toHaveBeenCalled()
  })

  it('updates a grade through GraphQL', async () => {
    mockedGraphqlPost.mockResolvedValue({
      data: {
        data: {
          updateSchoolGrade: 'grade-1',
        },
      },
    })

    await expect(
      updateSchoolGrade({
        id: 'grade-1',
        payload: { name: 'Năm học 2024-2025 nâng cao' },
      }),
    ).resolves.toEqual({
      data: { gradeId: 'grade-1' },
      message: 'Cập nhật năm học thành công.',
    })

    const requestBody = mockedGraphqlPost.mock.calls[0]?.[1] as {
      query: string
      variables: Record<string, unknown>
    }

    expect(requestBody.query).toContain('updateSchoolGrade')
    expect(requestBody.variables).toEqual({
      id: 'grade-1',
      input: { name: 'Năm học 2024-2025 nâng cao' },
    })
  })

  it('deletes a grade through REST', async () => {
    jest.mocked(apiClient.delete).mockResolvedValue({
      data: {
        data: { id: 'grade-1' },
        message: 'Deleted',
      },
    } as AxiosResponse<ApiResponse<unknown>>)

    await expect(deleteSchoolGrade({ gradeId: 'grade-1' })).resolves.toEqual({
      data: { id: 'grade-1' },
      message: 'Deleted',
    })

    expect(apiClient.delete).toHaveBeenCalledWith(
      `/v1/schools/${schoolId}/grades/grade-1`,
    )
  })
})
