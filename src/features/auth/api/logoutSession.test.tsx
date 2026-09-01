import type { AxiosResponse } from 'axios'
import { type ApiResponse, apiClient } from '@/shared/api'
import { logoutSession } from './logoutSession'

jest.mock('@/shared/api', () => ({
  apiClient: {
    post: jest.fn(),
  },
}))

describe('logoutSession', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.mocked(apiClient.post).mockReset()
  })

  it('posts the persisted device id', async () => {
    localStorage.setItem('vox.deviceId', 'device-1')

    jest.mocked(apiClient.post).mockResolvedValue({
      data: {
        data: null,
        message: 'Dang xuat thanh cong',
      },
    } as AxiosResponse<ApiResponse<null>>)

    await expect(logoutSession()).resolves.toBeUndefined()
    expect(apiClient.post).toHaveBeenCalledWith('/v1/auth/logout', {
      deviceId: 'device-1',
    })
  })

  /**
   * Phải là ĐÚNG id đã dùng lúc đăng nhập: backend dọn phiên theo cặp (userId, deviceId), nên
   * một id sinh mới ở đây sẽ thu hồi trượt và phiên cũ sống tiếp hết 72 giờ.
   */
  it('reuses the device id stored at login instead of minting a new one', async () => {
    localStorage.setItem('vox.deviceId', 'device-from-login')

    jest.mocked(apiClient.post).mockResolvedValue({
      data: { data: null, message: 'Dang xuat thanh cong' },
    } as AxiosResponse<ApiResponse<null>>)

    await logoutSession()

    expect(apiClient.post).toHaveBeenCalledWith('/v1/auth/logout', {
      deviceId: 'device-from-login',
    })
    expect(localStorage.getItem('vox.deviceId')).toBe('device-from-login')
  })
})
