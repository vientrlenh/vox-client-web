import type { AxiosResponse } from 'axios'
import { apiClient } from '@/shared/api'
import type { RegisterSchoolDirectoryRequest } from '../types'
import {
  isOtpPathMessage,
  registerSchoolDirectory,
} from './useRegisterSchoolDirectoryMutation'

jest.mock('@/shared/api', () => ({
  apiClient: {
    post: jest.fn(),
  },
}))

type ApiResponse<T> = {
  data: T
  message: string
}

const payload: RegisterSchoolDirectoryRequest = {
  contactAddress: '27 test street',
  contactEmail: 'admin@truong.edu.vn',
  contactFullName: 'Tran Chan Quang Thien',
  contactPhone: '0355906225',
  dateOfBirth: '2004-09-05',
  identityNumber: '079384563728',
  position: 'Hiệu trưởng',
  postalCode: '70000',
  schoolDirectoryId: 'directory-1',
  studentCount: 3000,
}

describe('registerSchoolDirectory', () => {
  beforeEach(() => {
    jest.mocked(apiClient.post).mockReset()
  })

  it('posts to the directory endpoint and returns the inner data', async () => {
    jest.mocked(apiClient.post).mockResolvedValue({
      data: {
        data: { message: 'Mã OTP xác thực đã được gửi' },
        message: 'Yêu cầu thành công',
      },
    } as AxiosResponse<ApiResponse<{ message: string }>>)

    await expect(registerSchoolDirectory(payload)).resolves.toEqual({
      message: 'Mã OTP xác thực đã được gửi',
    })

    expect(apiClient.post).toHaveBeenCalledWith(
      '/v1/auth/register-school-directory',
      payload,
    )
  })
})

describe('isOtpPathMessage', () => {
  it('detects the OTP path from the message', () => {
    expect(isOtpPathMessage('Mã OTP xác thực đã được gửi')).toBe(true)
  })

  it('treats other messages as the document path', () => {
    expect(isOtpPathMessage('Vui lòng đợi quản trị viên xác thực')).toBe(false)
  })
})
