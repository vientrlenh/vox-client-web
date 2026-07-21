import { graphqlApiClient } from '@/shared/api/graphqlClient'
import {
  fetchAppeal,
  fetchAppealReviewers,
  fetchAppealStats,
  fetchAppealTaskDetail,
  fetchAppeals,
  fetchMyAppealTasks,
} from './useReevaluationQueries'

const mockedPost = jest.spyOn(graphqlApiClient, 'post')

function bodyOf(callIndex = 0) {
  return mockedPost.mock.calls[callIndex]?.[1] as {
    query: string
    variables: Record<string, unknown>
  }
}

describe('reevaluation GraphQL queries', () => {
  beforeEach(() => {
    mockedPost.mockReset()
  })

  it('fetches appeals with status/keyword, dropping empty filters', async () => {
    const page = { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }
    mockedPost.mockResolvedValue({ data: { data: { appeals: page } } })

    await expect(
      fetchAppeals({ keyword: '', page: 0, size: 20, status: 'PENDING' }),
    ).resolves.toEqual(page)

    const body = bodyOf()
    expect(body.query).toContain('appeals(')
    expect(body.variables).toMatchObject({ page: 0, size: 20, status: 'PENDING' })
    expect(body.variables.keyword).toBeUndefined()
  })

  it('fetches appeal stats', async () => {
    const stats = { pending: 1, processing: 2, published: 3, rejected: 4 }
    mockedPost.mockResolvedValue({ data: { data: { appealStats: stats } } })

    await expect(fetchAppealStats()).resolves.toEqual(stats)
    expect(bodyOf().query).toContain('appealStats')
  })

  it('fetches a single appeal detail by id', async () => {
    const detail = { id: 'a1', studentName: 'An', aiScores: [], turns: [], reviewers: [] }
    mockedPost.mockResolvedValue({ data: { data: { appeal: detail } } })

    await expect(fetchAppeal('a1')).resolves.toEqual(detail)

    const body = bodyOf()
    expect(body.query).toContain('appeal(')
    expect(body.variables).toEqual({ id: 'a1' })
  })

  it('fetches my appeal tasks without teacherId (server reads token)', async () => {
    const page = { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }
    mockedPost.mockResolvedValue({ data: { data: { myAppealTasks: page } } })

    await fetchMyAppealTasks({ page: 0, size: 20, status: 'ASSIGNED' })

    const body = bodyOf()
    expect(body.query).toContain('myAppealTasks(')
    expect(body.variables).toMatchObject({ page: 0, size: 20, status: 'ASSIGNED' })
    expect(body.variables).not.toHaveProperty('teacherId')
  })

  it('fetches the teacher task detail (blind grading view)', async () => {
    const taskDetail = { appealId: 'a1', turns: [], aiScores: [], criteria: [], myReport: null }
    mockedPost.mockResolvedValue({ data: { data: { appealTaskDetail: taskDetail } } })

    await expect(fetchAppealTaskDetail('a1')).resolves.toEqual(taskDetail)

    const body = bodyOf()
    expect(body.query).toContain('appealTaskDetail(')
    expect(body.query).not.toContain('reviewers')
    expect(body.variables).toEqual({ appealId: 'a1' })
  })

  it('fetches assignable reviewers with keyword', async () => {
    mockedPost.mockResolvedValue({ data: { data: { appealReviewers: [] } } })

    await fetchAppealReviewers('ha')

    const body = bodyOf()
    expect(body.query).toContain('appealReviewers(')
    expect(body.variables).toEqual({ keyword: 'ha' })
  })
})
