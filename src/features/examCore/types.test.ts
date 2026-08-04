import {
  EXAM_STREAM_SETUP_PAYLOAD,
  EXAM_STREAM_SETUPS,
  getMemberRoleDisplay,
  isExamLockedForEditing,
  toExamStreamSetup,
  toUpdateStreamPayload,
  type ExamMemberRole,
  type ExamRequiredStreamType,
  type ExamStatus,
  type ExamStreamSetup,
  type ExamStreamTypePermission,
} from './types'

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

// Luật của server (ExamStreamConfigResolver): permission phải VẮNG khi chỉ yêu cầu một loại stream,
// và BẮT BUỘC khi yêu cầu cả hai. Đây là lý do tồn tại của bảng map - test này đứng canh đúng ranh
// giới đó, vì vi phạm nó không hỏng lúc build mà hỏng thành một 400 tiếng Việt lúc người dùng bấm
// "Tạo". Bảng map dùng chung cho cả kỳ thi tập trung lẫn bài kiểm tra trên lớp.
describe('EXAM_STREAM_SETUP_PAYLOAD', () => {
  const entries = Object.entries(EXAM_STREAM_SETUP_PAYLOAD) as [
    ExamStreamSetup,
    (typeof EXAM_STREAM_SETUP_PAYLOAD)[ExamStreamSetup],
  ][]

  it.each(entries)('%s chỉ dùng các loại stream server chấp nhận', (_setup, payload) => {
    const types = payload.requiredStreamTypes
    if (types === null) {
      return
    }
    expect(types.length).toBeGreaterThan(0)
    expect(new Set(types).size).toBe(types.length)
    for (const type of types) {
      expect(['CAMERA', 'SCREEN']).toContain(type)
    }
  })

  it.each(entries)('%s gắn permission đúng theo số loại stream', (_setup, payload) => {
    const count = payload.requiredStreamTypes?.length ?? 0
    if (count === 2) {
      expect(payload.streamTypePermission).not.toBeNull()
      expect(['ALL', 'ANY']).toContain(payload.streamTypePermission)
    } else {
      // Gửi permission kèm một loại stream (hoặc kèm không loại nào) là 400 phía server.
      expect(payload.streamTypePermission).toBeNull()
    }
  })

  it('tắt giám sát nghĩa là không gửi gì cả', () => {
    expect(EXAM_STREAM_SETUP_PAYLOAD.NO_MONITORING).toEqual({
      requiredStreamTypes: null,
      streamTypePermission: null,
    })
  })

  it('phủ đúng 5 trạng thái server chấp nhận, không thừa không thiếu', () => {
    expect(entries).toHaveLength(5)
    const distinct = new Set(entries.map(([, payload]) => JSON.stringify(payload)))
    expect(distinct.size).toBe(5)
  })
})

// Form sửa phải hiển thị đúng mức giám sát đang lưu. BE lưu 1 enum gộp còn UI dùng union 5 nhánh,
// nên hai chiều đọc/ghi phải là nghịch đảo của nhau -- lệch một nhánh là người dùng mở form ra thấy
// sai mức giám sát rồi vô tình lưu đè.
describe('toExamStreamSetup', () => {
  const cases: Array<[ExamRequiredStreamType | null, ExamStreamTypePermission | null, ExamStreamSetup]> = [
    [null, null, 'NO_MONITORING'],
    ['CAMERA', null, 'CAMERA_ONLY'],
    ['SCREEN', null, 'SCREEN_ONLY'],
    ['CAMERA_AND_SCREEN', 'ALL', 'BOTH_REQUIRED'],
    ['CAMERA_AND_SCREEN', 'ANY', 'BOTH_STUDENT_CHOICE'],
  ]

  it.each(cases)('%s + %s -> %s', (requiredStreamType, streamTypePermission, expected) => {
    expect(toExamStreamSetup(requiredStreamType, streamTypePermission)).toBe(expected)
  })

  it('đi vòng qua EXAM_STREAM_SETUP_PAYLOAD rồi quay về đúng nhánh cũ', () => {
    for (const setup of Object.keys(EXAM_STREAM_SETUP_PAYLOAD) as ExamStreamSetup[]) {
      const { requiredStreamTypes, streamTypePermission } = EXAM_STREAM_SETUP_PAYLOAD[setup]
      const stored: ExamRequiredStreamType | null =
        requiredStreamTypes === null || requiredStreamTypes.length === 0
          ? null
          : requiredStreamTypes.length === 2
            ? 'CAMERA_AND_SCREEN'
            : requiredStreamTypes[0]
      expect(toExamStreamSetup(stored, streamTypePermission)).toBe(setup)
    }
  })

  it('dữ liệu cũ thiếu permission thì coi như mức chặt nhất', () => {
    expect(toExamStreamSetup('CAMERA_AND_SCREEN', null)).toBe('BOTH_REQUIRED')
  })
})

// Trên API sửa, null nghĩa là "giữ nguyên" -- nên "Không giám sát" phải gửi mảng RỖNG, nếu không
// việc tắt giám sát sẽ im lặng không có tác dụng.
describe('toUpdateStreamPayload', () => {
  it('tắt giám sát gửi mảng rỗng, không phải null', () => {
    expect(toUpdateStreamPayload('NO_MONITORING')).toEqual({
      requiredStreamTypes: [],
      streamTypePermission: null,
    })
  })

  it('các nhánh còn lại giữ nguyên payload của luồng tạo', () => {
    for (const setup of Object.keys(EXAM_STREAM_SETUP_PAYLOAD) as ExamStreamSetup[]) {
      if (setup === 'NO_MONITORING') {
        continue
      }
      expect(toUpdateStreamPayload(setup)).toEqual(EXAM_STREAM_SETUP_PAYLOAD[setup])
    }
  })

  it('không bao giờ gửi permission kèm một loại stream', () => {
    for (const setup of Object.keys(EXAM_STREAM_SETUP_PAYLOAD) as ExamStreamSetup[]) {
      const payload = toUpdateStreamPayload(setup)
      if (payload.requiredStreamTypes.length !== 2) {
        expect(payload.streamTypePermission).toBeNull()
      }
    }
  })
})

describe('EXAM_STREAM_SETUPS', () => {
  it('mỗi lựa chọn hiển thị đều có payload tương ứng', () => {
    for (const option of EXAM_STREAM_SETUPS) {
      expect(EXAM_STREAM_SETUP_PAYLOAD[option.value]).toBeDefined()
    }
    expect(EXAM_STREAM_SETUPS).toHaveLength(Object.keys(EXAM_STREAM_SETUP_PAYLOAD).length)
  })

  // Nhãn là thứ người tạo bài dựa vào để quyết định, và quyết định này không sửa lại được -- nên
  // không được để lọt tên enum thô ra giao diện.
  it('không rò tên enum ra nhãn hiển thị', () => {
    for (const option of EXAM_STREAM_SETUPS) {
      expect(option.label).not.toMatch(/\b(ANY|ALL|CAMERA_AND_SCREEN)\b/)
      expect(option.hint.length).toBeGreaterThan(0)
    }
  })
})
