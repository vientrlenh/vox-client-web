import { renderHook, waitFor } from '@testing-library/react'
import type { AxiosResponse } from 'axios'
import { apiClient } from '@/shared/api'
import { createTestProviders } from '@/test/renderWithProviders'
import type { ApiResponse, SetUpPasswordRequest } from '../types'
import { useSetUpPasswordMutation } from './useSetUpPasswordMutation'

jest.mock('@/shared/api', () => ({
  apiClient: {
    post: jest.fn(),
  },
}))

const setUpPasswordPayload: SetUpPasswordRequest = {
  password: 'Password1!',
  token: 'setup-token',
  userId: 'f8635b2c-8770-49a0-9cf7-b6581a1bdc22',
}

describe('useSetUpPasswordMutation', () => {
  it('posts the setup password request and unwraps the API response message', async () => {
    const mockedPost = jest.mocked(apiClient.post)

    mockedPost.mockResolvedValue({
      data: {
        data: null,
        message: 'Mật khẩu đã được thiết lập thành công',
      },
    } as AxiosResponse<ApiResponse<null>>)

    const { Wrapper } = createTestProviders()
    const { result } = renderHook(() => useSetUpPasswordMutation(), {
      wrapper: Wrapper,
    })

    result.current.mutate(setUpPasswordPayload)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockedPost).toHaveBeenCalledWith(
      '/v1/auth/setup-password',
      setUpPasswordPayload,
    )
    expect(result.current.data).toBe('Mật khẩu đã được thiết lập thành công')
  })
})
