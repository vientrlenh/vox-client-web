import { useMutation } from '@tanstack/react-query'
import { apiClient, graphQLRequest } from '@/shared/api'
import type {
  CreateSupportedLanguageRequest,
  CreateSupportedLanguageResponse,
  DeleteSupportedLanguageResponse,
  MutationResult,
  UpdateSupportedLanguageRequest,
  UpdateSupportedLanguageResponse,
} from '../types'

type ApiResponse<TData> = {
  data: TData
  message: string
}

type CreateSupportedLanguageInput = {
  payload: CreateSupportedLanguageRequest
}

type UpdateSupportedLanguageInput = {
  id: string
  payload: UpdateSupportedLanguageRequest
}

type DeleteSupportedLanguageInput = {
  id: string
}

const UPDATE_SUPPORTED_LANGUAGE_MUTATION = `
  mutation UpdateSupportedLanguage($id: ID!, $input: UpdateSupportedLanguageInput!) {
    updateSupportedLanguage(id: $id, input: $input) {
      supportedLanguageId
    }
  }
`

type UpdateSupportedLanguageMutationData = {
  updateSupportedLanguage: UpdateSupportedLanguageResponse
}

export async function createSupportedLanguage({
  payload,
}: CreateSupportedLanguageInput): Promise<
  MutationResult<CreateSupportedLanguageResponse>
> {
  const response = await apiClient.post<
    ApiResponse<CreateSupportedLanguageResponse>
  >('/v1/supported-languages', payload)

  return response.data
}

export async function updateSupportedLanguage({
  id,
  payload,
}: UpdateSupportedLanguageInput): Promise<
  MutationResult<UpdateSupportedLanguageResponse>
> {
  const data = await graphQLRequest<UpdateSupportedLanguageMutationData>(
    UPDATE_SUPPORTED_LANGUAGE_MUTATION,
    {
      id,
      input: payload,
    },
  )

  return {
    data: data.updateSupportedLanguage,
    message: 'Cập nhật ngôn ngữ thành công',
  }
}

export async function deleteSupportedLanguage({
  id,
}: DeleteSupportedLanguageInput): Promise<
  MutationResult<DeleteSupportedLanguageResponse>
> {
  const response = await apiClient.delete<ApiResponse<DeleteSupportedLanguageResponse>>(
    `/v1/supported-languages/${id}`,
  )

  return response.data
}

export function useCreateSupportedLanguageMutation() {
  return useMutation({
    mutationFn: createSupportedLanguage,
  })
}

export function useUpdateSupportedLanguageMutation() {
  return useMutation({
    mutationFn: updateSupportedLanguage,
  })
}

export function useDeleteSupportedLanguageMutation() {
  return useMutation({
    mutationFn: deleteSupportedLanguage,
  })
}
