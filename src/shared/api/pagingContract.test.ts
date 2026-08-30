import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, sep } from 'node:path'

/**
 * Quy ước phân trang, và lý do phải có một phép kiểm quét mã nguồn để giữ nó.
 *
 * Trang đầu là 1, ở MỌI đường -- GraphQL lẫn REST. Tầng UI cũng 1-based (xem
 * shared/components/Pagination: nút "trước" bị khoá khi currentPage === 1). Hai đầu đã khớp nhau nên
 * KHÔNG được quy đổi ở giữa: gửi thẳng `page`, và đọc thẳng `response.page`.
 *
 * Ngoại lệ 0-based cuối cùng (`GET /v1/exams`) đã bị gỡ: backend nay phân trang qua
 * StudentExamQueryRepository và trừ 1 ở đúng một chỗ như mọi repository khác, nên danh sách miễn trừ
 * ở đây cũng biến mất. Không còn file nào được phép cộng/trừ 1 vào số trang.
 *
 * Vì sao là test chứ không phải một hàm helper: sai lệch ở đây không làm hỏng kiểu dữ liệu, nên
 * TypeScript im lặng. Đợt refactor subscription lật 35 trường GraphQL từ 0-based sang 1-based, và
 * hậu quả không phải là lỗi biên dịch mà là màn hình đầu tiên gửi page 0 -- backend gọi
 * PageRequest.of(-1, size) rồi ném lỗi, hoặc trả nhầm trang. Chỉ có phép quét mới bắt được lúc ai đó
 * "sửa lệch trang" bằng cách cộng trừ 1 thêm lần nữa.
 */

const FEATURES_DIR = join(__dirname, '..', '..', 'features')

/**
 * `join` trả về `\` trên Windows, còn cả bộ lọc thư mục `api/` lẫn danh sách miễn trừ đều viết
 * bằng `/`. Không chuẩn hoá thì trên Windows danh sách quét ra rỗng và hai khẳng định bên dưới
 * đúng một cách vô nghĩa -- đúng cái bẫy mà chốt chặn `files.length > 30` được đặt ra để bắt.
 */
function toPosix(fullPath: string) {
  return fullPath.split(sep).join('/')
}

function isInApiDir(fullPath: string) {
  return toPosix(fullPath).includes('/api/')
}

function collectApiFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      collectApiFiles(full, found)
    } else if (/\.tsx?$/.test(entry) && !entry.includes('.test.') && isInApiDir(full)) {
      found.push(full)
    }
  }
  return found
}

describe('quy ước phân trang GraphQL', () => {
  const files = collectApiFiles(FEATURES_DIR)

  /** Đường dẫn tương đối, dấu `/`, để thông báo lỗi đọc giống nhau trên mọi máy. */
  const relative = (f: string) => toPosix(f).replace(toPosix(FEATURES_DIR), '')

  it('quét được các file api của features', () => {
    // Chốt chặn cho chính phép kiểm này: đường dẫn sai thì danh sách rỗng và mọi khẳng định bên dưới
    // đều đúng một cách vô nghĩa.
    expect(files.length).toBeGreaterThan(30)
  })

  it('không file nào trừ 1 vào page trước khi gửi lên GraphQL', () => {
    // `[Pp]age` chứ không phải `page`: biến trung gian hay được đặt tên `currentPage`/`gradePage`,
    // và bản cũ chỉ khớp chữ thường nên `page: currentPage - 1` lọt lưới.
    const offenders = files.filter((f) => /page:\s*[\w.$]*[Pp]age\s*-\s*1/.test(readFileSync(f, 'utf8')))
    expect(offenders.map(relative)).toEqual([])
  })

  it('không file nào cộng 1 vào số trang server trả về', () => {
    const offenders = files.filter((f) => /\.page\s*\+\s*1/.test(readFileSync(f, 'utf8')))
    expect(offenders.map(relative)).toEqual([])
  })
})
