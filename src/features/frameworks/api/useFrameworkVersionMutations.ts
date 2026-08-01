import { useMutation } from '@tanstack/react-query'
import { apiClient, graphQLRequest } from '@/shared/api'
import type {
  CreateFrameworkCriteriaRequest,
  CreateFrameworkCriteriaResponse,
  CreateFrameworkCriterionBandsRequest,
  CreateFrameworkCriterionBandsResponse,
  CreateFrameworkResultBandsRequest,
  CreateFrameworkResultBandsResponse,
  CreateFrameworkVersionRequest,
  CreateFrameworkVersionResponse,
  DeleteFrameworkCriterionBandResponse,
  DeleteFrameworkCriterionResponse,
  DeleteFrameworkResultBandResponse,
  DeleteFrameworkVersionResponse,
  MutationResult,
  UpdateFrameworkCriterionBandRequest,
  UpdateFrameworkCriterionBandResponse,
  UpdateFrameworkCriterionRequest,
  UpdateFrameworkCriterionResponse,
  UpdateFrameworkResultBandRequest,
  UpdateFrameworkResultBandResponse,
  UpdateFrameworkVersionRequest,
  UpdateFrameworkVersionResponse,
  UpdateFrameworkVersionStatusRequest,
  UpdateFrameworkVersionStatusResponse,
} from '../types'

type ApiResponse<TData> = {
  data: TData
  message: string
}

type CreateFrameworkVersionInput = {
  frameworkId: string
  payload: CreateFrameworkVersionRequest
}

type DeleteFrameworkVersionInput = {
  frameworkId: string
  versionId: string
}

type UpdateFrameworkVersionInput = {
  frameworkId: string
  payload: UpdateFrameworkVersionRequest
  versionId: string
}

type UpdateFrameworkVersionStatusInput = {
  frameworkId: string
  payload: UpdateFrameworkVersionStatusRequest
  versionId: string
}

type CreateFrameworkCriteriaInput = {
  frameworkId: string
  payload: CreateFrameworkCriteriaRequest
  versionId: string
}

type UpdateFrameworkCriterionInput = {
  criterionId: string
  frameworkId: string
  payload: UpdateFrameworkCriterionRequest
  versionId: string
}

type DeleteFrameworkCriterionInput = {
  criterionId: string
  frameworkId: string
  versionId: string
}

type CreateFrameworkCriterionBandsInput = {
  criterionId: string
  frameworkId: string
  payload: CreateFrameworkCriterionBandsRequest
  versionId: string
}

type UpdateFrameworkCriterionBandInput = {
  bandId: string
  criterionId: string
  frameworkId: string
  payload: UpdateFrameworkCriterionBandRequest
  versionId: string
}

type DeleteFrameworkCriterionBandInput = {
  bandId: string
  criterionId: string
  frameworkId: string
  versionId: string
}

type CreateFrameworkResultBandsInput = {
  frameworkId: string
  payload: CreateFrameworkResultBandsRequest
  versionId: string
}

type UpdateFrameworkResultBandInput = {
  bandId: string
  frameworkId: string
  payload: UpdateFrameworkResultBandRequest
  versionId: string
}

type DeleteFrameworkResultBandInput = {
  bandId: string
  frameworkId: string
  versionId: string
}

export async function createFrameworkVersion({
  frameworkId,
  payload,
}: CreateFrameworkVersionInput): Promise<
  MutationResult<CreateFrameworkVersionResponse>
> {
  const response = await apiClient.post<
    ApiResponse<CreateFrameworkVersionResponse>
  >(`/v1/frameworks/${frameworkId}/versions`, payload)

  return response.data
}

export async function deleteFrameworkVersion({
  frameworkId,
  versionId,
}: DeleteFrameworkVersionInput): Promise<
  MutationResult<DeleteFrameworkVersionResponse>
> {
  const response = await apiClient.delete<
    ApiResponse<DeleteFrameworkVersionResponse>
  >(`/v1/frameworks/${frameworkId}/versions/${versionId}`)

  return response.data
}

export function useCreateFrameworkVersionMutation() {
  return useMutation({
    mutationFn: createFrameworkVersion,
  })
}

export function useDeleteFrameworkVersionMutation() {
  return useMutation({
    mutationFn: deleteFrameworkVersion,
  })
}

// --- REST: change version status (DRAFT -> PUBLISHED -> ARCHIVED) ---

export async function updateFrameworkVersionStatus({
  frameworkId,
  payload,
  versionId,
}: UpdateFrameworkVersionStatusInput): Promise<
  MutationResult<UpdateFrameworkVersionStatusResponse>
