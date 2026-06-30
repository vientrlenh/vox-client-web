export const appConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
  enableQueryDevtools: import.meta.env.DEV,
  graphqlEndpoint: import.meta.env.VITE_GRAPHQL_ENDPOINT ?? '/graphql',
  streamApiUrl: import.meta.env.VITE_STREAM_API_URL ?? '',
  streamWsUrl: import.meta.env.VITE_STREAM_WS_URL ?? '',
} as const
