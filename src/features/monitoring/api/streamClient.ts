import { toApiError } from "@/shared/api";
import { appConfig } from "@/shared/config/env";
import axios from "axios";
import type { ActiveSchedule, ScheduleStreamRecord } from "../types";

export const streamApiClient = axios.create({
    baseURL: appConfig.streamApiUrl
})

streamApiClient.interceptors.response.use(
    (response) => response, 
    (error: unknown) => Promise.reject(toApiError(error))
)

export async function fetchActiveSchedules(streamToken: string): Promise<ActiveSchedule[]> {
    const response = await streamApiClient.get<ActiveSchedule[]>('/schedules/active', {
        params: {
            token: streamToken
        }
    })
    return response.data
}

/**
 * Mọi luồng ca thi ĐÃ TỪNG có, kể cả đã kết thúc.
 *
 * <p>Khác `snapshot` của WebSocket ở chỗ đó, và khác biệt ấy là tất cả: snapshot trả lời "ai đang
 * lên sóng", nên nạp lại trang giữa ca là mọi học viên đã rớt biến mất khỏi phòng cùng với đường vào
 * đoạn ghi của họ -- dù đoạn ghi vẫn còn được giữ và vẫn phát được.
 */
export async function fetchScheduleStreams(
    scheduleId: string,
    streamToken: string,
): Promise<ScheduleStreamRecord[]> {
    const response = await streamApiClient.get<ScheduleStreamRecord[]>(
        `/schedules/${encodeURIComponent(scheduleId)}/streams`,
        { params: { token: streamToken } },
    )
    return response.data
}

export function buildMonitorSocketUrl(scheduleId: string, streamToken: string): string {
    const params = new URLSearchParams({
        scheduleId,
        token: streamToken
    })
    return `${appConfig.streamWsUrl}/ws/monitor?${params.toString()}`
}
