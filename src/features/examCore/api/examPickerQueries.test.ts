import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { fetchExamPickerOptions } from './queries'

const mockedPost = jest.spyOn(graphqlApiClient, 'post')

function bodyOf(callIndex = 0) {
  return mockedPost.mock.calls[callIndex]?.[1] as {
    query: string
    variables: Record<string, unknown>
  }
}

const emptyPage = { content: [], page: 1, size: 8, totalElements: 0, totalPages: 0 }

describe('fetchExamPickerOptions', () => {
  beforeEach(() => {
    mockedPost.mockReset()
    mockedPost.mockResolvedValue({ data: { data: { exams: emptyPage } } })
  })

  // Trước đây hàm này trừ 1 trước khi gửi vì `exams` trên GraphQL đánh số từ 0. Đợt refactor
  // subscription đã lật toàn bộ trường phân trang GraphQL sang 1-based, nên phép trừ đó biến trang
  // đầu thành page 0 -- backend gọi PageRequest.of(-1, size) và ném lỗi. Giờ gửi thẳng, không quy đổi.
  //
  // Lưu ý REST vẫn 0-based (GET /v1/exams, xem fetchMyExams): đừng suy từ test này sang bên đó.
  it('sends the UI page straight through -- GraphQL paging is 1-based', async () => {
    await expect(fetchExamPickerOptions({ page: 1, size: 8 })).resolves.toEqual(emptyPage)
    expect(bodyOf().variables).toMatchObject({ page: 1, size: 8 })

    await fetchExamPickerOptions({ page: 3, size: 8 })
    expect(bodyOf(1).variables).toMatchObject({ page: 3 })
  })

  it('sends null instead of an empty or blank keyword so the server drops the filter', async () => {
    await fetchExamPickerOptions({ keyword: '   ', page: 1, size: 8, status: '' })

    const { variables } = bodyOf()
    expect(variables.keyword).toBeNull()
    expect(variables.status).toBeNull()
  })

  it('trims the keyword before sending it', async () => {
    await fetchExamPickerOptions({ keyword: '  giữa kỳ  ', page: 1, size: 8 })

    expect(bodyOf().variables.keyword).toBe('giữa kỳ')
  })

  it('passes the status filter through untouched', async () => {
    await fetchExamPickerOptions({ page: 1, size: 8, status: 'RESULTS_PUBLISHED' })

    expect(bodyOf().variables.status).toBe('RESULTS_PUBLISHED')
  })

  /**
   * Bỏ trống `kind` là server trả cả kỳ thi tập trung lẫn bài kiểm tra trên lớp — màn
   * phân công chấm bài của nhà trường vì thế từng liệt kê cả bài trên lớp mà gán không được.
   */
  it('passes the exam kind through so a picker can show one kind only', async () => {
    await fetchExamPickerOptions({ kind: 'CENTRALIZED', page: 1, size: 8 })

    expect(bodyOf().variables.kind).toBe('CENTRALIZED')
  })

  it('sends a null kind when the caller does not narrow by kind', async () => {
    await fetchExamPickerOptions({ page: 1, size: 8 })

    expect(bodyOf().variables.kind).toBeNull()
  })

  it('asks only for the light fields a picker needs', async () => {
    await fetchExamPickerOptions({ page: 1, size: 8 })

    const { query } = bodyOf()
    expect(query).toContain('exams(')
    expect(query).toContain('totalPages')
    // `papers` kéo theo sections/items qua DataLoader — một danh sách chọn không cần.
    expect(query).not.toContain('papers')
    expect(query).not.toContain('candidateCount')
  })
})
