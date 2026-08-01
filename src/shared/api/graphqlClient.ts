import axios, { AxiosError } from 'axios'
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

// Chỉ các lỗi mà làm mới token có thể cứu được mới nằm ở đây.
//
// `FORBIDDEN` cố tình KHÔNG có mặt: nó nghĩa là "đã đăng nhập nhưng không đủ quyền" —
// refresh không đổi được điều đó, mà đường đi bên dưới lại biến lỗi này thành 401 giả rồi
// chạy refresh; refresh hỏng là `clearSession` đá người dùng về `/login` chỉ vì họ mở một
// màn không có quyền. Để `FORBIDDEN` rơi xuống nhánh lỗi GraphQL thường thì `toApiError`
// hiện được message tiếng Việt do BE trả về.
const AUTH_CLASSIFICATIONS = new Set(['UNAUTHORIZED', 'UNAUTHENTICATED'])

function hasAuthError(errors: GraphQLErrorResponse[] | undefined) {
  return !!errors?.some((e) => {
    const c = (e.extensions as { classification?: string } | undefined)?.classification
    return c !== undefined && AUTH_CLASSIFICATIONS.has(c)
  })
}

graphqlApiClient.interceptors.response.use((response) => {
  if (hasAuthError((response.data as GraphQLResponse<unknown>).errors)) {
    throw new AxiosError(
      'GraphQL authorization error', 
      AxiosError.ERR_BAD_REQUEST, 
      response.config, 
      response.request, 
      { ...response, status: 401, statusText: 'Unauthorized' },
    )
  }
  return response
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