import type { AxiosResponse } from 'axios'
import { apiClient } from '@/shared/api'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { appConfig } from '@/shared/config/env'
import type { CreateSchoolClassRequest } from '../types'
import {
  addClassUser,
  createSchoolClass,
  deleteSchoolClass,
  removeClassUser,
  updateClassUserStatus,
  updateSchoolClass,
} from './useSchoolClassMutations'

const mockedGraphqlPost = jest.spyOn(graphqlApiClient, 'post')

jest.mock('@/shared/api/apiClient', () => ({
  apiClient: {
    delete: jest.fn(),
    patch: jest.fn(),
    post: jest.fn(),
  },
}))

type MutableConfig = {
  schoolId: string
}

type ApiResponse<T> = {
  data: T
  message: string
}

const schoolId = '33333333-3333-4333-8333-333333333333'
const payload: CreateSchoolClassRequest = {
  code: 'ENG-6A',
  description: null,
  languageId: '11111111-1111-4111-8111-111111111111',
  name: 'English 6A',
  schoolGradeId: '22222222-2222-4222-8222-222222222222',
}

function setSchoolId(value: string) {
  ;(appConfig as unknown as MutableConfig).schoolId = value
}

describe('class management mutations', () => {
  beforeEach(() => {
    jest.mocked(apiClient.post).mockReset()
    jest.mocked(apiClient.delete).mockReset()
    jest.mocked(apiClient.patch).mockReset()
    mockedGraphqlPost.mockReset()
    setSchoolId(schoolId)
  })

  it('creates a class and unwraps the REST API response', async () => {
    jest.mocked(apiClient.post).mockResolvedValue({
      data: {
        data: { schoolClassId: 'class-1' },
        message: 'Created',
      },
    } as AxiosResponse<ApiResponse<{ schoolClassId: string }>>)

    await expect(createSchoolClass({ payload })).resolves.toEqual({
      data: { schoolClassId: 'class-1' },
      message: 'Created',
    })

    expect(apiClient.post).toHaveBeenCalledWith(
      `/v1/schools/${schoolId}/classes`,
      payload,
    )
  })

  it('blocks REST mutations when school id is missing', async () => {
    setSchoolId('')

    await expect(createSchoolClass({ payload })).rejects.toMatchObject({
      message:
        'Missing VITE_SCHOOL_ID. Configure a school id before changing classes.',
    })
    expect(apiClient.post).not.toHaveBeenCalled()
  })

  it('updates a class through GraphQL', async () => {
    mockedGraphqlPost.mockResolvedValue({
      data: {
        data: {
          updateSchoolClass: { schoolClassId: 'class-1' },
        },
      },
    })

    await expect(
      updateSchoolClass({
        id: 'class-1',
        payload: {
          description: null,
          name: 'English 6A Updated',
          status: 'ACTIVE',
        },
      }),
    ).resolves.toEqual({
      data: { schoolClassId: 'class-1' },
      message: 'Class updated successfully.',
    })

    const requestBody = mockedGraphqlPost.mock.calls[0]?.[1] as {
      query: string
      variables: Record<string, unknown>
    }

    expect(requestBody.query).toContain('updateSchoolClass')
    expect(requestBody.variables).toEqual({
      id: 'class-1',
      input: {
        description: null,
        name: 'English 6A Updated',
        status: 'ACTIVE',
      },
    })
  })

  it('deletes a class through REST', async () => {
    jest.mocked(apiClient.delete).mockResolvedValue({
      data: {
        data: {
          deleteType: 'SOFT',
          id: 'class-1',
          status: 'ARCHIVED',
          updatedAt: '2026-06-10T00:00:00Z',
        },
        message: 'Deleted',
      },
    } as AxiosResponse<ApiResponse<unknown>>)

    await expect(deleteSchoolClass({ classId: 'class-1' })).resolves.toEqual({
      data: {
        deleteType: 'SOFT',
        id: 'class-1',
        status: 'ARCHIVED',
        updatedAt: '2026-06-10T00:00:00Z',
      },
      message: 'Deleted',
    })

    expect(apiClient.delete).toHaveBeenCalledWith(
      `/v1/schools/${schoolId}/classes/class-1`,
    )
  })

  it('manages users in a class through REST endpoints', async () => {
    jest.mocked(apiClient.post).mockResolvedValue({
      data: {
        data: { schoolClassUserId: 'class-user-1' },
        message: 'Added',
      },
    } as AxiosResponse<ApiResponse<unknown>>)
    jest.mocked(apiClient.delete).mockResolvedValue({
      data: {
        data: { schoolClassId: 'class-1' },
        message: 'Removed',
      },
    } as AxiosResponse<ApiResponse<unknown>>)
    jest.mocked(apiClient.patch).mockResolvedValue({
      data: {
        data: { schoolClassId: 'class-1' },
        message: 'Updated',
      },
    } as AxiosResponse<ApiResponse<unknown>>)

    await addClassUser({ classId: 'class-1', userId: 'user-1' })
    await removeClassUser({ classId: 'class-1', userId: 'user-1' })
    await updateClassUserStatus({
      classId: 'class-1',
      isActive: false,
      userId: 'user-1',
    })

    expect(apiClient.post).toHaveBeenCalledWith(
      `/v1/schools/${schoolId}/classes/class-1/users`,
      { userId: 'user-1' },
    )
    expect(apiClient.delete).toHaveBeenCalledWith(
      `/v1/schools/${schoolId}/classes/class-1/users/user-1`,
    )
    expect(apiClient.patch).toHaveBeenCalledWith(
      `/v1/schools/${schoolId}/classes/class-1/users/user-1/status`,
      { isActive: false },
    )
  })
})
