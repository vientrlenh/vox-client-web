import { useMutation } from '@tanstack/react-query'
import {
  type ApiResponse,
  type MutationResult,
  apiClient,
  graphQLRequest,
} from '@/shared/api'
import type {
  CreateSchoolGradeLevelRequest,
  UpdateSchoolGradeLevelRequest,
} from '../types'

// Khối lớp là catalog dùng chung toàn hệ thống -> 3 thao tác ghi dưới đây CHỈ SYSTEM_ADMIN gọi
// được (BE: @PreAuthorize hasRole('SYSTEM_ADMIN')) và đường dẫn không còn nằm dưới /{schoolId}.
// School Admin chỉ đọc; UI phải ẩn nút thay vì để người dùng bấm rồi nhận 403.

type CreateSchoolGradeLevelInput = {
  payload: CreateSchoolGradeLevelRequest
}

type UpdateSchoolGradeLevelInput = {
  gradeLevelId: string
  payload: UpdateSchoolGradeLevelRequest
}

type DeleteSchoolGradeLevelInput = {
  gradeLevelId: string
}

const UPDATE_GRADE_LEVEL_MUTATION = `
  mutation UpdateGradeLevel($gradeLevelId: ID!, $input: UpdateGradeLevelInput!) {
    updateGradeLevel(gradeLevelId: $gradeLevelId, input: $input)
  }
`

type UpdateGradeLevelMutationData = {
  updateGradeLevel: string
}

export async function createSchoolGradeLevel({
  payload,
}: CreateSchoolGradeLevelInput): Promise<MutationResult<string>> {
  const response = await apiClient.post<ApiResponse<string>>(
    '/v1/schools/grade-levels',
    payload,
  )

  return response.data
}

export async function updateSchoolGradeLevel({
  gradeLevelId,
  payload,
}: UpdateSchoolGradeLevelInput): Promise<MutationResult<{ gradeLevelId: string }>> {
  const data = await graphQLRequest<UpdateGradeLevelMutationData>(
    UPDATE_GRADE_LEVEL_MUTATION,
    {
      gradeLevelId,
      input: payload,
    },
  )

  return {
    data: { gradeLevelId: data.updateGradeLevel },
    message: 'Cập nhật khối thành công.',
  }
}

export async function deleteSchoolGradeLevel({
  gradeLevelId,
}: DeleteSchoolGradeLevelInput): Promise<MutationResult<null>> {
  const response = await apiClient.delete<ApiResponse<null>>(
    `/v1/schools/grade-levels/${gradeLevelId}`,
  )

  return response.data
}

export function useCreateSchoolGradeLevelMutation() {
  return useMutation({
    mutationFn: createSchoolGradeLevel,
  })
}

export function useUpdateSchoolGradeLevelMutation() {
  return useMutation({
    mutationFn: updateSchoolGradeLevel,
  })
}

export function useDeleteSchoolGradeLevelMutation() {
  return useMutation({
    mutationFn: deleteSchoolGradeLevel,
  })
}
