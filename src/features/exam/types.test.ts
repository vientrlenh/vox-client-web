import {
  EXAM_STREAM_SETUP_PAYLOAD,
  EXAM_STREAM_SETUPS,
  type ExamStreamSetup,
} from './types'

// Luật của server (CreateExamUseCase.resolveStreamConfig): permission phải VẮNG khi chỉ yêu cầu một
// loại stream, và BẮT BUỘC khi yêu cầu cả hai. Đây là lý do tồn tại của bảng map - test này đứng
// canh đúng ranh giới đó, vì vi phạm nó không hỏng lúc build mà hỏng thành một 400 tiếng Việt lúc
// giáo viên bấm "Tạo kỳ thi".
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

describe('EXAM_STREAM_SETUPS', () => {
  it('mỗi lựa chọn hiển thị đều có payload tương ứng', () => {
    for (const option of EXAM_STREAM_SETUPS) {
      expect(EXAM_STREAM_SETUP_PAYLOAD[option.value]).toBeDefined()
    }
    expect(EXAM_STREAM_SETUPS).toHaveLength(Object.keys(EXAM_STREAM_SETUP_PAYLOAD).length)
  })

  // Nhãn là thứ giáo viên dựa vào để quyết định, và quyết định này không sửa lại được -- nên không
  // được để lọt tên enum thô ra giao diện.
  it('không rò tên enum ra nhãn hiển thị', () => {
    for (const option of EXAM_STREAM_SETUPS) {
      expect(option.label).not.toMatch(/\b(ANY|ALL|CAMERA_AND_SCREEN)\b/)
      expect(option.hint.length).toBeGreaterThan(0)
    }
  })
})
