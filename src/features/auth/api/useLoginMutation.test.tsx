import { renderHook, waitFor } from '@testing-library/react'
import type { AxiosResponse } from 'axios'
import { apiClient } from '@/shared/api'
import { createTestProviders } from '@/test/renderWithProviders'
import type { ApiResponse, LoginResponse } from '../types'
import { useLoginMutation } from './useLoginMutation'

jest.mock('@/shared/api', () => ({
  apiClient: {
    post: jest.fn(),
  },
}))

describe('useLoginMutation', () => {
  it('posts login credentials and unwraps the API response data', async () => {
    const mockedPost = jest.mocked(apiClient.post)
    const responseData: LoginResponse = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      roles: ['SYSTEM_ADMIN'],
    }

    mockedPost.mockResolvedValue({
      data: {
        data: responseData,
        message: 'Đăng nhập thành công',
      },
    } as AxiosResponse<ApiResponse<LoginResponse>>)

    const { Wrapper } = createTestProviders()
    const { result } = renderHook(() => useLoginMutation(), {
      wrapper: Wrapper,
    })

    result.current.mutate({
      login: 'admin@vox.edu.vn',
      password: 'secret',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockedPost).toHaveBeenCalledWith('/v1/auth/login', {
      device: {
        deviceId: expect.any(String),
        deviceName: expect.any(String),
        platform: 'WEB',
      },
      login: 'admin@vox.edu.vn',
      password: 'secret',
    })
    expect(result.current.data).toEqual(responseData)
  })
})
