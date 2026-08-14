import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { setAuthenticatedUser } from '@/app/store/authSlice'
import { configureAppStore } from '@/app/store/store'
import { apiClient } from '@/shared/api'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { AppNotification } from '../types'
import { NotificationBell } from './NotificationBell'

const mockedPost = jest.spyOn(graphqlApiClient, 'post')
const mockedPatch = jest.spyOn(apiClient, 'patch')

function notification(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    body: 'Đơn phúc khảo của bạn đã được duyệt.',
    createdAt: new Date().toISOString(),
    eventId: 'event-1',
    eventType: 'ExamAppealApproved',
    id: 'notification-1',
    payload: '{"eventType":"ExamAppealApproved","appealId":"appeal-1"}',
    readAt: null,
    title: 'Phúc khảo được duyệt',
    userId: 'user-1',
    ...overrides,
  }
}

/**
 * Chuông và bảng thông báo dùng chung một client nhưng hai query khác nhau, nên phân
 * nhánh theo tên operation thay vì theo thứ tự gọi — thứ tự phụ thuộc vào lúc nào người
 * dùng mở bảng.
 */
function givenData(
  notifications: AppNotification[],
  unreadCount = notifications.filter((item) => !item.readAt).length,
) {
  mockedPost.mockImplementation((_url, body) => {
    const query = (body as { query: string }).query

    if (query.includes('myUnreadNotificationCount')) {
      return Promise.resolve({
        data: { data: { myUnreadNotificationCount: unreadCount } },
      } as never)
    }

    return Promise.resolve({
      data: {
        data: {
          myNotifications: {
            content: notifications,
            hasNext: false,
            nextCursor: null,
          },
        },
      },
    } as never)
  })
}

function renderBell() {
  const store = configureAppStore()
  store.dispatch(
    setAuthenticatedUser({
      email: 'hs@example.com',
      // Hết hạn nằm ở tương lai, nếu không reducer tự đá về trạng thái ẩn danh.
      exp: Math.floor(Date.now() / 1000) + 3600,
      roles: ['STUDENT'],
      schoolId: 's1',
      userId: 'user-1',
    }),
  )

  return renderWithProviders(
    <Routes>
      <Route element={<NotificationBell />} path="/student/exams" />
      <Route element={<p>Trang chi tiết phúc khảo</p>} path="/student/appeals/:appealId" />
    </Routes>,
    { route: '/student/exams', store },
  )
}

describe('NotificationBell', () => {
  beforeEach(() => {
    mockedPost.mockReset()
    mockedPatch.mockReset()
  })

  it('hiện số thông báo chưa đọc trên chuông', async () => {
    givenData([notification()], 3)
    renderBell()

    expect(await screen.findByText('3')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Thông báo, 3 chưa đọc' }),
    ).toBeInTheDocument()
  })

  it('không hiện badge khi không còn thông báo chưa đọc', async () => {
    givenData([], 0)
    renderBell()

    expect(
      await screen.findByRole('button', { name: 'Thông báo' }),
    ).toBeInTheDocument()
  })

  it('mở bảng thông báo và hiện danh sách', async () => {
    givenData([notification()])
    renderBell()

    await userEvent.click(await screen.findByRole('button', { name: /Thông báo/ }))

    expect(await screen.findByText('Phúc khảo được duyệt')).toBeInTheDocument()
    expect(
      screen.getByText('Đơn phúc khảo của bạn đã được duyệt.'),
    ).toBeInTheDocument()
  })

  it('hiện trạng thái rỗng khi chưa có thông báo nào', async () => {
    givenData([], 0)
    renderBell()

    await userEvent.click(await screen.findByRole('button', { name: 'Thông báo' }))

    expect(await screen.findByText('Bạn chưa có thông báo nào.')).toBeInTheDocument()
  })

  it('đánh dấu đã đọc rồi mở trang chi tiết khi bấm vào thông báo', async () => {
    givenData([notification()])
    mockedPatch.mockResolvedValue({ data: { data: 'notification-1', message: 'ok' } })
    renderBell()

    await userEvent.click(await screen.findByRole('button', { name: /Thông báo/ }))
    await userEvent.click(await screen.findByText('Phúc khảo được duyệt'))

    await waitFor(() => {
      expect(mockedPatch).toHaveBeenCalledWith('/v1/notifications/notification-1/read')
    })
    expect(await screen.findByText('Trang chi tiết phúc khảo')).toBeInTheDocument()
  })

  /** Thông báo đã đọc rồi thì không được gọi lại API — chỉ điều hướng. */
  it('không gọi lại API khi bấm vào thông báo đã đọc', async () => {
    givenData([notification({ readAt: '2026-08-08T04:00:00Z' })], 0)
    renderBell()

    await userEvent.click(await screen.findByRole('button', { name: 'Thông báo' }))
    await userEvent.click(await screen.findByText('Phúc khảo được duyệt'))

    expect(await screen.findByText('Trang chi tiết phúc khảo')).toBeInTheDocument()
    expect(mockedPatch).not.toHaveBeenCalled()
  })

  it('gọi API đánh dấu tất cả đã đọc', async () => {
    givenData([notification()])
    mockedPatch.mockResolvedValue({ data: { data: null, message: 'ok' } })
    renderBell()

    await userEvent.click(await screen.findByRole('button', { name: /Thông báo/ }))
    await userEvent.click(
      await screen.findByRole('button', { name: 'Đánh dấu tất cả đã đọc' }),
    )

    await waitFor(() => {
      expect(mockedPatch).toHaveBeenCalledWith('/v1/notifications/read-all')
    })
  })

  it('đóng bảng khi bấm ra ngoài', async () => {
    givenData([notification()])
    renderBell()

    await userEvent.click(await screen.findByRole('button', { name: /Thông báo/ }))
    expect(await screen.findByText('Phúc khảo được duyệt')).toBeInTheDocument()

    await userEvent.click(document.body)

    await waitFor(() => {
      expect(screen.queryByText('Phúc khảo được duyệt')).not.toBeInTheDocument()
    })
  })
})
