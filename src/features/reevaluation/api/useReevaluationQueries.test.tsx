import { graphqlApiClient } from '@/shared/api/graphqlClient'
import {
  fetchAppeal,
  fetchAppealReviewers,
  fetchAppealStats,
  fetchAppeals,
} from './useReevaluationQueries'

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
describe('reevaluation GraphQL queries', () => {
  beforeEach(() => {
    mockedPost.mockReset()
  })

  it('fetches appeals with status/keyword, dropping empty filters', async () => {
    const page = { content: [], page: 1, size: 20, totalElements: 0, totalPages: 0 }
    mockedPost.mockResolvedValue({ data: { data: { appeals: page } } })

    await expect(
      fetchAppeals({ keyword: '', page: 1, size: 20, status: 'PENDING' }),
    ).resolves.toEqual(page)

    const body = bodyOf()
    expect(body.query).toContain('appeals(')
    // Một đơn một giám khảo: danh sách trả tên + trạng thái người đó, không còn đếm số người.
    expect(body.query).toContain('reviewerName')
    expect(body.query).toContain('reviewerStatus')
    expect(body.variables).toMatchObject({ page: 1, size: 20, status: 'PENDING' })
    expect(body.variables.keyword).toBeUndefined()
  })

  it('fetches appeal stats including withdrawn appeals', async () => {
    const stats = { pending: 1, processing: 2, published: 3, rejected: 4, withdrawn: 5 }
    mockedPost.mockResolvedValue({ data: { data: { appealStats: stats } } })

    await expect(fetchAppealStats()).resolves.toEqual(stats)
    expect(bodyOf().query).toContain('appealStats')
    expect(bodyOf().query).toContain('withdrawn')
  })

  it('fetches a single appeal detail by id with its one reviewer', async () => {
    const detail = { id: 'a1', studentName: 'An', items: [], reviewer: null }
    mockedPost.mockResolvedValue({ data: { data: { appeal: detail } } })

    await expect(fetchAppeal('a1')).resolves.toEqual(detail)

    const body = bodyOf()
    expect(body.query).toContain('appeal(')
    expect(body.query).toContain('assignmentId')
    expect(body.variables).toEqual({ id: 'a1' })
  })

  it('fetches assignable reviewers scoped to the appeal so conflicts are flagged', async () => {
    mockedPost.mockResolvedValue({ data: { data: { appealReviewers: [] } } })

    await fetchAppealReviewers('a1', 'ha')

    const body = bodyOf()
    expect(body.query).toContain('appealReviewers(')
    expect(body.query).toContain('conflicted')
    expect(body.variables).toEqual({ appealId: 'a1', keyword: 'ha' })
  })
})
