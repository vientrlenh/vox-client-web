import { renderHook, waitFor } from '@testing-library/react'
import type { AxiosResponse } from 'axios'
import { apiClient } from '@/shared/api'
import { createTestProviders } from '@/test/renderWithProviders'
import type { ApiResponse, SendResetPasswordOtpRequest } from '../types'
import { useSendResetPasswordOtpMutation } from './useSendResetPasswordOtpMutation'

jest.mock('@/shared/api', () => ({
  apiClient: {
    post: jest.fn(),
  },
}))

const payload: SendResetPasswordOtpRequest = {
  email: 'admin@vox.edu.vn',
}

describe('useSendResetPasswordOtpMutation', () => {
  it('posts the reset password OTP request and unwraps the API message', async () => {
    const mockedPost = jest.mocked(apiClient.post)

    mockedPost.mockResolvedValue({
      data: {
        data: null,
        message: 'Mã OTP đặt lại mật khẩu đã được gửi',
      },
    } as AxiosResponse<ApiResponse<null>>)

    const { Wrapper } = createTestProviders()
    const { result } = renderHook(() => useSendResetPasswordOtpMutation(), {
      wrapper: Wrapper,
    })

    result.current.mutate(payload)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockedPost).toHaveBeenCalledWith(
      '/v1/auth/reset-password-otp',
      payload,
    )
    expect(result.current.data).toBe('Mã OTP đặt lại mật khẩu đã được gửi')
  })
})
