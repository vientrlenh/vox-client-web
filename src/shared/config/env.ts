export const appConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
  enableQueryDevtools: import.meta.env.DEV,
  graphqlEndpoint: import.meta.env.VITE_GRAPHQL_ENDPOINT ?? '/graphql',
  schoolId: import.meta.env.VITE_SCHOOL_ID ?? '',
} as const
