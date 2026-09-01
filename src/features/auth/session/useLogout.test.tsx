import { act, renderHook, waitFor } from '@testing-library/react'
import { unregisterPushDevice } from '@/features/notifications'
import { createTestProviders } from '@/test/renderWithProviders'
import { logoutSession } from '../api/logoutSession'
import { getAuthTokens } from './authSession'
import { useLogout } from './useLogout'

jest.mock('../api/logoutSession', () => ({
  logoutSession: jest.fn(),
}))

jest.mock('@/features/notifications', () => ({
  unregisterPushDevice: jest.fn(),
}))

/**
 * Phải là token GIẢI MÃ ĐƯỢC: `configureAppStore` đọc localStorage lúc dựng store và tự xoá token
 * nào không decode ra được, nên một chuỗi bất kỳ sẽ biến mất trước cả khi test chạy tới đâu.
 */
function createAccessToken() {
  const payload = {
    email: 'teacher@vox.edu.vn',
    exp: Math.floor(Date.now() / 1000) + 900,
    roles: ['TEACHER'],
    userId: '6f5b4f6a-2d70-4f18-9a1f-6b2f4c9d1e77',
  }
  const encodedPayload = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  return `header.${encodedPayload}.signature`
}

function renderUseLogout() {
  const { Wrapper, store } = createTestProviders()
  const { result } = renderHook(() => useLogout(), { wrapper: Wrapper })

  return { logout: result.current, store }
}

describe('useLogout', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.mocked(logoutSession).mockReset().mockResolvedValue(undefined)
    jest.mocked(unregisterPushDevice).mockReset().mockResolvedValue(undefined)
  })

  it('revokes the session, then clears local tokens and auth state', async () => {
    localStorage.setItem('vox.accessToken', createAccessToken())

    const { logout, store } = renderUseLogout()

    await act(async () => {
      await logout()
    })

    expect(logoutSession).toHaveBeenCalledTimes(1)
    expect(getAuthTokens()).toBeNull()
    expect(store.getState().auth.status).toBe('anonymous')
    expect(store.getState().auth.user).toBeNull()
  })

  /**
   * Cả hai lời gọi mạng đều cần header Authorization, mà `clearAuthTokens` là thứ lấy nó đi.
   * Đảo thứ tự thì cả hai rơi vào 401 và phiên phía server sống tiếp trọn 72 giờ.
   */
  it('calls the server while the access token is still present', async () => {
    const accessToken = createAccessToken()
    localStorage.setItem('vox.accessToken', accessToken)

    const tokenAtCallTime: (string | null)[] = []
    jest.mocked(unregisterPushDevice).mockImplementation(async () => {
      tokenAtCallTime.push(localStorage.getItem('vox.accessToken'))
    })
    jest.mocked(logoutSession).mockImplementation(async () => {
      tokenAtCallTime.push(localStorage.getItem('vox.accessToken'))
    })

    const { logout } = renderUseLogout()

    await act(async () => {
      await logout()
    })

    expect(tokenAtCallTime).toEqual([accessToken, accessToken])
  })

  /**
   * Thu hồi phía server chưa đủ: access token đã phát vẫn dùng được thêm tối đa 15 phút, nên tab
   * khác đang mở phải được báo để tự dọn ngay thay vì chờ hết hạn.
   */
  it('tells the other tabs the session is over', async () => {
    localStorage.setItem('vox.accessToken', createAccessToken())
    const otherTab = new BroadcastChannel('vox.auth')
    const received: unknown[] = []
    otherTab.addEventListener('message', (event) => {
      received.push(event.data)
    })

    const { logout } = renderUseLogout()

    await act(async () => {
      await logout()
    })

    await waitFor(() => expect(received).toEqual([{ type: 'anonymous' }]))
    otherTab.close()
  })

  /**
   * Người dùng đã bấm thoát thì phải được thoát. Giữ họ lại trong phiên vì mạng hỏng là kết quả
   * tệ hơn hẳn việc phiên phía server sống thêm một lúc.
   */
  it('still clears the session when the server call fails', async () => {
    localStorage.setItem('vox.accessToken', createAccessToken())
    jest.mocked(logoutSession).mockRejectedValue(new Error('network down'))

    const { logout, store } = renderUseLogout()

    await act(async () => {
      await expect(logout()).resolves.toBeUndefined()
    })

    expect(getAuthTokens()).toBeNull()
    expect(store.getState().auth.status).toBe('anonymous')
  })
})
