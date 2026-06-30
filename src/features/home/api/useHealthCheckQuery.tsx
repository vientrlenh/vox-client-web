import { apiClient } from "@/shared/api"


export interface HealthCheckResponse {
    status: string
}

export function useHealthCheckQuery() {
    return null
}

export async function fetchHealthStatus() {
    return await apiClient.get('/health')
}