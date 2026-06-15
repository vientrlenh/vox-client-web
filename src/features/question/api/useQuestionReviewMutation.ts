import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import type { ReviewQuestionRequest } from '../types'

type ApiResponse<T> = {
  data: T
  message: string
}

type MutationResult = {
  id?: string
}

export async function reviewQuestion(
  questionId: string,
  payload: ReviewQuestionRequest,
) {
  const response = await apiClient.patch<ApiResponse<MutationResult>>(
    `/v1/questions/${questionId}/review-actions`,
    payload,
  )

  return response.data.message
}

export function useReviewQuestionMutation() {
  return useMutation({
    mutationFn: ({
      payload,
      questionId,
    }: {
      payload: ReviewQuestionRequest
      questionId: string
    }) => reviewQuestion(questionId, payload),
  })
}
