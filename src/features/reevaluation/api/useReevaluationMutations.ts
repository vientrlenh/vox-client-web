import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  approveRequest,
  assignReviewers,
  publishResult,
  rejectRequest,
  submitReport,
} from '../mock/reevaluationStore'
import type { CriterionScores } from '../types'
import { reevaluationKeys } from './useReevaluationQueries'

/**
 * Các mutation thao tác trên mock store rồi invalidate toàn bộ cache phúc khảo
 * để UI đọc lại state mới. Đổi phần thân mutationFn sang API thật khi cần.
 */

export function useApproveMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      approveRequest(id)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reevaluationKeys.all }),
  })
}

export function useRejectMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      rejectRequest(id, reason)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reevaluationKeys.all }),
  })
}

export function useAssignMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, teacherIds }: { id: string; teacherIds: string[] }) => {
      assignReviewers(id, teacherIds)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reevaluationKeys.all }),
  })
}

export function useSubmitReportMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      teacherId,
      scores,
      note,
    }: {
      id: string
      teacherId: string
      scores: CriterionScores
      note: string
    }) => {
      submitReport(id, teacherId, scores, note)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reevaluationKeys.all }),
  })
}

export function usePublishMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, finalScore }: { id: string; finalScore: number }) => {
      publishResult(id, finalScore)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reevaluationKeys.all }),
  })
}
