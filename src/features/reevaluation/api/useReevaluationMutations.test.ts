import { apiClient } from '@/shared/api'
import {
  approveAppeal,
  assignReviewers,
  publishAppeal,
  rejectAppeal,
  removeReviewer,
  submitReport,
} from './useReevaluationMutations'

const post = jest.spyOn(apiClient, 'post')
const del = jest.spyOn(apiClient, 'delete')

function okResponse(message: string, data: unknown = 'ok') {
  return { data: { data, message } }
}

describe('reevaluation REST mutations', () => {
  beforeEach(() => {
    post.mockReset()
    del.mockReset()
  })

  it('approves with a deadline body and returns the message', async () => {
    post.mockResolvedValue(okResponse('Duyệt đơn phúc khảo thành công!'))

    await expect(approveAppeal('a1', '2026-07-22T10:00:00.000Z')).resolves.toBe(
      'Duyệt đơn phúc khảo thành công!',
    )
    expect(post).toHaveBeenCalledWith('/v1/exam-appeals/a1/approve', {
      deadline: '2026-07-22T10:00:00.000Z',
    })
  })

  it('rejects with a reason body', async () => {
    post.mockResolvedValue(okResponse('Từ chối đơn phúc khảo thành công!'))

    await rejectAppeal('a1', 'Không đủ căn cứ')
    expect(post).toHaveBeenCalledWith('/v1/exam-appeals/a1/reject', { reason: 'Không đủ căn cứ' })
  })

  it('assigns reviewers with an id list', async () => {
    post.mockResolvedValue(okResponse('Phân công giám khảo thành công!'))

    await assignReviewers('a1', ['t1', 't2'])
    expect(post).toHaveBeenCalledWith('/v1/exam-appeals/a1/reviewers', {
      reviewerIds: ['t1', 't2'],
    })
  })

  it('removes a reviewer via DELETE', async () => {
    del.mockResolvedValue(okResponse('Gỡ giám khảo thành công!'))

    await removeReviewer('a1', 't1')
    expect(del).toHaveBeenCalledWith('/v1/exam-appeals/a1/reviewers/t1')
  })

  it('submits a report with scores and note', async () => {
    post.mockResolvedValue(okResponse('Nộp báo cáo chấm lại thành công!', 'eval-1'))

    await submitReport('a1', [{ criterionId: 'c1', score: 8, rationale: 'ok' }], 'note')
    expect(post).toHaveBeenCalledWith('/v1/exam-appeals/a1/reviewers/me/report', {
      note: 'note',
      scores: [{ criterionId: 'c1', score: 8, rationale: 'ok' }],
    })
  })

  it('publishes with partScore, not a total finalScore', async () => {
    post.mockResolvedValue(okResponse('Công bố kết quả phúc khảo thành công!'))

    await publishAppeal('a1', 8, 'quyết định')
    expect(post).toHaveBeenCalledWith('/v1/exam-appeals/a1/publish', {
      decisionNote: 'quyết định',
      partScore: 8,
    })
  })
})
