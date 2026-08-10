import { getClientDevice } from '@/features/auth/session/authSession'
import { type ApiResponse, apiClient } from '@/shared/api'

/**
 * `deviceId` phải là đúng id đã dùng lúc đăng nhập, không phải một id sinh riêng cho
 * thông báo: `NotificationDeviceRevokeListener` bên backend dọn thiết bị theo cặp
 * (userId, deviceId) khi một phiên bị thu hồi. Lệch id thì cơ chế dọn đó trượt, âm thầm.
 */
export async function createNotificationDevice(installationId: string) {
  const response = await apiClient.post<ApiResponse<null>>(
    '/v1/notifications/devices',
    {
      deviceId: getClientDevice().deviceId,
      installationId,
      platform: 'WEB',
    },
  )

  return response.data
}

export async function deleteNotificationDevice(installationId: string) {
  const response = await apiClient.delete<ApiResponse<null>>(
    `/v1/notifications/devices/${installationId}`,
  )

  return response.data
}
