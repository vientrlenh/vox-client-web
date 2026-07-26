import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import type { GradingActionResult, GradingRoundType, GradingSampleSelectionMode } from '../types'
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

/** Gán tay nhiều bài một lần. Một lần gán chỉ MỘT vòng chấm — BE từ chối trộn vòng. */
export type AssignGradingInput = {
  assignments: AssignmentItemInput[]
  deadlineAt?: string | null
  roundType: GradingRoundType
}

export type AutoAssignGradingInput = {
  candidateResultIds?: string[]
  deadlineAt?: string | null
  examId?: string
  percent?: number
  roundType: GradingRoundType
  scheduleId?: string
  selectionMode?: GradingSampleSelectionMode
  teacherIds: string[]
}

export type ReclaimOverdueInput = {
  assignmentIds?: string[]
  examId?: string
  newDeadlineAt?: string | null
  reassignToTeacherIds?: string[]
}

export async function assignGrading(input: AssignGradingInput) {
  const response = await apiClient.post<ApiResponse<string[]>>(GRADING_BASE, {
    assignments: input.assignments,
    deadlineAt: input.deadlineAt ?? undefined,
    roundType: input.roundType,
  })
  return response.data.message
}

export async function autoAssignGrading(input: AutoAssignGradingInput) {
  const response = await apiClient.post<ApiResponse<string[]>>(`${GRADING_BASE}/auto`, {
    // Chỉ gửi danh sách chỉ định ở chế độ MANUAL_LIST và tỉ lệ ở RANDOM_PERCENT —
    // gửi thừa thì BE bỏ qua, nhưng body sạch giúp đọc log dễ hơn khi gán sai tập bài.
    candidateResultIds:
      input.selectionMode === 'MANUAL_LIST' ? input.candidateResultIds : undefined,
    deadlineAt: input.deadlineAt ?? undefined,
    examId: input.examId,
    percent: input.selectionMode === 'RANDOM_PERCENT' ? input.percent : undefined,
    roundType: input.roundType,
    scheduleId: input.scheduleId,
    selectionMode: input.selectionMode,
    teacherIds: input.teacherIds,
  })
  return response.data.data
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

/** `deadlineAt` null = gỡ hạn cho các phân công được chọn. */
export async function setGradingDeadline(assignmentIds: string[], deadlineAt: string | null) {
  const response = await apiClient.put<ApiResponse<string[]>>(`${GRADING_BASE}/deadline`, {
    assignmentIds,
    deadlineAt: deadlineAt ?? undefined,
  })
  return response.data.data
}

/** Bỏ trống `assignmentIds` = thu hồi MỌI phân công quá hạn trong phạm vi kỳ thi. */
export async function reclaimOverdueAssignments(input: ReclaimOverdueInput) {
  const response = await apiClient.post<ApiResponse<string[]>>(`${GRADING_BASE}/reclaim-overdue`, {
    assignmentIds: input.assignmentIds?.length ? input.assignmentIds : undefined,
    examId: input.examId,
    newDeadlineAt: input.newDeadlineAt ?? undefined,
    reassignToTeacherIds: input.reassignToTeacherIds?.length
      ? input.reassignToTeacherIds
      : undefined,
  })
  return response.data.data
}

// ---- Bốn hành động của giáo viên. Vòng nào cho phép hành động nào do BE quyết và
// trả sẵn trong `gradingTaskDetail.allowedOutcomes` — đừng suy lại từ roundType.

/** Giữ nguyên điểm đang có. Lý do KHÔNG bắt buộc ở hành động này. */
export async function upholdResult(assignmentId: string, reason?: string) {
  const response = await apiClient.post<ApiResponse<GradingActionResult>>(
    `${GRADING_BASE}/${assignmentId}/uphold`,
    { reason: reason || undefined },
  )
  return response.data.data
}

/**
 * Chấm lại — nộp là chốt. Bài đang bị đánh dấu nghi vấn sẽ được BE gỡ cờ trong cùng
 * transaction; cờ CHỈ thực sự được gỡ ở bước này, không phải lúc mở màn chấm.
 */
export async function regradeResult(assignmentId: string, items: ItemGradeInput[]) {
  const response = await apiClient.post<ApiResponse<GradingActionResult>>(
    `${GRADING_BASE}/${assignmentId}/regrade`,
    { items },
  )
  return response.data.data
}

/** Kết luận vi phạm -> bài INVALID, không nhập điểm. Lý do BẮT BUỘC. */
export async function invalidateResult(assignmentId: string, reason: string) {
  const response = await apiClient.post<ApiResponse<GradingActionResult>>(
    `${GRADING_BASE}/${assignmentId}/invalidate`,
    { reason },
  )
  return response.data.data
}

/**
 * Kết luận KHÔNG vi phạm -> gỡ vô hiệu và mở luôn vòng chấm thủ công cho chính giáo
 * viên này (`nextAssignmentId`). Lý do BẮT BUỘC.
 */
export async function clearInvalidResult(assignmentId: string, reason: string) {
  const response = await apiClient.post<ApiResponse<GradingActionResult>>(
    `${GRADING_BASE}/${assignmentId}/clear-invalid`,
    { reason },
  )
  return response.data.data
}

/** Trả lại phân công (quen biết thí sinh…). Bài về hàng chưa giao. Lý do BẮT BUỘC. */
export async function declineGradingAssignment(assignmentId: string, reason: string) {
  const response = await apiClient.post<ApiResponse<GradingActionResult>>(
    `${GRADING_BASE}/${assignmentId}/decline`,
    { reason },
  )
  return response.data.data
}

function useInvalidateGrading() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: gradingKeys.all })
}

