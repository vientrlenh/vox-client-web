import { useMutation } from '@tanstack/react-query'
import {
  type ApiResponse,
  type MutationResult,
  apiClient,
  graphQLRequest,
  requireSchoolId,
} from '@/shared/api'
import type {
  CreateSchoolGradeRequest,
  UpdateSchoolGradeRequest,
} from '../types'

type CreateSchoolGradeInput = {
  payload: CreateSchoolGradeRequest
  schoolGradeLevelId: string
}

type UpdateSchoolGradeInput = {
  id: string
  payload: UpdateSchoolGradeRequest
}

type DeleteSchoolGradeInput = {
  gradeId: string
}

const UPDATE_SCHOOL_GRADE_MUTATION = `
  mutation UpdateSchoolGrade($id: ID!, $input: UpdateSchoolGradeInput!) {
    updateSchoolGrade(id: $id, input: $input)
  }
`

type UpdateSchoolGradeMutationData = {
  updateSchoolGrade: string
}

export async function createSchoolGrade({
  payload,
  schoolGradeLevelId,
}: CreateSchoolGradeInput): Promise<MutationResult<string>> {
  const schoolId = requireSchoolId()
  const response = await apiClient.post<ApiResponse<string>>(
    `/v1/schools/${schoolId}/grade-levels/${schoolGradeLevelId}/grades`,
    payload,
  )

  return response.data
}

export async function updateSchoolGrade({
  id,
  payload,
}: UpdateSchoolGradeInput): Promise<MutationResult<{ gradeId: string }>> {
  const data = await graphQLRequest<UpdateSchoolGradeMutationData>(
    UPDATE_SCHOOL_GRADE_MUTATION,
    {
      id,
      input: payload,
    },
  )

  return {
    data: { gradeId: data.updateSchoolGrade },
    message: 'Cập nhật năm học thành công.',
  }
}

export async function deleteSchoolGrade({
  gradeId,
}: DeleteSchoolGradeInput): Promise<MutationResult<null>> {
  const schoolId = requireSchoolId()
  const response = await apiClient.delete<ApiResponse<null>>(
    `/v1/schools/${schoolId}/grades/${gradeId}`,
  )

  return response.data
}

export function useCreateSchoolGradeMutation() {
  return useMutation({
    mutationFn: createSchoolGrade,
  })
}

export function useUpdateSchoolGradeMutation() {
  return useMutation({
    mutationFn: updateSchoolGrade,
  })
}

export function useDeleteSchoolGradeMutation() {
  return useMutation({
    mutationFn: deleteSchoolGrade,
  })
}
