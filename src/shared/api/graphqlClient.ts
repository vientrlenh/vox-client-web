import { appConfig } from '@/shared/config/env'
import type { ApiError } from './apiError'
import { apiClient } from './apiClient'

type GraphQLErrorResponse = {
  extensions?: unknown
  message?: string
  path?: Array<number | string>
}

type GraphQLResponse<TData> = {
  data?: TData
  errors?: GraphQLErrorResponse[]
}

type GraphQLVariables = Record<string, unknown>

function toGraphQLError(errors: GraphQLErrorResponse[]): ApiError {
  const message = errors
    .map((error) => error.message)
    .filter(Boolean)
    .join('\n')

  return {
    details: errors,
    message: message || 'GraphQL request failed',
  }
}

export async function graphQLRequest<
  TData,
  TVariables extends GraphQLVariables = GraphQLVariables,
>(query: string, variables?: TVariables) {
  const response = await apiClient.post<GraphQLResponse<TData>>(
    appConfig.graphqlPath,
    {
      query,
      variables,
    },
  )

  if (response.data.errors?.length) {
    throw toGraphQLError(response.data.errors)
  }

  if (!response.data.data) {
    throw {
      message: 'GraphQL response did not include data',
    } satisfies ApiError
  }

  return response.data.data
}
