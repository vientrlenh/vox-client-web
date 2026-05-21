import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/shared/api/apiClient'

export type HealthCheckResponse = {
  status: string
}

export const homeQueryKeys = {
  all: ['home'] as const,
  health: () => [...homeQueryKeys.all, 'health'] as const,
}

export function useHealthCheckQuery() {
  return useQuery({
    queryFn: async () => {
      const response = await apiClient.get<HealthCheckResponse>('/health')

      return response.data
    },
    queryKey: homeQueryKeys.health(),
  })
}
