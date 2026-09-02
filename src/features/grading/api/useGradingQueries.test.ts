import { graphqlApiClient } from '@/shared/api/graphqlClient'
import {
  fetchAiQualityReport,
  fetchAssignableTeachers,
  fetchGradingAssignments,
  fetchGradingStats,
  fetchGradingTaskDetail,
  fetchMyGradingExams,
  fetchMyGradingTasks,
  fetchResultStatusHistory,
} from './useGradingQueries'

const mockedPost = jest.spyOn(graphqlApiClient, 'post')

function bodyOf(callIndex = 0) {
  return mockedPost.mock.calls[callIndex]?.[1] as {
    query: string
    variables: Record<string, unknown>
  }
}

/**
 * Trang đầu là 1 chứ không phải 0: GraphQL 1-based, và adapter phía BE trừ 1 trước khi giao cho
 * Spring Data. Để `page: 0` ở đây thì test vẫn xanh vì transport bị mock, nhưng lại chốt vào bộ
 * test đúng cái giá trị làm server thật nổ ở `PageRequest.of(-1, size)`.
 */
describe('grading GraphQL queries', () => {
  beforeEach(() => {
    mockedPost.mockReset()
  })

  it('fetches assignments, dropping empty filters', async () => {
    const page = { content: [], page: 1, size: 20, totalElements: 0, totalPages: 0 }
    mockedPost.mockResolvedValue({ data: { data: { gradingAssignments: page } } })

    await expect(
      fetchGradingAssignments({
        examId: 'e1',
        page: 1,
        roundType: 'SPOT_CHECK',
        search: '',
        size: 20,
        status: 'ASSIGNED',
      }),
    ).resolves.toEqual(page)

    const body = bodyOf()
    expect(body.query).toContain('gradingAssignments(')
    expect(body.variables).toMatchObject({
      examId: 'e1',
      page: 1,
      roundType: 'SPOT_CHECK',
      size: 20,
      status: 'ASSIGNED',
    })
    // Filter rỗng bị bỏ để không gửi search='' xuống server.
    expect(body.variables.search).toBeUndefined()
    expect(body.variables.scheduleId).toBeUndefined()
    expect(body.variables.teacherId).toBeUndefined()
  })

  it('sends the boolean filters only when they are switched on', async () => {
    const page = { content: [], page: 1, size: 20, totalElements: 0, totalPages: 0 }
    mockedPost.mockResolvedValue({ data: { data: { gradingAssignments: page } } })

    await fetchGradingAssignments({
      hasOpenAppeal: false,
      overdueOnly: true,
      page: 1,
      size: 20,
      unassignedOnly: false,
    })

    const body = bodyOf()
    // `hasOpenAppeal: false` là một bộ lọc KHÁC với "không lọc" — tắt thì phải bỏ hẳn.
    expect(body.variables.hasOpenAppeal).toBeUndefined()
    expect(body.variables.unassignedOnly).toBeUndefined()
    expect(body.variables.overdueOnly).toBe(true)
  })

  it('fetches grading stats scoped by exam', async () => {
    const stats = {
      assigned: 2,
      byResultStatus: [],
      overdue: 0,
      teacherProgress: [],
      total: 5,
      unassigned: 2,
    }
    mockedPost.mockResolvedValue({ data: { data: { gradingStats: stats } } })

    await expect(fetchGradingStats({ examId: 'e1' })).resolves.toEqual(stats)

    const body = bodyOf()
    expect(body.query).toContain('gradingStats(')
    // Mẫu số là toàn bộ bài của phạm vi, không còn khoá cứng ở bài chờ chấm.
    expect(body.query).toContain('byResultStatus')
    expect(body.query).toContain('teacherProgress')
    expect(body.variables).toMatchObject({ examId: 'e1' })
  })

  /**
   * Bảng và thẻ số phải đếm trên cùng một tập bài, nên `kind` đi qua cả hai query. Bỏ
   * trống thì BE hiểu là kỳ thi tập trung.
   */
  it('passes the exam kind through to both the board and the stat cards', async () => {
    const page = { content: [], page: 1, size: 20, totalElements: 0, totalPages: 0 }
    mockedPost.mockResolvedValue({ data: { data: { gradingAssignments: page } } })
    await fetchGradingAssignments({ kind: 'CLASS_TEST', page: 1, size: 20 })
    expect(bodyOf().variables.kind).toBe('CLASS_TEST')

    mockedPost.mockResolvedValue({ data: { data: { gradingStats: {} } } })
    await fetchGradingStats({ examId: 'e1', kind: 'CLASS_TEST' })
    expect(bodyOf(1).variables.kind).toBe('CLASS_TEST')
  })

  /** Số lượt thi là thứ duy nhất phân biệt hai dòng của cùng một em trên bảng. */
  it('asks for the attempt fields on every grading list', async () => {
    const page = { content: [], page: 1, size: 20, totalElements: 0, totalPages: 0 }
    mockedPost.mockResolvedValue({ data: { data: { gradingAssignments: page } } })
    await fetchGradingAssignments({ page: 1, size: 20 })

    expect(bodyOf().query).toContain('attemptNo')
    expect(bodyOf().query).toContain('attemptCount')
  })

  it('fetches my grading tasks without any student field (anonymous)', async () => {
    const page = { content: [], page: 1, size: 20, totalElements: 0, totalPages: 0 }
    mockedPost.mockResolvedValue({ data: { data: { myGradingTasks: page } } })

    await fetchMyGradingTasks({ page: 1, roundType: 'APPEAL', size: 20, status: 'ASSIGNED' })

    const body = bodyOf()
    expect(body.query).toContain('myGradingTasks(')
    // Giáo viên chấm ẩn danh — read model không được kéo tên/ID học sinh.
    expect(body.query).not.toContain('studentName')
    // Và cũng không được kéo ẢNH. Một khuôn mặt lộ danh tính chắc chắn hơn cái tên, nên phép kiểm
    // studentName ở trên KHÔNG đủ: `avatarUrl` lọt qua nó dễ dàng. Hàng đợi tập trung hiện không có
    // studentId để giải ra người dùng — nếu ai đó thêm vào, dòng này là thứ phản đối.
    expect(body.query).not.toContain('avatarUrl')
    expect(body.query).not.toContain('studentId')
    expect(body.variables).toMatchObject({
      page: 1,
      roundType: 'APPEAL',
      size: 20,
      status: 'ASSIGNED',
    })
  })

  it('narrows my grading tasks by exam, and drops the filter when cleared', async () => {
    const page = { content: [], page: 1, size: 20, totalElements: 0, totalPages: 0 }
    mockedPost.mockResolvedValue({ data: { data: { myGradingTasks: page } } })

    await fetchMyGradingTasks({ examId: 'ex-1', page: 1, size: 20 })
    expect(bodyOf().variables.examId).toBe('ex-1')

    // Chuỗi rỗng là "tất cả kỳ thi" — gửi xuống server thì thành lọc theo id rỗng.
    await fetchMyGradingTasks({ examId: '', page: 1, size: 20 })
    expect(bodyOf(1).variables.examId).toBeUndefined()
  })

  it('fetches the exam options from the assignments, not from the school exam list', async () => {
    const options = [{ code: 'EX-1', id: 'ex-1', name: 'Kỳ thi cuối kỳ', openTaskCount: 2, taskCount: 3 }]
    mockedPost.mockResolvedValue({ data: { data: { myGradingExams: options } } })

    await expect(fetchMyGradingExams()).resolves.toEqual(options)

    const body = bodyOf()
    expect(body.query).toContain('myGradingExams')
    // Đếm được cả hai loại thì dropdown khỏi bắn thêm một query size=1 cho mỗi kỳ thi.
    expect(body.query).toContain('taskCount')
    expect(body.query).toContain('openTaskCount')
  })

  it('fetches the teacher task detail with the flags that drive the screen', async () => {
    const detail = { allowedOutcomes: [], assignmentId: 'a1', criteria: [], editable: true, items: [] }
    mockedPost.mockResolvedValue({ data: { data: { gradingTaskDetail: detail } } })

    await expect(fetchGradingTaskDetail('a1')).resolves.toEqual(detail)

    const body = bodyOf()
    expect(body.query).toContain('gradingTaskDetail(')
    // Cờ chỉ-đọc, tập hành động và trọng số tiêu chí đều do BE cung cấp — FE không tự suy.
    expect(body.query).toContain('editable')
    expect(body.query).toContain('allowedOutcomes')
    expect(body.query).toContain('roundType')
    expect(body.query).toContain('weight')
    // Màn chấm dùng chung cho cả kỳ thi tập trung lẫn bài kiểm tra trên lớp, nên query
    // PHẢI hỏi danh tính. Chốt ẩn danh nằm ở BE: kỳ thi tập trung trả null.
    // Xem `GradingStudentIdentityQueryTests` phía backend.
    expect(body.query).toContain('studentName')
    expect(body.variables).toEqual({ assignmentId: 'a1' })
  })

  it('fetches assignable teachers with a trimmed search', async () => {
    mockedPost.mockResolvedValue({ data: { data: { assignableTeachers: [] } } })

    await fetchAssignableTeachers('  an  ')

    const body = bodyOf()
    expect(body.query).toContain('assignableTeachers(')
    expect(body.variables).toEqual({ search: 'an' })
  })

  it('fetches the score timeline of one result', async () => {
    mockedPost.mockResolvedValue({ data: { data: { resultStatusHistory: [] } } })

    await fetchResultStatusHistory('r1')

    const body = bodyOf()
    expect(body.query).toContain('resultStatusHistory(')
    expect(body.variables).toEqual({ candidateResultId: 'r1' })
  })

  it('fetches the AI quality report school-wide when no exam is given', async () => {
    mockedPost.mockResolvedValue({ data: { data: { aiQualityReport: { byTeacher: [] } } } })

    await fetchAiQualityReport('')

    const body = bodyOf()
    expect(body.query).toContain('aiQualityReport(')
    // Bỏ trống examId = toàn trường.
    expect(body.variables).toEqual({ examId: undefined })
  })

})
