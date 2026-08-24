import type { AxiosResponse } from 'axios'
import { AUTH_TOKEN_STORAGE_KEYS, apiClient } from '@/shared/api'
import {
  acceptImportSession,
  rejectImportSession,
} from './useImportSessionDecisionMutations'

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
}

function mockAcceptResponse() {
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
}

describe('import session decision mutations', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.mocked(apiClient.post).mockReset()
    saveSession()
  })

  it('accepts a SCHOOL_CLASS session via the classes endpoint', async () => {
    mockAcceptResponse()

    await acceptImportSession({
      confirmedMapping: { ClassCode: 'code' },
      sessionId: 'session-1',
      type: 'SCHOOL_CLASS',
    })

    expect(apiClient.post).toHaveBeenCalledWith(
      `/v1/schools/${schoolId}/classes/import/session-1/accept`,
      { confirmedMapping: { ClassCode: 'code' } },
    )
  })

  it('accepts a SCHOOL_CLASS_USER session via the class users endpoint', async () => {
    mockAcceptResponse()

    await acceptImportSession({
      confirmedMapping: { Email: 'email' },
      sessionId: 'session-1',
      type: 'SCHOOL_CLASS_USER',
    })

    expect(apiClient.post).toHaveBeenCalledWith(
      `/v1/schools/${schoolId}/classes/users/import/session-1/accept`,
      { confirmedMapping: { Email: 'email' } },
    )
  })

  it('accepts a USER session via the school users endpoint', async () => {
    mockAcceptResponse()

    await acceptImportSession({
      confirmedMapping: { Email: 'email' },
      sessionId: 'session-1',
      type: 'USER',
    })

    expect(apiClient.post).toHaveBeenCalledWith(
      `/v1/schools/${schoolId}/users/import/session-1/accept`,
      { confirmedMapping: { Email: 'email' } },
    )
  })

  it('accepts a SCHOOL_DIRECTORY session via the directories endpoint without a schoolId', async () => {
    localStorage.clear()
    saveSession(null)
    mockAcceptResponse()

    await acceptImportSession({
      confirmedMapping: { Code: 'code' },
      sessionId: 'session-1',
      type: 'SCHOOL_DIRECTORY',
    })

    expect(apiClient.post).toHaveBeenCalledWith(
      '/v1/schools/directories/import/session-1/accept',
      { confirmedMapping: { Code: 'code' } },
    )
  })

  it.each([
    ['SCHOOL_GRADE', 'grades'],
    ['SCHOOL_ROOM', 'rooms'],
  ])('accepts a %s session via the %s endpoint', async (type, segment) => {
    mockAcceptResponse()

    await acceptImportSession({
      confirmedMapping: { Code: 'code' },
      sessionId: 'session-1',
      type,
    })

    expect(apiClient.post).toHaveBeenCalledWith(
      `/v1/schools/${schoolId}/${segment}/import/session-1/accept`,
      { confirmedMapping: { Code: 'code' } },
    )
  })

  it('accepts a QUESTION session via the questions endpoint without a schoolId', async () => {
    localStorage.clear()
    saveSession(null)
    mockAcceptResponse()

    await acceptImportSession({
      confirmedMapping: { NoiDung: 'questionText' },
      sessionId: 'session-1',
      type: 'QUESTION',
    })

    expect(apiClient.post).toHaveBeenCalledWith(
      '/v1/questions/import/session-1/accept',
      { confirmedMapping: { NoiDung: 'questionText' } },
    )
  })

  // Rubric và chính sách đánh giá có hai phạm vi; schoolId của chính phiên
  // import quyết định endpoint, không phải vai trò người đăng nhập.
  it.each([
    [
      'RUBRIC_VERSION',
      `/v1/rubrics/schools/${schoolId}/rubrics/versions/import/session-1/accept`,
      '/v1/rubrics/system/rubrics/versions/import/session-1/accept',
    ],
    [
      'RUBRIC_CRITERION',
      `/v1/rubrics/schools/${schoolId}/rubric-versions/import-sessions/session-1/accept`,
      '/v1/rubrics/system/rubrics/criterions/import/session-1/accept',
    ],
    [
      'RUBRIC_CRITERION_BAND',
      `/v1/rubrics/schools/${schoolId}/rubric-criterions/bands/import/session-1/accept`,
      '/v1/rubrics/system/rubrics/criterions/bands/import/session-1/accept',
    ],
    [
      'RUBRIC_RESULT_BAND',
      `/v1/rubrics/school/${schoolId}/rubric-versions/result-bands/import/session-1/accept`,
      '/v1/rubrics/system/versions/result-bands/import/session-1/accept',
    ],
    [
      'ASSESSMENT_POLICY',
      `/v1/assessment-policies/schools/${schoolId}/import/session-1/accept`,
      '/v1/assessment-policies/system/import/session-1/accept',
    ],
  ])(
    'routes %s by the session schoolId',
    async (type, schoolUrl, systemUrl) => {
      mockAcceptResponse()

      await acceptImportSession({
        confirmedMapping: { Code: 'code' },
        schoolId,
        sessionId: 'session-1',
        type,
      })

      expect(apiClient.post).toHaveBeenLastCalledWith(schoolUrl, {
        confirmedMapping: { Code: 'code' },
      })

      await acceptImportSession({
        confirmedMapping: { Code: 'code' },
        schoolId: null,
        sessionId: 'session-1',
        type,
      })

      expect(apiClient.post).toHaveBeenLastCalledWith(systemUrl, {
        confirmedMapping: { Code: 'code' },
      })
    },
  )

  it('throws for an unsupported import type', async () => {
    await expect(
      acceptImportSession({
        confirmedMapping: {},
        sessionId: 'session-1',
        type: 'UNKNOWN',
      }),
    ).rejects.toThrow('Loại import không được hỗ trợ')

    expect(apiClient.post).not.toHaveBeenCalled()
  })

  it('rejects a session via the generic imports endpoint', async () => {
    jest.mocked(apiClient.post).mockResolvedValue({
      data: { data: null, message: 'Hủy import thành công' },
    } as AxiosResponse<ApiResponse<unknown>>)

    await expect(
      rejectImportSession({ sessionId: 'session-1' }),
    ).resolves.toMatchObject({ message: 'Hủy import thành công' })

    expect(apiClient.post).toHaveBeenCalledWith('/v1/imports/session-1/reject')
  })
})
