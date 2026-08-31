import { toVnSearchKey } from './vnSearchKey'

describe('toVnSearchKey', () => {
  it('bỏ dấu thanh và dấu mũ', () => {
    expect(toVnSearchKey('Nguyễn Văn An')).toBe('nguyen van an')
    expect(toVnSearchKey('Phạm Thuỳ Dương')).toBe('pham thuy duong')
    expect(toVnSearchKey('Hồ Thị Ngọc Ánh')).toBe('ho thi ngoc anh')
  })

  // "đ" là chữ cái riêng (U+0111), NFD không tách được nên phải thay tay — dễ sót nhất.
  it('đổi đ/Đ thành d', () => {
    expect(toVnSearchKey('Đỗ Quốc Đạt')).toBe('do quoc dat')
    expect(toVnSearchKey('Vũ Đức Huy')).toBe('vu duc huy')
  })

  it('hạ chữ thường và cắt khoảng trắng thừa', () => {
    expect(toVnSearchKey('  TRẦN THỊ BÌNH  ')).toBe('tran thi binh')
  })

  it('giữ nguyên chuỗi vốn đã không dấu', () => {
    expect(toVnSearchKey('an@example.com')).toBe('an@example.com')
    expect(toVnSearchKey('')).toBe('')
  })
})