export function useAssignGradingMutation() {
  const invalidate = useInvalidateGrading()
  return useMutation({
    mutationFn: (input: AssignGradingInput) => assignGrading(input),
    onSuccess: invalidate,
  })
}

export function useAutoAssignGradingMutation() {
  const invalidate = useInvalidateGrading()
  return useMutation({
    mutationFn: (input: AutoAssignGradingInput) => autoAssignGrading(input),
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

export function useSetGradingDeadlineMutation() {
  const invalidate = useInvalidateGrading()
  return useMutation({
    mutationFn: ({
      assignmentIds,
      deadlineAt,
    }: {
      assignmentIds: string[]
      deadlineAt: string | null
    }) => setGradingDeadline(assignmentIds, deadlineAt),
    onSuccess: invalidate,
  })
}

export function useReclaimOverdueMutation() {
  const invalidate = useInvalidateGrading()
  return useMutation({
    mutationFn: (input: ReclaimOverdueInput) => reclaimOverdueAssignments(input),
    onSuccess: invalidate,
  })
}

export function useUpholdResultMutation() {
  const invalidate = useInvalidateGrading()
  return useMutation({
    mutationFn: ({ assignmentId, reason }: { assignmentId: string; reason?: string }) =>
      upholdResult(assignmentId, reason),
    onSuccess: invalidate,
  })
}

export function useRegradeResultMutation() {
  const invalidate = useInvalidateGrading()
  return useMutation({
    mutationFn: ({ assignmentId, items }: { assignmentId: string; items: ItemGradeInput[] }) =>
      regradeResult(assignmentId, items),
    onSuccess: invalidate,
  })
}

export function useInvalidateResultMutation() {
  const invalidate = useInvalidateGrading()
  return useMutation({
    mutationFn: ({ assignmentId, reason }: { assignmentId: string; reason: string }) =>
      invalidateResult(assignmentId, reason),
    onSuccess: invalidate,
  })
}

export function useClearInvalidResultMutation() {
  const invalidate = useInvalidateGrading()
  return useMutation({
    mutationFn: ({ assignmentId, reason }: { assignmentId: string; reason: string }) =>
      clearInvalidResult(assignmentId, reason),
    onSuccess: invalidate,
  })
}

export function useDeclineGradingAssignmentMutation() {
  const invalidate = useInvalidateGrading()
  return useMutation({
    mutationFn: ({ assignmentId, reason }: { assignmentId: string; reason: string }) =>
      declineGradingAssignment(assignmentId, reason),
    onSuccess: invalidate,
  })
}
