import type { AxiosResponse } from 'axios'
import { apiClient } from '@/shared/api'
import type { VerifyRegistrationRequest } from '../types'
import { verifyRegistration } from './useVerifyRegistrationMutation'

jest.mock('@/shared/api', () => ({
  apiClient: {
    post: jest.fn(),
  },
}))

type ApiResponse<T> = {
  data: T
  message: string
}

const payload: VerifyRegistrationRequest = {
  email: 'nguyenvana@truong.edu.vn',
  otp: '482910',
}

describe('verifyRegistration', () => {
  beforeEach(() => {
    jest.mocked(apiClient.post).mockReset()
  })

  it('posts the email and otp and unwraps the message', async () => {
    jest.mocked(apiClient.post).mockResolvedValue({
      data: {
        data: null,
        message: 'Đơn yêu cầu đã được xác thực',
      },
    } as AxiosResponse<ApiResponse<null>>)

    await expect(verifyRegistration(payload)).resolves.toBe(
      'Đơn yêu cầu đã được xác thực',
    )

    expect(apiClient.post).toHaveBeenCalledWith(
      '/v1/auth/verify-registration',
      payload,
    )
  })
})
