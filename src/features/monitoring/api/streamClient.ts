import { toApiError } from "@/shared/api";
import { appConfig } from "@/shared/config/env";
import axios from "axios";
import type { ActiveSchedule } from "../types";

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

export function buildMonitorSocketUrl(scheduleId: string, streamToken: string): string {
    const params = new URLSearchParams({
        scheduleId,
        token: streamToken
    })
    return `${appConfig.streamWsUrl}/ws/monitor?${params.toString()}`
}
