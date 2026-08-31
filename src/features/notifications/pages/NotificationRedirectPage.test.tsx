import { screen, waitFor } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { setAuthenticatedUser } from '@/app/store/authSlice'
import { configureAppStore } from '@/app/store/store'
import type { RoleCode } from '@/features/auth/types'
import { apiClient } from '@/shared/api'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { AppNotification } from '../types'
import { NotificationRedirectPage } from './NotificationRedirectPage'

const mockedPost = jest.spyOn(graphqlApiClient, 'post')
const mockedPatch = jest.spyOn(apiClient, 'patch')

function notification(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    body: 'Đơn phúc khảo của bạn đã được duyệt.',
    createdAt: new Date().toISOString(),
    eventId: 'event-1',
    eventType: 'ExamAppealApproved',
    id: 'notification-1',
    payload:
      '{"eventType":"ExamAppealApproved","target":"EXAM_APPEAL_DETAIL","appealId":"appeal-1"}',
    readAt: null,
    title: 'Phúc khảo được duyệt',
    userId: 'user-1',
    ...overrides,
  }
}

function givenNotification(result: AppNotification | null) {
  mockedPost.mockResolvedValue({
    data: { data: { myNotification: result } },
  } as never)
}

function renderRedirect(roles: RoleCode[] = ['STUDENT']) {
  const store = configureAppStore()
  store.dispatch(
    setAuthenticatedUser({
      email: 'hs@example.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
      roles,
      schoolId: 's1',
      userId: 'user-1',
    }),
  )

  return renderWithProviders(
    <Routes>
      <Route element={<NotificationRedirectPage />} path="/n/:notificationId" />
      <Route element={<p>Trang chi tiết phúc khảo</p>} path="/student/appeals/:appealId" />
      <Route element={<p>Trang chủ</p>} path="/" />
    </Routes>,
    { route: '/n/notification-1', store },
  )
}

describe('NotificationRedirectPage', () => {
  beforeEach(() => {
    mockedPost.mockReset()
    mockedPatch.mockReset()
    mockedPatch.mockResolvedValue({ data: { data: 'notification-1' } } as never)
  })

  it('tra thông báo rồi chuyển tiếp tới đúng màn hình', async () => {
    givenNotification(notification())
    renderRedirect()

    expect(await screen.findByText('Trang chi tiết phúc khảo')).toBeInTheDocument()
  })

  /** Người dùng vừa mở nó từ khay thông báo, nên không còn lý do để nó ở lại chưa đọc. */
  it('đánh dấu đã đọc đúng một lần khi mở', async () => {
    givenNotification(notification())
    renderRedirect()

    await screen.findByText('Trang chi tiết phúc khảo')
    await waitFor(() => {
      expect(mockedPatch).toHaveBeenCalledWith('/v1/notifications/notification-1/read')
    })
    expect(mockedPatch).toHaveBeenCalledTimes(1)
  })

  it('không đánh dấu lại thông báo vốn đã đọc', async () => {
    givenNotification(notification({ readAt: new Date().toISOString() }))
    renderRedirect()

    await screen.findByText('Trang chi tiết phúc khảo')
    expect(mockedPatch).not.toHaveBeenCalled()
  })

  /** Thông báo đã bị xoá hoặc thuộc tài khoản khác: lui về, không hiện trang lỗi. */
  it('lui về trang chủ khi không đọc được thông báo', async () => {
    mockedPost.mockRejectedValue(new Error('not found'))
    renderRedirect()

    expect(await screen.findByText('Trang chủ')).toBeInTheDocument()
    expect(mockedPatch).not.toHaveBeenCalled()
  })

  /**
   * `RequireRole` xoá phiên đăng nhập khi vai trò lệch, nên chuyển tiếp sang route của vai
   * trò khác sẽ đá người dùng ra ngoài. Lui về trang chủ là đường thoát duy nhất an toàn.
   */
  it('lui về trang chủ khi vai trò không vào được màn hình đích', async () => {
    givenNotification(notification())
    renderRedirect(['TEACHER'])

    expect(await screen.findByText('Trang chủ')).toBeInTheDocument()
  })
})
