import { useMutation } from '@tanstack/react-query'
import {
  type ApiResponse,
  type MutationResult,
  apiClient,
  graphQLRequest,
  requireSchoolId,
} from '@/shared/api'
import type {
  CreateSchoolGradeLevelRequest,
  UpdateSchoolGradeLevelRequest,
} from '../types'

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

const UPDATE_SCHOOL_GRADE_LEVEL_MUTATION = `
  mutation UpdateGradeLevel($schoolId: ID!, $gradeLevelId: ID!, $input: UpdateSchoolGradeLevelInput!) {
    updateSchoolGradeLevel(schoolId: $schoolId, gradeLevelId: $gradeLevelId, input: $input)
  }
`

type UpdateSchoolGradeLevelMutationData = {
  updateSchoolGradeLevel: string
}

export async function createSchoolGradeLevel({
  payload,
}: CreateSchoolGradeLevelInput): Promise<MutationResult<string>> {
  const schoolId = requireSchoolId()
  const response = await apiClient.post<ApiResponse<string>>(
    `/v1/schools/${schoolId}/grade-levels`,
    payload,
  )

  return response.data
}

export async function updateSchoolGradeLevel({
  gradeLevelId,
  payload,
}: UpdateSchoolGradeLevelInput): Promise<MutationResult<{ gradeLevelId: string }>> {
  const schoolId = requireSchoolId()
  const data = await graphQLRequest<UpdateSchoolGradeLevelMutationData>(
    UPDATE_SCHOOL_GRADE_LEVEL_MUTATION,
    {
      gradeLevelId,
      input: payload,
      schoolId,
    },
  )

  return {
    data: { gradeLevelId: data.updateSchoolGradeLevel },
    message: 'Cập nhật khối thành công.',
  }
}

export async function deleteSchoolGradeLevel({
  gradeLevelId,
}: DeleteSchoolGradeLevelInput): Promise<MutationResult<null>> {
  const schoolId = requireSchoolId()
  const response = await apiClient.delete<ApiResponse<null>>(
    `/v1/schools/${schoolId}/grade-levels/${gradeLevelId}`,
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
