import type { AxiosResponse } from 'axios'
import { apiClient } from '@/shared/api'
import type { ApiResponse, RefreshResponse } from '../types'
import { refreshAuthTokens } from './refreshAuthTokens'

jest.mock('@/shared/api', () => ({
  apiClient: {
    post: jest.fn(),
  },
}))

describe('refreshAuthTokens', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.mocked(apiClient.post).mockReset()
  })

  it('posts the refresh token with the persisted device id and unwraps data', async () => {
    localStorage.setItem('vox.deviceId', 'device-1')

    const responseData: RefreshResponse = {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    }

    jest.mocked(apiClient.post).mockResolvedValue({
      data: {
        data: responseData,
        message: 'Yeu cau thanh cong',
      },
    } as AxiosResponse<ApiResponse<RefreshResponse>>)

    await expect(refreshAuthTokens('old-refresh-token')).resolves.toEqual(
      responseData,
    )
    expect(apiClient.post).toHaveBeenCalledWith('/v1/auth/refresh', {
      deviceId: 'device-1',
      token: 'old-refresh-token',
    })
  })
})
