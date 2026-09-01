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

function link(payload: object, roles: Parameters<typeof resolveNotificationLink>[1]) {
  return resolveNotificationLink(notification(JSON.stringify(payload)), roles)
}

describe('parseNotificationPayload', () => {
  it('trả về null thay vì ném lỗi khi payload không phải JSON hợp lệ', () => {
    expect(parseNotificationPayload('{khong-phai-json')).toBeNull()
    expect(parseNotificationPayload(null)).toBeNull()
  })
})

describe('resolveNotificationLink', () => {
  it('đưa học sinh tới đơn phúc khảo tương ứng', () => {
    expect(link({ appealId: 'appeal-1', target: 'EXAM_APPEAL_DETAIL' }, ['STUDENT'])).toBe(
      '/student/appeals/appeal-1',
    )
  })

  it('đưa giáo viên tới nhiệm vụ chấm tương ứng', () => {
    expect(
      link({ assignmentId: 'assign-1', target: 'TEACHER_GRADING_TASK' }, ['TEACHER']),
    ).toBe('/teacher/grading/assign-1')
  })

  /** Kết quả bài thi giờ dựng được đường dẫn thật, không còn phải lui về danh sách. */
  it('đưa học sinh tới đúng kết quả bằng sessionId', () => {
    expect(
      link(
        { examKind: 'CENTRALIZED', sessionId: 'session-1', target: 'EXAM_RESULT_DETAIL' },
        ['STUDENT'],
      ),
    ).toBe('/student/exams/session-1/result')
  })

  it('tách bài kiểm tra lớp sang màn hình riêng của nó', () => {
    expect(
      link(
        { examKind: 'CLASS_TEST', sessionId: 'session-1', target: 'EXAM_RESULT_DETAIL' },
        ['STUDENT'],
      ),
    ).toBe('/student/class-tests/session-1/result')

    expect(
      link(
        {
          assignmentId: 'assign-1',
          examId: 'exam-1',
          examKind: 'CLASS_TEST',
          target: 'TEACHER_GRADING_TASK',
        },
        ['TEACHER'],
      ),
    ).toBe('/teacher/class-tests/exam-1/grading/assign-1')
  })

  /**
   * Hai event cùng mang `assignmentId` nhưng gửi cho hai vai trò. Bản cũ dò theo tên khoá
   * nên school admin nhận `GradingAssignmentDeclined` không bao giờ bấm được vào đâu.
   */
  it('phân biệt hai target dùng chung một khoá id', () => {
    expect(
      link(
        { assignmentId: 'assign-1', target: 'ADMIN_GRADING_ASSIGNMENT' },
        ['SCHOOL_ADMIN'],
      ),
    ).toBe('/school-admin/grading')
  })

  /**
   * Nhắc chấm tay gửi cho cả chủ tịch hội đồng (giáo viên) lẫn school admin. MỘT target,
   * hai đường dẫn -- chọn theo vai trò của chính người đang mở.
   */
  it('đưa mỗi vai trò tới hàng đợi chấm của riêng họ', () => {
    const payload = {
      examId: 'exam-1',
      examKind: 'CENTRALIZED',
      target: 'EXAM_HUMAN_GRADING_REQUIRED',
    }

    expect(link(payload, ['SCHOOL_ADMIN'])).toBe('/school-admin/grading')
    expect(link(payload, ['TEACHER'])).toBe('/teacher/grading')
  })

  it('đưa nhắc chấm bài trên lớp về hàng đợi của đúng bài đó', () => {
    expect(
      link(
        {
          examId: 'exam-1',
          examKind: 'CLASS_TEST',
          target: 'EXAM_HUMAN_GRADING_REQUIRED',
        },
        ['TEACHER'],
      ),
    ).toBe('/teacher/class-tests/exam-1/grading')
  })

  /** Người mang cả hai vai trò: trang quản trị là góc nhìn bao trùm, nên nó đứng trước. */
  it('ưu tiên trang quản trị cho người có cả hai vai trò', () => {
    expect(
      link(
        { examId: 'exam-1', examKind: 'CENTRALIZED', target: 'EXAM_HUMAN_GRADING_REQUIRED' },
        ['TEACHER', 'SCHOOL_ADMIN'],
      ),
    ).toBe('/school-admin/grading')
  })

  /** Học sinh không có vai trò nào trong bảng của target này -- không cho bấm. */
  it('không cho học sinh bấm vào nhắc chấm tay', () => {
    expect(
      link({ examId: 'exam-1', target: 'EXAM_HUMAN_GRADING_REQUIRED' }, ['STUDENT']),
    ).toBeNull()
  })

  /** `RequireRole` xoá phiên khi vai trò lệch, nên dẫn nhầm không chỉ là ngõ cụt. */
  it('không dẫn người dùng tới route mà vai trò của họ không vào được', () => {
    expect(
      link({ assignmentId: 'assign-1', target: 'TEACHER_GRADING_TASK' }, ['STUDENT']),
    ).toBeNull()
  })

  /** Backend thêm target mới trước khi web kịp cập nhật: mất khả năng bấm, không dẫn bừa. */
  it('trả về null với target mà bản web này chưa biết', () => {
    expect(link({ target: 'MOT_TARGET_MOI_TINH' }, ['STUDENT'])).toBeNull()
  })

  /** `target` tới từ mạng: giá trị trùng tên thuộc tính của Object không được lọt qua. */
  it('không nhận nhầm thuộc tính kế thừa từ Object làm target', () => {
    expect(link({ target: 'toString' }, ['STUDENT'])).toBeNull()
    expect(link({ target: 'constructor' }, ['STUDENT'])).toBeNull()
  })

  /** Dòng ghi trước khi backend bổ sung khoá điều hướng vẫn phải mở được đúng khu vực. */
  it('lui về danh sách của đúng khu vực khi payload cũ thiếu id', () => {
    expect(link({ target: 'EXAM_RESULT_DETAIL' }, ['STUDENT'])).toBe('/student/exams')
    expect(link({ target: 'TEACHER_GRADING_TASK' }, ['TEACHER'])).toBe('/teacher/grading')
    expect(link({ target: 'EXAM_APPEAL_DETAIL' }, ['STUDENT'])).toBe('/student/appeals')
  })

  it('trả về null khi payload rỗng', () => {
    expect(resolveNotificationLink(notification(null), ['STUDENT'])).toBeNull()
  })

  /** Payload cũ chưa có `target` -- không đoán lại bằng tên khoá, chỉ là không bấm được. */
  it('trả về null với payload cũ không có target', () => {
    expect(link({ appealId: 'appeal-1' }, ['STUDENT'])).toBeNull()
  })
})
