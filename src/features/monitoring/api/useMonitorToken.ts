import { apiClient, type ApiResponse } from "@/shared/api";
import type { MonitorToken } from "../types";
import { useQuery } from "@tanstack/react-query";

export const monitorTokenQueryKeys = {
    all: ['monitorToken'] as const
}

async function fetchMonitorToken(): Promise<MonitorToken> {
    const response = await apiClient.get<ApiResponse<MonitorToken>>('/v1/streams/token')
    return response.data.data
}

export function useMonitorToken() {
    return useQuery({
        queryKey: monitorTokenQueryKeys.all, 
        queryFn: fetchMonitorToken, 
        staleTime: 60_000, 
        refetchInterval: 4 * 60_000, 
        refetchOnWindowFocus: false, 
        retry: 1,
    })
}