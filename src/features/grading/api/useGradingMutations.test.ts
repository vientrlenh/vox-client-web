import { apiClient } from '@/shared/api'
import {
  assignGrading,
  autoAssignGrading,
  clearInvalidResult,
  declineGradingAssignment,
  invalidateResult,
  reassignGrading,
  reclaimOverdueAssignments,
  regradeResult,
  removeGradingAssignment,
  setGradingDeadline,
  upholdResult,
} from './useGradingMutations'
import { previewGrading } from './useGradingPreviewQuery'

const post = jest.spyOn(apiClient, 'post')
const put = jest.spyOn(apiClient, 'put')
const del = jest.spyOn(apiClient, 'delete')

function okResponse(message: string, data: unknown = 'ok') {
  return { data: { data, message } }
}

function actionResponse(overrides: Record<string, unknown> = {}) {
  return okResponse('ok', {
    assignmentId: 'a1',
    candidateResultId: 'r1',
    outcome: 'UPHELD',
    resultStatus: 'RELEASED',
    totalScore: 7.2,
    ...overrides,
  })
}

describe('grading REST mutations', () => {
  beforeEach(() => {
    post.mockReset()
    put.mockReset()
    del.mockReset()
  })

  it('assigns a batch of result/teacher pairs for one grading round', async () => {
    post.mockResolvedValue(okResponse('Phân công chấm bài thành công!', ['a1']))

    const assignments = [{ candidateResultId: 'r1', teacherId: 't1' }]
    await assignGrading({ assignments, deadlineAt: null, roundType: 'SPOT_CHECK' })
    // Một lô chỉ một vòng chấm — BE từ chối trộn vòng trong cùng request.
    expect(post).toHaveBeenCalledWith('/v1/grading-assignments', {
      assignments,
      deadlineAt: undefined,
      roundType: 'SPOT_CHECK',
    })
  })

  it('auto-assigns with a sampling mode and returns the created ids', async () => {
    post.mockResolvedValue(okResponse('Phân công tự động thành công!', ['a1', 'a2']))

    const result = await autoAssignGrading({
      examId: 'e1',
      percent: 20,
      roundType: 'SPOT_CHECK',
      selectionMode: 'RANDOM_PERCENT',
      teacherIds: ['t1', 't2'],
    })
    expect(post).toHaveBeenCalledWith('/v1/grading-assignments/auto', {
      candidateResultIds: undefined,
      deadlineAt: undefined,
      examId: 'e1',
      percent: 20,
      roundType: 'SPOT_CHECK',
      scheduleId: undefined,
      selectionMode: 'RANDOM_PERCENT',
      teacherIds: ['t1', 't2'],
    })
    expect(result).toEqual(['a1', 'a2'])
  })

  it('drops percent when the selection mode is not RANDOM_PERCENT', async () => {
    post.mockResolvedValue(okResponse('Phân công tự động thành công!', []))

    await autoAssignGrading({
      examId: 'e1',
      percent: 20,
      roundType: 'INITIAL',
      selectionMode: 'ALL',
      teacherIds: ['t1'],
    })
    expect(post.mock.calls[0][1]).toMatchObject({ percent: undefined, selectionMode: 'ALL' })
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

  it('clears the deadline by sending no date at all', async () => {
    put.mockResolvedValue(okResponse('Đặt hạn chấm thành công!', ['a1']))

    await setGradingDeadline(['a1'], null)
    // Bỏ trống deadlineAt = gỡ hạn cho các phân công được chọn.
    expect(put).toHaveBeenCalledWith('/v1/grading-assignments/deadline', {
      assignmentIds: ['a1'],
      deadlineAt: undefined,
    })
  })

  it('reclaims every overdue assignment of an exam when no ids are given', async () => {
    post.mockResolvedValue(
      okResponse('Thu hồi phân công quá hạn thành công!', {
        hasMore: false,
        reassignedAssignmentIds: [],
        reclaimedAssignmentIds: ['a1'],
      }),
    )

    await reclaimOverdueAssignments({ assignmentIds: [], examId: 'e1', reassignToTeacherIds: [] })
    // Mảng rỗng phải thành `undefined`: BE hiểu "bỏ trống" là toàn bộ kỳ thi, còn
    // mảng rỗng gửi xuống thì không thu hồi gì cả.
    expect(post).toHaveBeenCalledWith('/v1/grading-assignments/reclaim-overdue', {
      assignmentIds: undefined,
      examId: 'e1',
      newDeadlineAt: undefined,
      reassignToTeacherIds: undefined,
    })
  })

  it('returns the three-field reclaim payload, not a flat id array', async () => {
    // BE đổi từ `List<UUID>` sang object ba trường: một mảng duy nhất không phân biệt
    // được phân công vừa đóng với phân công vừa mở, và không chở được cờ `hasMore`.
    post.mockResolvedValue(
      okResponse('Thu hồi phân công quá hạn thành công!', {
        hasMore: true,
        reassignedAssignmentIds: ['a9'],
        reclaimedAssignmentIds: ['a1', 'a2'],
      }),
    )

    const result = await reclaimOverdueAssignments({ examId: 'e1' })
    expect(result.reclaimedAssignmentIds).toEqual(['a1', 'a2'])
    expect(result.reassignedAssignmentIds).toEqual(['a9'])
    expect(result.hasMore).toBe(true)
  })

  it('submits criterion scores per item and returns the recalculated total', async () => {
    post.mockResolvedValue(actionResponse({ outcome: 'REGRADED' }))

    const items = [
      {
        criterionScores: [{ rubricCriterionId: 'c1', score: 8 }],
        feedbackSummary: 'tốt',
        paperItemId: 'p1',
      },
    ]
    const result = await regradeResult('a1', items)
    expect(post).toHaveBeenCalledWith('/v1/grading-assignments/a1/regrade', { items })
    // Tổng và trạng thái do BE tính lại, không phải thứ FE gửi lên.
    expect(result.totalScore).toBe(7.2)
    expect(result.resultStatus).toBe('RELEASED')
  })

  it('previews without writing, sending the same body as regrade', async () => {
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
    // Cùng shape body với /regrade để tổng preview == tổng khi nộp.
    expect(post).toHaveBeenCalledWith('/v1/grading-assignments/a1/regrade/preview', { items })
    expect(preview.totalScore).toBe(7.2)
  })

  it('upholds the current score, reason optional', async () => {
    post.mockResolvedValue(actionResponse())

    await upholdResult('a1')
    expect(post).toHaveBeenCalledWith('/v1/grading-assignments/a1/uphold', { reason: undefined })
  })

  it('invalidates a submission with a mandatory reason', async () => {
    post.mockResolvedValue(actionResponse({ outcome: 'INVALIDATED', resultStatus: 'INVALID' }))

    await invalidateResult('a1', 'Có người nhắc bài')
    expect(post).toHaveBeenCalledWith('/v1/grading-assignments/a1/invalidate', {
      reason: 'Có người nhắc bài',
    })
  })

  it('clears an invalid result and surfaces the follow-up assignment', async () => {
    post.mockResolvedValue(
      actionResponse({
        nextAssignmentId: 'a2',
        outcome: 'CLEARED_INVALID',
        resultStatus: 'PENDING_REVIEW',
      }),
    )

    const result = await clearInvalidResult('a1', 'Không có vi phạm')
    expect(post).toHaveBeenCalledWith('/v1/grading-assignments/a1/clear-invalid', {
      reason: 'Không có vi phạm',
    })
    // BE mở luôn vòng chấm thủ công cho chính giáo viên đó — FE đi thẳng sang bài mới.
    expect(result.nextAssignmentId).toBe('a2')
  })

  it('declines an assignment with a reason', async () => {
    post.mockResolvedValue(actionResponse({ outcome: 'DECLINED' }))

    await declineGradingAssignment('a1', 'Tôi quen thí sinh')
    expect(post).toHaveBeenCalledWith('/v1/grading-assignments/a1/decline', {
      reason: 'Tôi quen thí sinh',
    })
  })
})