> {
  const response = await apiClient.patch<
    ApiResponse<UpdateFrameworkVersionStatusResponse>
  >(`/v1/frameworks/${frameworkId}/versions/${versionId}/status`, payload)

  return response.data
}

export function useUpdateFrameworkVersionStatusMutation() {
  return useMutation({
    mutationFn: updateFrameworkVersionStatus,
  })
}

// --- REST: criteria create/delete; GraphQL: update ---

export async function createFrameworkCriteria({
  frameworkId,
  payload,
  versionId,
}: CreateFrameworkCriteriaInput): Promise<
  MutationResult<CreateFrameworkCriteriaResponse>
> {
  const response = await apiClient.post<
    ApiResponse<CreateFrameworkCriteriaResponse>
  >(`/v1/frameworks/${frameworkId}/versions/${versionId}/criteria`, payload)

  return response.data
}

export function useCreateFrameworkCriteriaMutation() {
  return useMutation({
    mutationFn: createFrameworkCriteria,
  })
}

const UPDATE_FRAMEWORK_CRITERION_MUTATION = `
  mutation UpdateFrameworkCriterion(
    $frameworkId: ID!
    $versionId: ID!
    $criterionId: ID!
    $input: UpdateFrameworkCriterionInput!
  ) {
    updateFrameworkCriterion(
      frameworkId: $frameworkId
      versionId: $versionId
      criterionId: $criterionId
      input: $input
    )
  }
`

type UpdateFrameworkCriterionMutationData = {
  updateFrameworkCriterion: string
}

export async function updateFrameworkCriterion({
  criterionId,
  frameworkId,
  payload,
  versionId,
}: UpdateFrameworkCriterionInput): Promise<
  MutationResult<UpdateFrameworkCriterionResponse>
> {
  const data = await graphQLRequest<UpdateFrameworkCriterionMutationData>(
    UPDATE_FRAMEWORK_CRITERION_MUTATION,
    { criterionId, frameworkId, input: payload, versionId },
  )

  return { data: data.updateFrameworkCriterion, message: 'Cập nhật tiêu chí thành công.' }
}

export function useUpdateFrameworkCriterionMutation() {
  return useMutation({
    mutationFn: updateFrameworkCriterion,
  })
}

export async function deleteFrameworkCriterion({
  criterionId,
  frameworkId,
  versionId,
}: DeleteFrameworkCriterionInput): Promise<
  MutationResult<DeleteFrameworkCriterionResponse>
> {
  await apiClient.delete(
    `/v1/frameworks/${frameworkId}/versions/${versionId}/criteria/${criterionId}`,
  )

  return { data: undefined, message: 'Xóa tiêu chí thành công.' }
}

export function useDeleteFrameworkCriterionMutation() {
  return useMutation({
    mutationFn: deleteFrameworkCriterion,
  })
}

// --- REST: create bands on one existing criterion (additive, no other data touched) ---

export async function createFrameworkCriterionBands({
  criterionId,
  frameworkId,
  payload,
  versionId,
}: CreateFrameworkCriterionBandsInput): Promise<
  MutationResult<CreateFrameworkCriterionBandsResponse>
> {
  const response = await apiClient.post<
    ApiResponse<CreateFrameworkCriterionBandsResponse>
  >(
    `/v1/frameworks/${frameworkId}/versions/${versionId}/criteria/${criterionId}/bands`,
    payload,
  )

  return response.data
}

export function useCreateFrameworkCriterionBandsMutation() {
  return useMutation({
    mutationFn: createFrameworkCriterionBands,
  })
}

// --- update one criterion band ---

const UPDATE_FRAMEWORK_CRITERION_BAND_MUTATION = `
  mutation UpdateFrameworkCriterionBand(
    $frameworkId: ID!
    $versionId: ID!
    $criterionId: ID!
    $bandId: ID!
    $input: UpdateFrameworkCriterionBandInput!
  ) {
    updateFrameworkCriterionBand(
      frameworkId: $frameworkId
      versionId: $versionId
      criterionId: $criterionId
      bandId: $bandId
      input: $input
    )
  }
`

type UpdateFrameworkCriterionBandMutationData = {
  updateFrameworkCriterionBand: string
}

export async function updateFrameworkCriterionBand({
  bandId,
  criterionId,
  frameworkId,
  payload,
  versionId,
}: UpdateFrameworkCriterionBandInput): Promise<
  MutationResult<UpdateFrameworkCriterionBandResponse>
> {
  const data = await graphQLRequest<UpdateFrameworkCriterionBandMutationData>(
    UPDATE_FRAMEWORK_CRITERION_BAND_MUTATION,
    { bandId, criterionId, frameworkId, input: payload, versionId },
  )

  return {
    data: data.updateFrameworkCriterionBand,
    message: 'Cập nhật thang điểm tiêu chí thành công.',
  }
}

