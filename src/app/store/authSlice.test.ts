import { configureAppStore } from './store'

function createAccessToken(expiresInSeconds: number) {
  const payload = {
    email: 'teacher@vox.edu.vn',
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    roles: ['TEACHER'],
    userId: '6f5b4f6a-2d70-4f18-9a1f-6b2f4c9d1e77',
  }
  const encodedPayload = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  return `header.${encodedPayload}.signature`
}

describe('auth initial state', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts authenticated when the stored access token is still valid', () => {
    localStorage.setItem('vox.accessToken', createAccessToken(900))

    const state = configureAppStore().getState().auth

    expect(state.status).toBe('authenticated')
    expect(state.user?.email).toBe('teacher@vox.edu.vn')
  })

  it('starts loading when the stored access token has expired', () => {
    localStorage.setItem('vox.accessToken', createAccessToken(-900))

    expect(configureAppStore().getState().auth.status).toBe('loading')
  })

  /**
   * Cốt lõi của việc khôi phục phiên khi mở lại trang: KHÔNG có access token không có nghĩa là
   * không có phiên. Cookie refresh_token vẫn có thể còn sống trọn 72 giờ, mà JS không đọc được
   * cookie httpOnly để biết -- nên phải vào 'loading' và để AuthProvider hỏi server. Trả thẳng
   * 'anonymous' ở đây là đá người dùng ra khỏi một phiên mà server vẫn coi là hợp lệ.
   */
  it('starts loading when there is no stored access token at all', () => {
    expect(configureAppStore().getState().auth.status).toBe('loading')
  })

  it('starts loading when the stored access token cannot be decoded', () => {
    localStorage.setItem('vox.accessToken', 'not-a-jwt')

    expect(configureAppStore().getState().auth.status).toBe('loading')
    expect(localStorage.getItem('vox.accessToken')).toBeNull()
  })
})
