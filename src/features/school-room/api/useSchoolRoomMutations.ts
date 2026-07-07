import { useMutation } from '@tanstack/react-query'
import {
  type ApiResponse,
  type MutationResult,
  apiClient,
  graphQLRequest,
  requireSchoolId,
} from '@/shared/api'
import type {
  CreateSchoolRoomRequest,
  UpdateSchoolRoomRequest,
} from '../types'

type CreateSchoolRoomInput = {
  payload: CreateSchoolRoomRequest
}

type UpdateSchoolRoomInput = {
  payload: UpdateSchoolRoomRequest
  roomId: string
}

type DeleteSchoolRoomInput = {
  roomId: string
}

const UPDATE_SCHOOL_ROOM_MUTATION = `
  mutation UpdateSchoolRoom($id: ID!, $input: UpdateSchoolRoomInput!) {
    updateSchoolRoom(id: $id, input: $input)
  }
`

type UpdateSchoolRoomMutationData = {
  updateSchoolRoom: string
}

export async function createSchoolRoom({
  payload,
}: CreateSchoolRoomInput): Promise<MutationResult<string>> {
  const schoolId = requireSchoolId()
  const response = await apiClient.post<ApiResponse<string>>(
    `/v1/schools/${schoolId}/rooms`,
    payload,
  )

  return response.data
}

export async function updateSchoolRoom({
  payload,
  roomId,
}: UpdateSchoolRoomInput): Promise<MutationResult<{ roomId: string }>> {
  const data = await graphQLRequest<UpdateSchoolRoomMutationData>(
    UPDATE_SCHOOL_ROOM_MUTATION,
    {
      id: roomId,
      input: payload,
    },
  )

  return {
    data: { roomId: data.updateSchoolRoom },
    message: 'Cập nhật phòng học thành công.',
  }
}

export async function deleteSchoolRoom({
  roomId,
}: DeleteSchoolRoomInput): Promise<MutationResult<null>> {
  const schoolId = requireSchoolId()
  const response = await apiClient.delete<ApiResponse<null>>(
    `/v1/schools/${schoolId}/rooms/${roomId}`,
  )

  return response.data
}

export function useCreateSchoolRoomMutation() {
  return useMutation({
    mutationFn: createSchoolRoom,
  })
}

export function useUpdateSchoolRoomMutation() {
  return useMutation({
    mutationFn: updateSchoolRoom,
  })
}

export function useDeleteSchoolRoomMutation() {
  return useMutation({
    mutationFn: deleteSchoolRoom,
  })
}
