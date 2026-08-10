import { CLIENT_DEVICE_STORAGE_KEY } from '@/features/auth/session/authSession'
import { apiClient } from '@/shared/api'
import {
  createNotificationDevice,
  deleteNotificationDevice,
} from './notificationDeviceApi'

const mockedPost = jest.spyOn(apiClient, 'post')
const mockedDelete = jest.spyOn(apiClient, 'delete')

describe('createNotificationDevice', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  /**
   * Backend dọn thiết bị theo cặp (userId, deviceId) khi một phiên bị thu hồi. Gửi một
   * deviceId khác với deviceId lúc đăng nhập thì cơ chế dọn đó trượt mà không báo lỗi ở
   * đâu cả -- nên ràng buộc này đáng được test giữ.
   */
  it('gửi đúng deviceId đã dùng khi đăng nhập', async () => {
    localStorage.setItem(CLIENT_DEVICE_STORAGE_KEY, 'device-dang-nhap')
    mockedPost.mockResolvedValue({ data: { data: null, message: 'ok' } })

    await createNotificationDevice('fid-1')

    expect(mockedPost).toHaveBeenCalledWith('/v1/notifications/devices', {
      deviceId: 'device-dang-nhap',
      installationId: 'fid-1',
      platform: 'WEB',
    })
  })
})

describe('deleteNotificationDevice', () => {
  it('gỡ thiết bị theo installation id', async () => {
    mockedDelete.mockResolvedValue({ data: { data: null, message: 'ok' } })

    await deleteNotificationDevice('fid-1')

    expect(mockedDelete).toHaveBeenCalledWith('/v1/notifications/devices/fid-1')
  })
})
