import { useMutation } from '@tanstack/react-query'
import {
  type ApiResponse,
  type MutationResult,
  apiClient,
  graphQLRequest,
  requireSchoolId,
} from '@/shared/api'
import type {
  CreateSchoolUserRequest,
  CreateSchoolUserResponse,
  UpdateSchoolUserInput,
  UpdateSchoolUserResponse,
} from '../types'

type CreateSchoolUserInputArgs = {
  payload: CreateSchoolUserRequest
}

type UpdateSchoolUserInputArgs = {
  input: UpdateSchoolUserInput
  userId: string
}

type DeleteSchoolUserInputArgs = {
  userId: string
}

const UPDATE_SCHOOL_USER_MUTATION = `
  mutation UpdateSchoolUser(
    $schoolId: ID!
    $userId: ID!
    $input: UpdateSchoolUserInput!
  ) {
    updateSchoolUser(schoolId: $schoolId, userId: $userId, input: $input) {
      schoolUserId
    }
  }
`

type UpdateSchoolUserMutationData = {
  updateSchoolUser: UpdateSchoolUserResponse
}

export async function createSchoolUser({
  payload,
}: CreateSchoolUserInputArgs): Promise<
  MutationResult<CreateSchoolUserResponse>
> {
  const schoolId = requireSchoolId()
  const response = await apiClient.post<ApiResponse<CreateSchoolUserResponse>>(
    `/v1/schools/${schoolId}/users`,
    payload,
  )

  return response.data
}

export async function updateSchoolUser({
  input,
  userId,
}: UpdateSchoolUserInputArgs): Promise<
  MutationResult<UpdateSchoolUserResponse>
> {
  const schoolId = requireSchoolId()
  const data = await graphQLRequest<UpdateSchoolUserMutationData>(
    UPDATE_SCHOOL_USER_MUTATION,
    {
      input,
      schoolId,
      userId,
    },
  )

  return {
    data: data.updateSchoolUser,
    message: 'Cập nhật người dùng thành công.',
  }
}

export async function deleteSchoolUser({
  userId,
}: DeleteSchoolUserInputArgs): Promise<MutationResult<{ userId: string }>> {
  const schoolId = requireSchoolId()
  // DELETE returns 204 No Content with no body — only the status matters.
  await apiClient.delete(`/v1/schools/${schoolId}/users/${userId}`)

  return {
    data: { userId },
    message: 'Đã vô hiệu hóa người dùng nhà trường.',
  }
}

export function useCreateSchoolUserMutation() {
  return useMutation({
    mutationFn: createSchoolUser,
  })
}

export function useUpdateSchoolUserMutation() {
  return useMutation({
    mutationFn: updateSchoolUser,
  })
}

export function useDeleteSchoolUserMutation() {
  return useMutation({
    mutationFn: deleteSchoolUser,
  })
}
