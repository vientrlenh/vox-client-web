import { apiClient } from '@/shared/api'
import {
  assignGrading,
  autoAssignGrading,
  invalidateGrading,
  reassignGrading,
  removeGradingAssignment,
  submitGrading,
} from './useGradingMutations'
import { previewGrading } from './useGradingPreviewQuery'

const post = jest.spyOn(apiClient, 'post')
const put = jest.spyOn(apiClient, 'put')
const del = jest.spyOn(apiClient, 'delete')

function okResponse(message: string, data: unknown = 'ok') {
  return { data: { data, message } }
}

describe('grading REST mutations', () => {
  beforeEach(() => {
    post.mockReset()
    put.mockReset()
    del.mockReset()
  })

  it('assigns a batch of result/teacher pairs', async () => {
    post.mockResolvedValue(okResponse('Phân công chấm bài thành công!', ['a1']))

    const assignments = [{ candidateResultId: 'r1', teacherId: 't1' }]
    await assignGrading(assignments)
    expect(post).toHaveBeenCalledWith('/v1/grading-assignments', { assignments })
  })

  it('auto-assigns by exam and returns the created ids', async () => {
    post.mockResolvedValue(okResponse('Phân công tự động thành công!', ['a1', 'a2']))

    const result = await autoAssignGrading({ examId: 'e1', teacherIds: ['t1', 't2'] })
    expect(post).toHaveBeenCalledWith('/v1/grading-assignments/auto', {
      examId: 'e1',
      scheduleId: undefined,
      teacherIds: ['t1', 't2'],
    })
    expect(result.data).toEqual(['a1', 'a2'])
  })

  it('reassigns a single assignment via PUT', async () => {
    put.mockResolvedValue(okResponse('Đổi giáo viên chấm bài thành công!'))

    await reassignGrading('a1', 't2')
    expect(put).toHaveBeenCalledWith('/v1/grading-assignments/a1', { teacherId: 't2' })
  })

  it('removes an assignment via DELETE', async () => {
    del.mockResolvedValue(okResponse('Gỡ phân công thành công!'))

    await removeGradingAssignment('a1')
    expect(del).toHaveBeenCalledWith('/v1/grading-assignments/a1')
  })

  it('submits criterion scores per item and returns the recalculated total', async () => {
    post.mockResolvedValue(
      okResponse('Nộp điểm chấm bài thành công!', {
        candidateResultId: 'r1',
        resultStatus: 'RELEASED',
        totalScore: 7.2,
      }),
    )

    const items = [
      {
        criterionScores: [{ rubricCriterionId: 'c1', score: 8 }],
        feedbackSummary: 'tốt',
        paperItemId: 'p1',
      },
    ]
    const result = await submitGrading('a1', items)
    expect(post).toHaveBeenCalledWith('/v1/grading-assignments/a1/grade', { items })
    // Tổng và trạng thái do BE tính lại, không phải thứ FE gửi lên.
    expect(result.totalScore).toBe(7.2)
    expect(result.resultStatus).toBe('RELEASED')
  })

  it('previews without writing, sending the same body as submit', async () => {
    post.mockResolvedValue(
      okResponse('Tính thử điểm thành công!', {
        itemScores: [{ itemScore: 7.2, paperItemId: 'p1' }],
        resultBandName: 'B2',
        totalScore: 7.2,
      }),
    )

    const items = [
      { criterionScores: [{ rubricCriterionId: 'c1', score: 8 }], paperItemId: 'p1' },
    ]
    const preview = await previewGrading('a1', items)
    // Cùng shape body với /grade để tổng preview == tổng khi nộp.
    expect(post).toHaveBeenCalledWith('/v1/grading-assignments/a1/grade/preview', { items })
    expect(preview.totalScore).toBe(7.2)
  })

  it('invalidates a flagged submission with a reason', async () => {
    post.mockResolvedValue(okResponse('Vô hiệu bài thi thành công!'))

    await invalidateGrading('a1', 'Có người nhắc bài')
    expect(post).toHaveBeenCalledWith('/v1/grading-assignments/a1/invalidate', {
      reason: 'Có người nhắc bài',
    })
  })
})
