import { refreshAuthTokens } from '../api/refreshAuthTokens'
import { refreshSessionOnce } from './sessionRefresh'

jest.mock('../api/refreshAuthTokens', () => ({
  refreshAuthTokens: jest.fn(),
}))

function createAccessToken(expiresInSeconds: number, label = 'teacher') {
  const payload = {
    email: `${label}@vox.edu.vn`,
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

describe('refreshSessionOnce', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.mocked(refreshAuthTokens).mockReset()
  })

  it('returns the rotated access token', async () => {
    const accessToken = createAccessToken(900)
    jest.mocked(refreshAuthTokens).mockResolvedValue({
      accessToken,
      refreshToken: 'ignored-by-client',
    })

    await expect(refreshSessionOnce()).resolves.toBe(accessToken)
  })

  /**
   * Refresh token dùng một lần rồi xoay, và backend coi việc dùng lại token đã tiêu là dấu hiệu
   * bị đánh cắp -- nó thu hồi cả device session. Hai lời gọi chồng nhau trong cùng một tab (rất
   * thường gặp: nhiều request cùng nhận 401 một lúc) phải gộp thành ĐÚNG một lượt xoay.
   */
  it('collapses concurrent callers into a single rotation', async () => {
    const accessToken = createAccessToken(900)
    jest.mocked(refreshAuthTokens).mockResolvedValue({
      accessToken,
      refreshToken: 'ignored-by-client',
    })

    const results = await Promise.all([
      refreshSessionOnce(),
      refreshSessionOnce(),
      refreshSessionOnce(),
    ])

    expect(results).toEqual([accessToken, accessToken, accessToken])
    expect(refreshAuthTokens).toHaveBeenCalledTimes(1)
  })

  it('rotates again on a later call once the first one settled', async () => {
    jest
      .mocked(refreshAuthTokens)
      .mockResolvedValueOnce({
        accessToken: createAccessToken(-900, 'first'),
        refreshToken: '',
      })
      .mockResolvedValueOnce({
        accessToken: createAccessToken(900, 'second'),
        refreshToken: '',
      })

    await refreshSessionOnce()
    await refreshSessionOnce()

    expect(refreshAuthTokens).toHaveBeenCalledTimes(2)
  })

  /**
   * Tab đi trước đã xoay xong trong lúc mình xếp hàng: dùng lại token nó vừa ghi thay vì xoay
   * thêm một vòng. N tab cùng 401 thì đây là khác biệt giữa 1 và N lượt xoay.
   */
  it('reuses a still-valid token another tab just stored', async () => {
    const freshToken = createAccessToken(900)
    localStorage.setItem('vox.accessToken', freshToken)

    await expect(refreshSessionOnce()).resolves.toBe(freshToken)
    expect(refreshAuthTokens).not.toHaveBeenCalled()
  })

  it('still rotates when the stored token has expired', async () => {
    const rotated = createAccessToken(900, 'rotated')
    localStorage.setItem('vox.accessToken', createAccessToken(-60))
    jest.mocked(refreshAuthTokens).mockResolvedValue({
      accessToken: rotated,
      refreshToken: '',
    })

    await expect(refreshSessionOnce()).resolves.toBe(rotated)
    expect(refreshAuthTokens).toHaveBeenCalledTimes(1)
  })

  describe('when the browser supports Web Locks', () => {
    afterEach(() => {
      Reflect.deleteProperty(globalThis.navigator, 'locks')
    })

    it('rotates inside a named lock so other tabs queue behind it', async () => {
      const request = jest.fn((_name: string, task: () => Promise<string>) =>
        task(),
      )
      Object.defineProperty(globalThis.navigator, 'locks', {
        configurable: true,
        value: { request },
      })

      const accessToken = createAccessToken(900)
      jest.mocked(refreshAuthTokens).mockResolvedValue({
        accessToken,
        refreshToken: '',
      })

      await expect(refreshSessionOnce()).resolves.toBe(accessToken)
      expect(request).toHaveBeenCalledWith('vox.auth.refresh', expect.any(Function))
    })
  })

  /**
   * jsdom (và Safari đời cũ) không có navigator.locks. Thiếu khoá thì mất phần bảo vệ đa tab,
   * nhưng ứng dụng vẫn phải chạy -- mọi test ở trên đã đi qua đúng nhánh này.
   */
  it('works without Web Locks', async () => {
    expect(globalThis.navigator.locks).toBeUndefined()

    const accessToken = createAccessToken(900)
    jest.mocked(refreshAuthTokens).mockResolvedValue({
      accessToken,
      refreshToken: '',
    })

    await expect(refreshSessionOnce()).resolves.toBe(accessToken)
  })
})
