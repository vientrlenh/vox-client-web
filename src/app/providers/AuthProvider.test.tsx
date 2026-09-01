import { screen, waitFor } from '@testing-library/react'
import { refreshAuthTokens } from '@/features/auth/api/refreshAuthTokens'
import { renderWithProviders } from '@/test/renderWithProviders'
import { AuthProvider } from './AuthProvider'

jest.mock('@/features/auth/api/refreshAuthTokens', () => ({
  refreshAuthTokens: jest.fn(),
}))

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

function renderAuthProvider() {
  return renderWithProviders(
    <AuthProvider>
      <div>nội dung ứng dụng</div>
    </AuthProvider>,
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.mocked(refreshAuthTokens).mockReset()
  })

  /**
   * Trình duyệt mất access token (bị dọn dung lượng, xoá dữ liệu trang) nhưng cookie
   * refresh_token vẫn còn: người dùng phải quay lại đúng phiên cũ, không phải màn đăng nhập.
   */
  it('restores the session from the refresh cookie when no access token is stored', async () => {
    const accessToken = createAccessToken()
    jest.mocked(refreshAuthTokens).mockResolvedValue({
      accessToken,
      refreshToken: 'ignored-by-client',
    })

    const { store } = renderAuthProvider()

    await waitFor(() =>
      expect(store.getState().auth.status).toBe('authenticated'),
    )
    expect(refreshAuthTokens).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('vox.accessToken')).toBe(accessToken)
    expect(await screen.findByText('nội dung ứng dụng')).toBeInTheDocument()
  })

  /**
   * Khách vãng lai và phiên đã bị /logout thu hồi đi chung một nhánh. Hỏng ở đây là chuyện bình
   * thường, không được nổi lên thành lỗi -- chỉ hạ xuống anonymous và cho trang chạy tiếp.
   */
  it('falls back to anonymous and still renders when the cookie is gone', async () => {
    jest.mocked(refreshAuthTokens).mockRejectedValue(new Error('401'))

    const { store } = renderAuthProvider()

    await waitFor(() => expect(store.getState().auth.status).toBe('anonymous'))
    expect(await screen.findByText('nội dung ứng dụng')).toBeInTheDocument()
  })

  /**
   * Access token còn hạn thì không có gì phải hỏi: bỏ lượt gọi này đi là bớt một vòng mạng chặn
   * trước mọi lần mở trang của người đang dùng dở.
   */
  /**
   * Tab kia bấm đăng xuất. Không có tin này thì tab đang mở vẫn hiện nguyên giao diện đã đăng
   * nhập, kèm access token còn sống thêm tối đa 15 phút -- trên máy phòng lab, đó là 15 phút
   * người ngồi xuống sau đọc được dữ liệu của người vừa đứng dậy.
   */
  it('drops the session when another tab announces a logout', async () => {
    const accessToken = createAccessToken()
    jest.mocked(refreshAuthTokens).mockResolvedValue({
      accessToken,
      refreshToken: 'ignored-by-client',
    })

    const { store } = renderAuthProvider()
    await waitFor(() =>
      expect(store.getState().auth.status).toBe('authenticated'),
    )

    const otherTab = new BroadcastChannel('vox.auth')
    otherTab.postMessage({ type: 'anonymous' })

    await waitFor(() => expect(store.getState().auth.status).toBe('anonymous'))
    expect(localStorage.getItem('vox.accessToken')).toBeNull()
    otherTab.close()
  })

  /**
   * Đăng nhập ở tab khác, thường là bằng tài khoản KHÁC trên máy dùng chung. Tab này phải đổi
   * theo, không thì nó vẽ giao diện của người trước trong khi request đã mang token người mới.
   */
  it('adopts the identity another tab just signed in as', async () => {
    jest.mocked(refreshAuthTokens).mockRejectedValue(new Error('401'))

    const { store } = renderAuthProvider()
    await waitFor(() => expect(store.getState().auth.status).toBe('anonymous'))

    const accessToken = createAccessToken()
    const otherTab = new BroadcastChannel('vox.auth')
    otherTab.postMessage({ accessToken, type: 'authenticated' })

    await waitFor(() =>
      expect(store.getState().auth.status).toBe('authenticated'),
    )
    expect(localStorage.getItem('vox.accessToken')).toBe(accessToken)
    otherTab.close()
  })

  it('does not call the server when a valid access token is already stored', async () => {
    localStorage.setItem('vox.accessToken', createAccessToken())

    const { store } = renderAuthProvider()

    expect(await screen.findByText('nội dung ứng dụng')).toBeInTheDocument()
    expect(refreshAuthTokens).not.toHaveBeenCalled()
    expect(store.getState().auth.status).toBe('authenticated')
  })
})
