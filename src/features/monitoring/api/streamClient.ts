import { toApiError } from "@/shared/api";
import { appConfig } from "@/shared/config/env";
import axios from "axios";
import type { ActiveSchedule, ScheduleStreamRecord } from "../types";

export const streamApiClient = axios.create({
    baseURL: appConfig.streamApiUrl,
    // Không có timeout thì axios chờ tới khi TCP tự bỏ cuộc, vốn tính bằng phút. Cả hai lời gọi
    // dưới đây đều bị POLL lại theo nhịp, nên trên một đường truyền chậm chúng không hỏng mà CHỒNG
    // lên nhau: mỗi nhịp thêm một request treo, không cái nào chịu chết.
    //
    // Đặt ở instance này chứ không phải apiClient dùng chung: ở đây chỉ có hai lời đọc JSON nhỏ từ
    // vox-streaming, không có upload hay truy vấn dài nào để một hạn chung làm hỏng.
    timeout: 10_000,
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
