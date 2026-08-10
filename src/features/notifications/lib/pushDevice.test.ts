import { apiClient } from '@/shared/api'
import {
  NOTIFICATION_INSTALLATION_STORAGE_KEY,
  unregisterPushDevice,
} from './pushDevice'

const mockedDelete = jest.spyOn(apiClient, 'delete')

describe('unregisterPushDevice', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('gỡ thiết bị đã đăng ký và xoá dấu vết trong localStorage', async () => {
    localStorage.setItem(NOTIFICATION_INSTALLATION_STORAGE_KEY, 'fid-1')
    mockedDelete.mockResolvedValue({ data: { data: null, message: 'ok' } })

    await unregisterPushDevice()

    expect(mockedDelete).toHaveBeenCalledWith('/v1/notifications/devices/fid-1')
    expect(
      localStorage.getItem(NOTIFICATION_INSTALLATION_STORAGE_KEY),
    ).toBeNull()
  })

  it('không gọi API khi chưa từng đăng ký thiết bị nào', async () => {
    await unregisterPushDevice()

    expect(mockedDelete).not.toHaveBeenCalled()
  })

  /**
   * Đăng xuất không bao giờ được hỏng vì một lời gọi phụ trợ: 404 ở đây nghĩa là thiết bị
   * đã được gỡ từ trước, tức đúng kết quả mong muốn.
   */
  it('nuốt lỗi từ backend để không chặn đường đăng xuất', async () => {
    localStorage.setItem(NOTIFICATION_INSTALLATION_STORAGE_KEY, 'fid-1')
    mockedDelete.mockRejectedValue(new Error('Không tìm thấy thiết bị'))

    await expect(unregisterPushDevice()).resolves.toBeUndefined()
    expect(
      localStorage.getItem(NOTIFICATION_INSTALLATION_STORAGE_KEY),
    ).toBeNull()
  })
})
