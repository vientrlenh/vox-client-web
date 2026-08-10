import type { AppNotification } from '../types'
import { parseNotificationPayload, resolveNotificationLink } from './notificationLink'

function notification(payload: string | null): AppNotification {
  return {
    body: null,
    createdAt: '2026-08-08T03:00:00Z',
    eventId: 'event-1',
    eventType: 'ExamAppealApproved',
    id: 'notification-1',
    payload,
    readAt: null,
    title: 'Thông báo',
    userId: 'user-1',
  }
}

describe('parseNotificationPayload', () => {
  it('trả về null thay vì ném lỗi khi payload không phải JSON hợp lệ', () => {
    expect(parseNotificationPayload('{khong-phai-json')).toBeNull()
    expect(parseNotificationPayload(null)).toBeNull()
  })
})

describe('resolveNotificationLink', () => {
  it('đưa học sinh tới đơn phúc khảo tương ứng', () => {
    expect(
      resolveNotificationLink(notification('{"appealId":"appeal-1"}'), ['STUDENT']),
    ).toBe('/student/appeals/appeal-1')
  })

  it('đưa giáo viên tới nhiệm vụ chấm tương ứng', () => {
    expect(
      resolveNotificationLink(notification('{"assignmentId":"assign-1"}'), [
        'TEACHER',
      ]),
    ).toBe('/teacher/grading/assign-1')
  })

  /** Route chấm bài bị `RequireRole` chặn với học sinh, dẫn sang đó là dẫn vào ngõ cụt. */
  it('không dẫn người dùng tới route mà vai trò của họ không vào được', () => {
    expect(
      resolveNotificationLink(notification('{"assignmentId":"assign-1"}'), [
        'STUDENT',
      ]),
    ).toBeNull()
  })

  it('đưa kết quả thi về danh sách bài thi vì payload không có sessionId', () => {
    expect(
      resolveNotificationLink(notification('{"candidateResultId":"result-1"}'), [
        'STUDENT',
      ]),
    ).toBe('/student/exams')
  })

  it('trả về null khi payload rỗng', () => {
    expect(resolveNotificationLink(notification(null), ['STUDENT'])).toBeNull()
  })
})
