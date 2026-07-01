import { toApiError } from "@/shared/api";
import { appConfig } from "@/shared/config/env";
import axios from "axios";
import type { ActiveRoom } from "../types";

export const streamApiClient = axios.create({
    baseURL: appConfig.streamApiUrl
})

streamApiClient.interceptors.response.use(
    (response) => response, 
    (error: unknown) => Promise.reject(toApiError(error))
)

export async function fetchActiveRooms(streamToken: string): Promise<ActiveRoom[]> {
    const response = await streamApiClient.get<ActiveRoom[]>('/rooms/active', {
        params: {
            token: streamToken
        }
    })
    return response.data
}

export function buildMonitorSocketUrl(roomId: string, streamToken: string): string {
    const params = new URLSearchParams({
        roomId: roomId, 
        token: streamToken
    })
    return `${appConfig.streamWsUrl}/ws/monitor?${params.toString()}`
}