import { apiClient } from '@/shared/api'
import { approveAppeal, assignReviewer, rejectAppeal } from './useReevaluationMutations'

const post = jest.spyOn(apiClient, 'post')

function okResponse(message: string, data: unknown = 'ok') {
  return { data: { data, message } }
}

describe('reevaluation REST mutations', () => {
  beforeEach(() => {
    post.mockReset()
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

  it('assigns exactly one reviewer and returns the new assignment id', async () => {
    post.mockResolvedValue(okResponse('Phân công giám khảo thành công!', 'asg-1'))

    // Endpoint số ít: bản rework bỏ danh sách nhiều giám khảo, mỗi đơn một người chấm.
    await expect(assignReviewer('a1', { reviewerId: 't1' })).resolves.toBe('asg-1')
    expect(post).toHaveBeenCalledWith('/v1/exam-appeals/a1/reviewer', {
      deadlineAt: undefined,
      overrideReason: undefined,
      reviewerId: 't1',
    })
  })

  it('sends the override reason and deadline when the reviewer has a conflict of interest', async () => {
    post.mockResolvedValue(okResponse('Phân công giám khảo thành công!', 'asg-2'))

    await assignReviewer('a1', {
      deadlineAt: '2026-07-30T10:00:00.000Z',
      overrideReason: 'Chỉ còn một giáo viên đủ chuyên môn',
      reviewerId: 't2',
    })
    expect(post).toHaveBeenCalledWith('/v1/exam-appeals/a1/reviewer', {
      deadlineAt: '2026-07-30T10:00:00.000Z',
      overrideReason: 'Chỉ còn một giáo viên đủ chuyên môn',
      reviewerId: 't2',
    })
  })
})
