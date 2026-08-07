import { apiClient } from '@/shared/api'
import { claimClassTestGrading } from './useClassTestGradingMutations'

const post = jest.spyOn(apiClient, 'post')

describe('claimClassTestGrading', () => {
  beforeEach(() => {
    post.mockReset()
  })

  /**
   * Endpoint nằm trên facade class test, KHÔNG phải `/v1/grading-assignments`: chỗ đó
   * chỉ school admin gọi được, và nới nó ra là mở cửa cho mọi giáo viên trên mọi kỳ thi.
   */
  it('posts to the class-test facade scoped by examId', async () => {
    post.mockResolvedValue({ data: { data: ['a1', 'a2'], message: 'ok' } })

    await expect(
      claimClassTestGrading({
        candidateResultIds: ['r1', 'r2'],
        examId: 'e1',
        roundType: 'SPOT_CHECK',
      }),
    ).resolves.toEqual(['a1', 'a2'])

    expect(post).toHaveBeenCalledWith('/v1/class-tests/e1/grading/claim', {
      candidateResultIds: ['r1', 'r2'],
      roundType: 'SPOT_CHECK',
    })
  })

  it('sends the remediation round unchanged', async () => {
    post.mockResolvedValue({ data: { data: [], message: 'ok' } })

    await claimClassTestGrading({
      candidateResultIds: ['r1'],
      examId: 'e1',
      roundType: 'REMEDIATION',
    })

    expect(post.mock.calls[0][1]).toMatchObject({ roundType: 'REMEDIATION' })
  })
})
