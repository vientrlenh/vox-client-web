import type { AxiosResponse } from 'axios'
import { apiClient } from '@/shared/api'
import { AUTH_TOKEN_STORAGE_KEYS } from '@/shared/api'
import {
  acceptSchoolClassUserImport,
  acceptSchoolClassImport,
  previewSchoolClassUserImport,
  previewSchoolClassImport,
} from './useSchoolClassImportMutations'

jest.mock('@/shared/api/apiClient', () => ({
  apiClient: {
    post: jest.fn(),
  },
}))

type ApiResponse<T> = {
  data: T
  message: string
}

const schoolId = '33333333-3333-4333-8333-333333333333'

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
      userId: 'school-admin-1',
    }),
  )
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEYS.refreshToken, 'refresh-token')
}

describe('school class import mutations', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.mocked(apiClient.post).mockReset()
    saveSession()
  })

  it('previews a class import file and unwraps the REST API response', async () => {
    const file = new File(['code,name\nENG-6A,English 6A'], 'classes.csv', {
      type: 'text/csv',
    })

    jest.mocked(apiClient.post).mockResolvedValue({
      data: {
        data: {
          expiresAt: '2026-06-12T00:00:00Z',
          fileName: 'classes.csv',
          importSessionId: 'session-1',
          originalHeaders: ['code', 'name'],
          sampleRows: [{ code: 'ENG-6A', name: 'English 6A' }],
          suggestedMapping: { code: 'code', name: 'name' },
          totalRows: 1,
        },
        message: 'Preview ok',
      },
    } as AxiosResponse<ApiResponse<unknown>>)

    await expect(previewSchoolClassImport({ file })).resolves.toMatchObject({
      data: {
        fileName: 'classes.csv',
        importSessionId: 'session-1',
      },
      message: 'Preview ok',
    })

    const formData = jest.mocked(apiClient.post).mock.calls[0]?.[1] as FormData

    expect(apiClient.post).toHaveBeenCalledWith(
      `/v1/schools/${schoolId}/classes/import/preview`,
      expect.any(FormData),
    )
    expect(formData.get('file')).toBe(file)
  })

  it('accepts a class import session and unwraps the REST API response', async () => {
    jest.mocked(apiClient.post).mockResolvedValue({
      data: {
        data: {
          importSessionId: 'session-1',
          importedRows: 2,
          invalidRows: 1,
          skippedRows: 0,
          status: 'COMPLETED',
          totalRows: 3,
        },
        message: 'Imported',
      },
    } as AxiosResponse<ApiResponse<unknown>>)

    await expect(
      acceptSchoolClassImport({
        payload: {
          confirmedMapping: {
            ClassCode: 'code',
            ClassName: 'name',
            Grade: 'schoolGradeCode',
            Language: 'languageCode',
          },
        },
        sessionId: 'session-1',
      }),
    ).resolves.toMatchObject({
      data: {
        importedRows: 2,
        status: 'COMPLETED',
      },
      message: 'Imported',
    })

    expect(apiClient.post).toHaveBeenCalledWith(
      `/v1/schools/${schoolId}/classes/import/session-1/accept`,
      {
        confirmedMapping: {
          ClassCode: 'code',
          ClassName: 'name',
          Grade: 'schoolGradeCode',
          Language: 'languageCode',
        },
      },
    )
  })

  it('previews a class user import file and unwraps the REST API response', async () => {
    const file = new File(['email,classCode\nstudent@vox.edu.vn,ENG-6A'], 'class-users.csv', {
      type: 'text/csv',
    })

    jest.mocked(apiClient.post).mockResolvedValue({
      data: {
        data: {
          expiresAt: '2026-06-12T00:00:00Z',
          fileName: 'class-users.csv',
          importSessionId: 'session-1',
          originalHeaders: ['email', 'classCode'],
          sampleRows: [{ classCode: 'ENG-6A', email: 'student@vox.edu.vn' }],
          suggestedMapping: { classCode: 'classCode', email: 'email' },
          totalRows: 1,
        },
        message: 'Preview users ok',
      },
    } as AxiosResponse<ApiResponse<unknown>>)

    await expect(previewSchoolClassUserImport({ file })).resolves.toMatchObject({
      data: {
        fileName: 'class-users.csv',
        importSessionId: 'session-1',
      },
      message: 'Preview users ok',
    })

    const formData = jest.mocked(apiClient.post).mock.calls[0]?.[1] as FormData

    expect(apiClient.post).toHaveBeenCalledWith(
      `/v1/schools/${schoolId}/classes/users/import/preview`,
      expect.any(FormData),
    )
    expect(formData.get('file')).toBe(file)
  })

  it('accepts a class user import session and unwraps the REST API response', async () => {
    jest.mocked(apiClient.post).mockResolvedValue({
      data: {
        data: {
          importSessionId: 'session-1',
          importedRows: 2,
          invalidRows: 1,
          skippedRows: 0,
          status: 'COMPLETED',
          totalRows: 3,
        },
        message: 'Imported users',
      },
    } as AxiosResponse<ApiResponse<unknown>>)

    await expect(
      acceptSchoolClassUserImport({
        payload: {
          confirmedMapping: {
            ClassCode: 'classCode',
            Email: 'email',
          },
        },
        sessionId: 'session-1',
      }),
    ).resolves.toMatchObject({
      data: {
        importedRows: 2,
        status: 'COMPLETED',
      },
      message: 'Imported users',
    })

    expect(apiClient.post).toHaveBeenCalledWith(
      `/v1/schools/${schoolId}/classes/users/import/session-1/accept`,
      {
        confirmedMapping: {
          ClassCode: 'classCode',
          Email: 'email',
        },
      },
    )
  })

  it('blocks import REST mutations when school id is missing', async () => {
    saveSession(null)

    await expect(
      previewSchoolClassImport({
        file: new File([''], 'classes.xlsx'),
      }),
    ).rejects.toMatchObject({
      message: 'Missing schoolId in access token.',
    })
    await expect(
      acceptSchoolClassImport({
        payload: { confirmedMapping: { code: 'code' } },
        sessionId: 'session-1',
      }),
    ).rejects.toMatchObject({
      message: 'Missing schoolId in access token.',
    })
    await expect(
      previewSchoolClassUserImport({
        file: new File([''], 'class-users.xlsx'),
      }),
    ).rejects.toMatchObject({
      message: 'Missing schoolId in access token.',
    })
    await expect(
      acceptSchoolClassUserImport({
        payload: { confirmedMapping: { email: 'email' } },
        sessionId: 'session-1',
      }),
    ).rejects.toMatchObject({
      message: 'Missing schoolId in access token.',
    })
    expect(apiClient.post).not.toHaveBeenCalled()
  })
})
