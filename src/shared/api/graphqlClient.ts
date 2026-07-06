// src/shared/api/graphqlClient.ts

import axios from 'axios';
import { appConfig } from '@/shared/config/env';
import type { ApiError } from './apiError';
import { getAuthTokens } from './authTokenStorage';
import { toApiError } from './apiError';
import { createRawErrorInterceptorInstaller } from './rawErrorInterceptor'

type GraphQLErrorResponse = {
  extensions?: unknown;
  message?: string;
  path?: Array<number | string>;
};

type GraphQLResponse<TData> = {
  data?: TData;
  errors?: GraphQLErrorResponse[];
};

type GraphQLVariables = Record<string, unknown>;

export const graphqlApiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});
  withCredentials: true
})

// 1. Interceptor Request: Tự động gắn Token vào mọi request
graphqlApiClient.interceptors.request.use((config) => {
  const tokens = getAuthTokens();

  if (tokens?.accessToken) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  }

  return config;
});

// 2. Interceptor Response: Bắt lỗi HTTP (401, 403, 500...) và map về ApiError
graphqlApiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(toApiError(error)),
);
export const addGraphqlClientRawErrorInterceptor = createRawErrorInterceptorInstaller(graphqlApiClient)

// 3. Hàm map mảng errors của GraphQL thành chuẩn ApiError chung của dự án
function toGraphQLError(errors: GraphQLErrorResponse[]): ApiError {
  const message = errors
    .map((error) => error.message)
    .filter(Boolean)
    .join('\n'); // Nếu BE ném 2, 3 lỗi cùng lúc thì nối lại bằng dấu xuống dòng

  return {
    details: errors,
    message: message || 'GraphQL request failed',
  };
}

// 4. Hàm Gọi API Chính
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
  );

  // Bắt lỗi Validation / Business Logic từ Backend ném về
  if (response.data.errors?.length) {
    throw toGraphQLError(response.data.errors);
  }

  // Trường hợp không có error nhưng data lại rỗng
  if (!response.data.data) {
    throw {
      message: 'GraphQL response did not include data',
    } as ApiError;
  }

  return response.data.data;
}