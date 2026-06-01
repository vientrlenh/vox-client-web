import { renderHook, waitFor } from '@testing-library/react'
import type { AxiosResponse } from 'axios'
import { apiClient } from '@/shared/api'
import { createTestProviders } from '@/test/renderWithProviders'
import type { ApiResponse, ResetPasswordRequest } from '../types'
import { useResetPasswordMutation } from './useResetPasswordMutation'

jest.mock('@/shared/api', () => ({
  apiClient: {
    patch: jest.fn(),
  },
}))

const payload: ResetPasswordRequest = {
  email: 'admin@vox.edu.vn',
  otp: '123456',
  password: 'Password1!',
}

describe('useResetPasswordMutation', () => {
  it('patches the reset password request and unwraps the API message', async () => {
    const mockedPatch = jest.mocked(apiClient.patch)

    mockedPatch.mockResolvedValue({
      data: {
        data: null,
        message: 'Mật khẩu đã thay đổi thành công',
      },
    } as AxiosResponse<ApiResponse<null>>)

    const { Wrapper } = createTestProviders()
    const { result } = renderHook(() => useResetPasswordMutation(), {
      wrapper: Wrapper,
    })

    result.current.mutate(payload)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockedPatch).toHaveBeenCalledWith('/v1/auth/reset-password', payload)
    expect(result.current.data).toBe('Mật khẩu đã thay đổi thành công')
  })
})
