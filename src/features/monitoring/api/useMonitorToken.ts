import { apiClient, type ApiResponse } from "@/shared/api";
import type { StreamTokenRequest } from "../types";
import { useQuery } from "@tanstack/react-query";

export const monitorTokenQueryKeys = {
    all: ['monitorToken'] as const
}

type MonitorTokenParams = {
    examId: string 
    scheduleIds?: string[]
}

async function fetchMonitorToken(params: MonitorTokenParams): Promise<string> {
    const payload: StreamTokenRequest = {
        examId: params.examId, 
        scheduleIds: params.scheduleIds ?? [],
    }
    const response = await apiClient.post<ApiResponse<string>>('/v1/streams/monitor/token', payload)
    return response.data.data
}

export function useMonitorToken(params: MonitorTokenParams) {
    return useQuery({
        queryKey: [...monitorTokenQueryKeys.all, params.examId, params.scheduleIds ?? 'all'],
        queryFn: () => fetchMonitorToken(params), 
        enabled: Boolean(params.examId),
        staleTime: 60_000,
        refetchInterval: 4 * 60_000,
        // Bắt buộc: token sống 5 phút (MONITOR_TOKEN_TTL bên IssueMonitorTokenUseCase) nên nhịp 4
        // phút chỉ dư 1 phút. Mặc định của react-query là DỪNG nhịp khi tab bị ẩn, và
        // refetchOnWindowFocus:false nghĩa là quay lại tab cũng không bù - chỉ cần tab khuất đúng
        // một nhịp là token chết, HLS 401 và luồng đứng hẳn. Giám thị chuyển cửa sổ là chuyện
        // thường, nên nhịp này phải chạy bất kể tab có hiện hay không.
        refetchIntervalInBackground: true,
        refetchOnWindowFocus: false,
        retry: 1,
    })
}
