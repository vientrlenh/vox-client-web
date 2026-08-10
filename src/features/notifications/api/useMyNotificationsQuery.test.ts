import { graphqlApiClient } from '@/shared/api/graphqlClient'
import type { AppNotification } from '../types'
import {
  fetchMyNotifications,
  fetchMyUnreadNotificationCount,
  notificationQueryKeys,
} from './useMyNotificationsQuery'

const mockedPost = jest.spyOn(graphqlApiClient, 'post')

const mockNotification: AppNotification = {
  body: 'Điểm bài thi IELTS Speaking đã được công bố.',
  createdAt: '2026-08-08T03:00:00Z',
  eventId: 'event-1',
  eventType: 'ExamResultReleased',
  id: 'notification-1',
  payload: '{"eventType":"ExamResultReleased","candidateResultId":"result-1"}',
  readAt: null,
  title: 'Kết quả đã có',
  userId: 'user-1',
}

const mockCursorPage = {
  content: [mockNotification],
  hasNext: true,
  nextCursor: 'notification-1',
}

describe('fetchMyNotifications', () => {
  beforeEach(() => {
    mockedPost.mockReset()
  })

  it('gửi cursor và limit đúng như tham số truyền vào', async () => {
    mockedPost.mockResolvedValue({
      data: {
        data: { myNotifications: mockCursorPage },
      },
    })

    await expect(
      fetchMyNotifications({ cursor: 'notification-0', limit: 10 }),
    ).resolves.toEqual(mockCursorPage)

    const requestBody = mockedPost.mock.calls[0]?.[1] as {
      query: string
      variables: Record<string, unknown>
    }

    expect(requestBody.query).toContain('myNotifications')
    expect(requestBody.variables).toEqual({
      cursor: 'notification-0',
      limit: 10,
    })
  })
})

describe('fetchMyUnreadNotificationCount', () => {
  beforeEach(() => {
    mockedPost.mockReset()
  })

  it('trả về đúng con số backend gửi xuống', async () => {
    mockedPost.mockResolvedValue({
      data: {
        data: { myUnreadNotificationCount: 7 },
      },
    })

    await expect(fetchMyUnreadNotificationCount()).resolves.toBe(7)
  })
})

/**
 * Việc vá cache sau khi đánh dấu đã đọc dùng `cursorRoot` làm bộ lọc tiền tố. Nếu khoá số
 * chưa đọc lỡ nằm dưới tiền tố đó, updater dành cho danh sách sẽ chạy trên một con số và
 * làm hỏng badge — nên ràng buộc này đáng được test giữ.
 */
describe('notificationQueryKeys', () => {
  it('tách khoá số chưa đọc ra khỏi tiền tố của danh sách', () => {
    const cursorRoot = notificationQueryKeys.cursorRoot()
    const unreadCount = notificationQueryKeys.unreadCount()

    expect(notificationQueryKeys.cursor(10).slice(0, cursorRoot.length)).toEqual([
      ...cursorRoot,
    ])
    expect(unreadCount.slice(0, cursorRoot.length)).not.toEqual([...cursorRoot])
  })
})
