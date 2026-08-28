import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Quy ước phân trang, và lý do phải có một phép kiểm quét mã nguồn để giữ nó.
 *
 * GraphQL: trang đầu là 1. Tầng UI cũng 1-based (xem shared/components/Pagination: nút "trước" bị
 * khoá khi currentPage === 1). Hai đầu đã khớp nhau nên KHÔNG được quy đổi ở giữa: gửi thẳng `page`,
 * và đọc thẳng `response.page`.
 *
 * REST: vẫn 0-based, và chỉ còn đúng một chỗ (GET /v1/exams, xem
 * exam-results/api/useExamResultQueries.ts). Chỗ đó ĐƯỢC PHÉP trừ 1 -- vì thế phép kiểm này chỉ
 * quét các thư mục api của features chứ không quét cả src, và bỏ qua đúng file đó.
 *
 * Vì sao là test chứ không phải một hàm helper: sai lệch ở đây không làm hỏng kiểu dữ liệu, nên
 * TypeScript im lặng. Đợt refactor subscription lật 35 trường GraphQL từ 0-based sang 1-based, và
 * hậu quả không phải là lỗi biên dịch mà là màn hình đầu tiên gửi page 0 -- backend gọi
 * PageRequest.of(-1, size) rồi ném lỗi, hoặc trả nhầm trang. Chỉ có phép quét mới bắt được lúc ai đó
 * "sửa lệch trang" bằng cách cộng trừ 1 thêm lần nữa.
 */

const FEATURES_DIR = join(__dirname, '..', '..', 'features')

/** Đường REST 0-based duy nhất còn lại -- xem javadoc trên. */
const REST_ZERO_BASED_ALLOWLIST = ['exam-results/api/useExamResultQueries.ts']

function collectApiFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      collectApiFiles(full, found)
    } else if (/\.tsx?$/.test(entry) && !entry.includes('.test.') && full.includes(`${'api'}/`)) {
      found.push(full)
    }
  }
  return found
}

describe('quy ước phân trang GraphQL', () => {
  const files = collectApiFiles(FEATURES_DIR).filter(
    (f) => !REST_ZERO_BASED_ALLOWLIST.some((allowed) => f.endsWith(allowed)),
  )

  it('quét được các file api của features', () => {
    // Chốt chặn cho chính phép kiểm này: đường dẫn sai thì danh sách rỗng và mọi khẳng định bên dưới
    // đều đúng một cách vô nghĩa.
    expect(files.length).toBeGreaterThan(30)
  })

  it('không file nào trừ 1 vào page trước khi gửi lên GraphQL', () => {
    const offenders = files.filter((f) => /page:\s*[\w.]*page\s*-\s*1/.test(readFileSync(f, 'utf8')))
    expect(offenders.map((f) => f.replace(FEATURES_DIR, ''))).toEqual([])
  })

  it('không file nào cộng 1 vào số trang server trả về', () => {
    const offenders = files.filter((f) => /\.page\s*\+\s*1/.test(readFileSync(f, 'utf8')))
    expect(offenders.map((f) => f.replace(FEATURES_DIR, ''))).toEqual([])
  })
})