export function useUpdateFrameworkCriterionBandMutation() {
  return useMutation({
    mutationFn: updateFrameworkCriterionBand,
  })
}

export async function deleteFrameworkCriterionBand({
  bandId,
  criterionId,
  frameworkId,
  versionId,
}: DeleteFrameworkCriterionBandInput): Promise<
  MutationResult<DeleteFrameworkCriterionBandResponse>
> {
  await apiClient.delete(
    `/v1/frameworks/${frameworkId}/versions/${versionId}/criteria/${criterionId}/bands/${bandId}`,
  )

  return { data: undefined, message: 'Xóa mức đánh giá thành công.' }
}

export function useDeleteFrameworkCriterionBandMutation() {
  return useMutation({
    mutationFn: deleteFrameworkCriterionBand,
  })
}

// --- REST: result bands create/delete; GraphQL: update ---

export async function createFrameworkResultBands({
  frameworkId,
  payload,
  versionId,
}: CreateFrameworkResultBandsInput): Promise<
  MutationResult<CreateFrameworkResultBandsResponse>
> {
  const response = await apiClient.post<
    ApiResponse<CreateFrameworkResultBandsResponse>
  >(`/v1/frameworks/${frameworkId}/versions/${versionId}/result-bands`, payload)

  return response.data
}

export function useCreateFrameworkResultBandsMutation() {
  return useMutation({
    mutationFn: createFrameworkResultBands,
  })
}

const UPDATE_FRAMEWORK_RESULT_BAND_MUTATION = `
  mutation UpdateFrameworkResultBand(
    $frameworkId: ID!
    $versionId: ID!
    $bandId: ID!
    $input: UpdateFrameworkResultBandInput!
  ) {
    updateFrameworkResultBand(
      frameworkId: $frameworkId
      versionId: $versionId
      bandId: $bandId
      input: $input
    )
  }
`

type UpdateFrameworkResultBandMutationData = {
  updateFrameworkResultBand: string
}

export async function updateFrameworkResultBand({
  bandId,
  frameworkId,
  payload,
  versionId,
}: UpdateFrameworkResultBandInput): Promise<
  MutationResult<UpdateFrameworkResultBandResponse>
> {
  const data = await graphQLRequest<UpdateFrameworkResultBandMutationData>(
    UPDATE_FRAMEWORK_RESULT_BAND_MUTATION,
    { bandId, frameworkId, input: payload, versionId },
  )

  return {
    data: data.updateFrameworkResultBand,
    message: 'Cập nhật thang kết quả thành công.',
  }
}

export function useUpdateFrameworkResultBandMutation() {
  return useMutation({
    mutationFn: updateFrameworkResultBand,
  })
}

export async function deleteFrameworkResultBand({
  bandId,
  frameworkId,
  versionId,
}: DeleteFrameworkResultBandInput): Promise<
  MutationResult<DeleteFrameworkResultBandResponse>
> {
  await apiClient.delete(
    `/v1/frameworks/${frameworkId}/versions/${versionId}/result-bands/${bandId}`,
  )

  return { data: undefined, message: 'Xóa thang kết quả thành công.' }
}

export function useDeleteFrameworkResultBandMutation() {
  return useMutation({
    mutationFn: deleteFrameworkResultBand,
  })
}

// --- GraphQL: updateFrameworkVersion (metadata only) ---

const UPDATE_FRAMEWORK_VERSION_MUTATION = `
  mutation UpdateFrameworkVersion(
    $frameworkId: ID!
    $versionId: ID!
    $input: UpdateFrameworkVersionInput!
  ) {
    updateFrameworkVersion(
      frameworkId: $frameworkId
      versionId: $versionId
      input: $input
    )
  }
`

type UpdateFrameworkVersionMutationData = {
  updateFrameworkVersion: string
}

export async function updateFrameworkVersion({
  frameworkId,
  payload,
  versionId,
}: UpdateFrameworkVersionInput): Promise<
  MutationResult<UpdateFrameworkVersionResponse>
> {
  const data = await graphQLRequest<UpdateFrameworkVersionMutationData>(
    UPDATE_FRAMEWORK_VERSION_MUTATION,
    { frameworkId, input: payload, versionId },
  )

  return {
    data: data.updateFrameworkVersion,
    message: 'Cập nhật phiên bản thành công.',
  }
}

export function useUpdateFrameworkVersionMutation() {
  return useMutation({
    mutationFn: updateFrameworkVersion,
  })
}
