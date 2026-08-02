import { getMemberRoleDisplay, isExamLockedForEditing, type ExamMemberRole, type ExamStatus } from './types'

// Vai trò hội đồng đề là thứ giáo viên nhìn để biết mình được làm gì; tên enum tiếng Anh lọt ra
// giao diện thì họ phải tự đoán. Test này canh đúng ranh giới đó.
describe('getMemberRoleDisplay', () => {
  const roles: ExamMemberRole[] = ['CHAIR', 'AUTHOR', 'REVIEWER']

  it('dịch đủ ba vai trò sang tiếng Việt', () => {
    expect(getMemberRoleDisplay('CHAIR')).toBe('Chủ tịch hội đồng')
    expect(getMemberRoleDisplay('AUTHOR')).toBe('Ra đề')
    expect(getMemberRoleDisplay('REVIEWER')).toBe('Duyệt đề')
  })

  it('không rò tên enum ra nhãn hiển thị', () => {
    for (const role of roles) {
      expect(getMemberRoleDisplay(role)).not.toMatch(/\b(CHAIR|AUTHOR|REVIEWER)\b/)
    }
  })

  it('không vỡ khi chưa có vai trò', () => {
    expect(getMemberRoleDisplay(null)).toBe('-')
    expect(getMemberRoleDisplay(undefined)).toBe('-')
  })
})

// Khớp Exam.isLockedForEditing ở backend: từ IN_PROGRESS trở đi thì khoá sửa thông tin kỳ thi và
// mọi thao tác xếp lịch. Lệch nhau nghĩa là người dùng bấm được nút rồi ăn lỗi 4xx.
describe('isExamLockedForEditing', () => {
  it('chưa khoá khi kỳ thi chưa bắt đầu', () => {
    const open: ExamStatus[] = ['DRAFT', 'SCHEDULED']
    for (const status of open) {
      expect(isExamLockedForEditing(status)).toBe(false)
    }
  })

  it('khoá từ IN_PROGRESS trở đi', () => {
    const locked: ExamStatus[] = ['IN_PROGRESS', 'CLOSED', 'RESULTS_PUBLISHED', 'CANCELLED']
    for (const status of locked) {
      expect(isExamLockedForEditing(status)).toBe(true)
    }
  })

  it('coi như chưa khoá khi thiếu trạng thái', () => {
    expect(isExamLockedForEditing(null)).toBe(false)
    expect(isExamLockedForEditing(undefined)).toBe(false)
  })
})
