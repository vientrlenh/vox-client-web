import { useMutation } from '@tanstack/react-query'
import { apiClient, graphQLRequest } from '@/shared/api'
import { getStoredAuthUser } from '@/features/auth/session/authSession'
import type {
  ClassUserMutationResponse,
  CreateClassUserResponse,
  CreateSchoolClassRequest,
  CreateSchoolClassResponse,
  DeleteSchoolClassResponse,
  UpdateSchoolClassRequest,
} from '../types'

type ApiResponse<T> = {
  data: T
  message: string
}

type CreateSchoolClassInput = {
  payload: CreateSchoolClassRequest
}

type UpdateSchoolClassInput = {
  id: string
  payload: UpdateSchoolClassRequest
}

type DeleteSchoolClassInput = {
  classId: string
}

type AddClassUserInput = {
  classId: string
  userId: string
}

type RemoveClassUserInput = {
  classId: string
  userId: string
}

type UpdateClassUserStatusInput = {
  classId: string
  isActive: boolean
  userId: string
}

type MutationResult<TData> = {
  data: TData
  message: string
}

const UPDATE_SCHOOL_CLASS_MUTATION = `
  mutation UpdateSchoolClass($id: ID!, $input: UpdateSchoolClassInput!) {
    updateSchoolClass(id: $id, input: $input) {
      schoolClassId
    }
  }
`

type UpdateSchoolClassMutationData = {
  updateSchoolClass: {
    schoolClassId: string
  }
}

function requireSchoolId() {
  const schoolId = getStoredAuthUser()?.schoolId?.trim()

  if (!schoolId) {
    throw {
      message: 'Missing schoolId in access token.',
    }
  }

  return schoolId
}

export async function createSchoolClass({
  payload,
}: CreateSchoolClassInput): Promise<
  MutationResult<CreateSchoolClassResponse>
> {
  const schoolId = requireSchoolId()
  const response = await apiClient.post<ApiResponse<CreateSchoolClassResponse>>(
    `/v1/schools/${schoolId}/classes`,
    payload,
  )

  return response.data
}

export async function updateSchoolClass({
  id,
  payload,
}: UpdateSchoolClassInput): Promise<
  MutationResult<{ schoolClassId: string }>
> {
  const data = await graphQLRequest<UpdateSchoolClassMutationData>(
    UPDATE_SCHOOL_CLASS_MUTATION,
    {
      id,
      input: payload,
    },
  )

  return {
    data: data.updateSchoolClass,
    message: 'Class updated successfully.',
  }
}

export async function deleteSchoolClass({
  classId,
}: DeleteSchoolClassInput): Promise<
  MutationResult<DeleteSchoolClassResponse>
> {
  const schoolId = requireSchoolId()
  const response = await apiClient.delete<ApiResponse<DeleteSchoolClassResponse>>(
    `/v1/schools/${schoolId}/classes/${classId}`,
  )

  return response.data
}

export async function addClassUser({
  classId,
  userId,
}: AddClassUserInput): Promise<MutationResult<CreateClassUserResponse>> {
  const schoolId = requireSchoolId()
  const response = await apiClient.post<ApiResponse<CreateClassUserResponse>>(
    `/v1/schools/${schoolId}/classes/${classId}/users`,
    { userId },
  )

  return response.data
}

export async function removeClassUser({
  classId,
  userId,
}: RemoveClassUserInput): Promise<MutationResult<ClassUserMutationResponse>> {
  const schoolId = requireSchoolId()
  const response = await apiClient.delete<
    ApiResponse<ClassUserMutationResponse>
  >(`/v1/schools/${schoolId}/classes/${classId}/users/${userId}`)

  return response.data
}

export async function updateClassUserStatus({
  classId,
  isActive,
  userId,
}: UpdateClassUserStatusInput): Promise<
  MutationResult<ClassUserMutationResponse>
> {
  const schoolId = requireSchoolId()
  const response = await apiClient.patch<ApiResponse<ClassUserMutationResponse>>(
    `/v1/schools/${schoolId}/classes/${classId}/users/${userId}/status`,
    { isActive },
  )

  return response.data
}

export function useCreateSchoolClassMutation() {
  return useMutation({
    mutationFn: createSchoolClass,
  })
}

export function useUpdateSchoolClassMutation() {
  return useMutation({
    mutationFn: updateSchoolClass,
  })
}

export function useDeleteSchoolClassMutation() {
  return useMutation({
    mutationFn: deleteSchoolClass,
  })
}

export function useAddClassUserMutation() {
  return useMutation({
    mutationFn: addClassUser,
  })
}

export function useRemoveClassUserMutation() {
  return useMutation({
    mutationFn: removeClassUser,
  })
}

export function useUpdateClassUserStatusMutation() {
  return useMutation({
    mutationFn: updateClassUserStatus,
  })
}
