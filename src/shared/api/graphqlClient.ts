import axios from 'axios'
import { appConfig } from '@/shared/config/env'
import type { ApiError } from './apiError'
import { getAuthTokens } from './authTokenStorage'
import { createRawErrorInterceptorInstaller } from './rawErrorInterceptor'

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

export const graphqlApiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
})

graphqlApiClient.interceptors.request.use((config) => {
  const tokens = getAuthTokens()

  if (tokens?.accessToken) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`
  }

  return config
})

export const addGraphqlClientRawErrorInterceptor = createRawErrorInterceptorInstaller(graphqlApiClient)

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
  const response = await graphqlApiClient.post<GraphQLResponse<TData>>(
    appConfig.graphqlEndpoint,
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
