import { apiClient, type ApiResponse } from "@/shared/api";
import type { StreamTokenRequest } from "../types";
import { useQuery } from "@tanstack/react-query";

export const monitorTokenQueryKeys = {
    all: ['monitorToken'] as const
}

type MonitorTokenParams = {
    examId: string 
    roomIds?: string[]
}

async function fetchMonitorToken(params: MonitorTokenParams): Promise<string> {
    const payload: StreamTokenRequest = {
        examId: params.examId, 
        roomIds: params.roomIds ?? [], 
        streamTypes: [],
    }
    const response = await apiClient.post<ApiResponse<string>>('/v1/streams/token', payload)
    return response.data.data
}

export function useMonitorToken(params: MonitorTokenParams) {
    return useQuery({
        queryKey: [...monitorTokenQueryKeys.all, params.examId, params.roomIds ?? 'all'],
        queryFn: () => fetchMonitorToken(params), 
        enabled: Boolean(params.examId),
        staleTime: 60_000, 
        refetchInterval: 4 * 60_000,
        refetchOnWindowFocus: false, 
        retry: 1,
    })
}