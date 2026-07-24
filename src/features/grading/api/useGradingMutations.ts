import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import type { SubmitGradingResult } from '../types'
import { gradingKeys } from './useGradingQueries'

type ApiResponse<T> = {
  data: T
  message: string
}

export const GRADING_BASE = '/v1/grading-assignments'

export type CriterionScoreInput = {
  rubricCriterionId: string
  score: number
  rationale?: string
}

/** Điểm chấm cho MỘT phần thi. Không có trường điểm tổng — BE tự tính lại. */
export type ItemGradeInput = {
  paperItemId: string
  criterionScores: CriterionScoreInput[]
  feedbackSummary?: string
}

export type AssignmentItemInput = {
  candidateResultId: string
  teacherId: string
}

export async function assignGrading(assignments: AssignmentItemInput[]) {
  const response = await apiClient.post<ApiResponse<string[]>>(GRADING_BASE, { assignments })
  return response.data.message
}

export async function autoAssignGrading(input: {
  examId?: string
  scheduleId?: string
  teacherIds: string[]
}) {
  const response = await apiClient.post<ApiResponse<string[]>>(`${GRADING_BASE}/auto`, {
    examId: input.examId,
    scheduleId: input.scheduleId,
    teacherIds: input.teacherIds,
  })
  return response.data
}

export async function reassignGrading(assignmentId: string, teacherId: string) {
  const response = await apiClient.put<ApiResponse<string>>(`${GRADING_BASE}/${assignmentId}`, {
    teacherId,
  })
  return response.data.message
}

export async function removeGradingAssignment(assignmentId: string) {
  const response = await apiClient.delete<ApiResponse<string>>(`${GRADING_BASE}/${assignmentId}`)
  return response.data.message
}

/**
 * Nộp là chốt. Bài đang bị đánh dấu nghi vấn sẽ được BE gỡ cờ trong cùng
 * transaction — cờ CHỈ thực sự được gỡ ở bước này, không phải lúc mở màn chấm.
 */
export async function submitGrading(assignmentId: string, items: ItemGradeInput[]) {
  const response = await apiClient.post<ApiResponse<SubmitGradingResult>>(
    `${GRADING_BASE}/${assignmentId}/grade`,
    { items },
  )
  return response.data.data
}

export async function invalidateGrading(assignmentId: string, reason?: string) {
  const response = await apiClient.post<ApiResponse<{ candidateResultId: string; resultStatus: string }>>(
    `${GRADING_BASE}/${assignmentId}/invalidate`,
    { reason },
  )
  return response.data.message
}

function useInvalidateGrading() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: gradingKeys.all })
}

export function useAssignGradingMutation() {
  const invalidate = useInvalidateGrading()
  return useMutation({
    mutationFn: (assignments: AssignmentItemInput[]) => assignGrading(assignments),
    onSuccess: invalidate,
  })
}

export function useAutoAssignGradingMutation() {
  const invalidate = useInvalidateGrading()
  return useMutation({
    mutationFn: (input: { examId?: string; scheduleId?: string; teacherIds: string[] }) =>
      autoAssignGrading(input),
    onSuccess: invalidate,
  })
}

export function useReassignGradingMutation() {
  const invalidate = useInvalidateGrading()
  return useMutation({
    mutationFn: ({ assignmentId, teacherId }: { assignmentId: string; teacherId: string }) =>
      reassignGrading(assignmentId, teacherId),
    onSuccess: invalidate,
  })
}

export function useRemoveGradingAssignmentMutation() {
  const invalidate = useInvalidateGrading()
  return useMutation({
    mutationFn: (assignmentId: string) => removeGradingAssignment(assignmentId),
    onSuccess: invalidate,
  })
}

export function useSubmitGradingMutation() {
  const invalidate = useInvalidateGrading()
  return useMutation({
    mutationFn: ({ assignmentId, items }: { assignmentId: string; items: ItemGradeInput[] }) =>
      submitGrading(assignmentId, items),
    onSuccess: invalidate,
  })
}

export function useInvalidateGradingMutation() {
  const invalidate = useInvalidateGrading()
  return useMutation({
    mutationFn: ({ assignmentId, reason }: { assignmentId: string; reason?: string }) =>
      invalidateGrading(assignmentId, reason),
    onSuccess: invalidate,
  })
}
