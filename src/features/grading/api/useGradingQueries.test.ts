import { graphqlApiClient } from '@/shared/api/graphqlClient'
import {
  fetchAiQualityReport,
  fetchAssignableTeachers,
  fetchGradingAssignments,
  fetchGradingExamOptions,
  fetchGradingStats,
  fetchGradingTaskDetail,
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

describe('grading GraphQL queries', () => {
  beforeEach(() => {
    mockedPost.mockReset()
  })

  it('fetches assignments, dropping empty filters', async () => {
    const page = { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }
    mockedPost.mockResolvedValue({ data: { data: { gradingAssignments: page } } })

    await expect(
      fetchGradingAssignments({
        examId: 'e1',
        page: 0,
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
      page: 0,
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
    const page = { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }
    mockedPost.mockResolvedValue({ data: { data: { gradingAssignments: page } } })

    await fetchGradingAssignments({
      hasOpenAppeal: false,
      overdueOnly: true,
      page: 0,
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

  it('fetches my grading tasks without any student field (anonymous)', async () => {
    const page = { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }
    mockedPost.mockResolvedValue({ data: { data: { myGradingTasks: page } } })

    await fetchMyGradingTasks({ page: 0, roundType: 'APPEAL', size: 20, status: 'ASSIGNED' })

    const body = bodyOf()
    expect(body.query).toContain('myGradingTasks(')
    // Giáo viên chấm ẩn danh — read model không được kéo tên/ID học sinh.
    expect(body.query).not.toContain('studentName')
    expect(body.variables).toMatchObject({
      page: 0,
      roundType: 'APPEAL',
      size: 20,
      status: 'ASSIGNED',
    })
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
    expect(body.query).not.toContain('studentName')
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

  it('fetches exam options for the filter dropdown', async () => {
    mockedPost.mockResolvedValue({ data: { data: { exams: { content: [] } } } })

    await fetchGradingExamOptions()

    const body = bodyOf()
    expect(body.query).toContain('exams(')
    expect(body.variables).toEqual({ page: 0, size: 500 })
  })
})
