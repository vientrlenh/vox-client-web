// Chuẩn hoá chuỗi để so khớp khi tìm kiếm tên người Việt.
//
// Giáo viên gõ bàn phím không dấu ("nguyen van an") vẫn phải ra "Nguyễn Văn An" — đó là cách gõ
// mặc định khi không bật bộ gõ tiếng Việt, nên tìm kiếm phân biệt dấu hoá ra tìm không thấy người
// đang có thật trong danh sách.
//
// NFD tách nguyên âm có dấu thành "chữ gốc + dấu tổ hợp" (U+0300–U+036F) để bỏ dấu đi, NHƯNG chữ
// "đ" là một CHỮ CÁI riêng (U+0111) chứ không phải "d" cộng dấu nên NFD không đụng tới — thay tay.
//
// Giữ khớp với hàm `vn_search_key` phía database (migration V7): ô lọc tại chỗ và ô hỏi backend
// phải cho ra cùng một kết quả với cùng một từ khoá.
const COMBINING_MARKS = /[\u0300-\u036f]/g
const D_STROKE = /\u0111/g
const D_STROKE_UPPER = /\u0110/g

export function toVnSearchKey(value: string) {
  return value
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(D_STROKE, 'd')
    .replace(D_STROKE_UPPER, 'D')
    .toLowerCase()
    .trim()
}
