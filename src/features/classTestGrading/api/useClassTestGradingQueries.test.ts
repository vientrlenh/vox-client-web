import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { fetchClassTestGradingStats, fetchClassTestGradingTasks } from './useClassTestGradingQueries'

const mockedPost = jest.spyOn(graphqlApiClient, 'post')

function bodyOf(callIndex = 0) {
  return mockedPost.mock.calls[callIndex]?.[1] as {
    query: string
    variables: Record<string, unknown>
  }
}

const emptyPage = { content: [], page: 1, size: 20, totalElements: 0, totalPages: 0 }

/**
 * Trang đầu là 1 chứ không phải 0: GraphQL 1-based, và adapter phía BE trừ 1 trước khi giao cho
 * Spring Data. Để `page: 0` ở đây thì test vẫn xanh vì transport bị mock, nhưng lại chốt vào bộ
 * test đúng cái giá trị làm server thật nổ ở `PageRequest.of(-1, size)`.
 */
describe('class test grading GraphQL queries', () => {
  beforeEach(() => {
    mockedPost.mockReset()
  })

  it('queries its own operation instead of the school-wide teacher queue', async () => {
    mockedPost.mockResolvedValue({ data: { data: { myClassTestGradingTasks: emptyPage } } })

    await expect(
      fetchClassTestGradingTasks({ examId: 'e1', page: 1, size: 20 }),
    ).resolves.toEqual(emptyPage)

    const body = bodyOf()
    expect(body.query).toContain('myClassTestGradingTasks(')
    expect(body.variables).toMatchObject({ examId: 'e1', page: 1, size: 20 })
  })

  /**
   * Điểm khác lớn nhất so với hàng đợi kỳ thi tập trung — và là lý do màn này tồn tại
   * riêng. Kỳ thi tập trung chấm ẩn danh nên query bên đó cố ý KHÔNG hỏi hai trường này.
   */
  it('asks for the student identity that only class tests expose', async () => {
    mockedPost.mockResolvedValue({ data: { data: { myClassTestGradingTasks: emptyPage } } })

    await fetchClassTestGradingTasks({ examId: 'e1', page: 1, size: 20 })

    expect(bodyOf().query).toContain('studentName')
    expect(bodyOf().query).toContain('className')
  })

  it('drops empty filters so they are not sent as empty strings', async () => {
    mockedPost.mockResolvedValue({ data: { data: { myClassTestGradingTasks: emptyPage } } })

    await fetchClassTestGradingTasks({
      examId: 'e1',
      page: 1,
      roundType: '',
      size: 20,
      status: '',
    })

    expect(bodyOf().variables.roundType).toBeUndefined()
    expect(bodyOf().variables.status).toBeUndefined()
  })

  it('passes the filters through when they are set', async () => {
    mockedPost.mockResolvedValue({ data: { data: { myClassTestGradingTasks: emptyPage } } })

    await fetchClassTestGradingTasks({
      examId: 'e1',
      page: 1,
      roundType: 'SPOT_CHECK',
      size: 20,
      status: 'ASSIGNED',
    })

    expect(bodyOf().variables).toMatchObject({
      examId: 'e1',
      page: 1,
      roundType: 'SPOT_CHECK',
      status: 'ASSIGNED',
    })
  })

  /**
   * `gradingStats` của school admin nhận `examId` rỗng = toàn trường, nên giáo viên
   * phải đi qua operation riêng có `examId` bắt buộc.
   */
  it('uses the exam-scoped stats operation, not the school-wide one', async () => {
    mockedPost.mockResolvedValue({ data: { data: { classTestGradingStats: { total: 3 } } } })

    await expect(fetchClassTestGradingStats('e1')).resolves.toEqual({ total: 3 })

    const body = bodyOf()
    expect(body.query).toContain('classTestGradingStats(')
    expect(body.query).not.toContain('gradingStats(examId: ID, ')
    expect(body.variables).toEqual({ examId: 'e1' })
  })
})
