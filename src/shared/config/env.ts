export const appConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
  enableQueryDevtools: import.meta.env.DEV,
  graphqlPath: import.meta.env.VITE_GRAPHQL_PATH ?? '/graphql',
} as const
