import type { AxiosError, AxiosInstance, AxiosResponse } from "axios";
import { toApiError } from "./apiError";

export function createRawErrorInterceptorInstaller(client: AxiosInstance) {
    let baseErrorInterceptorId = client.interceptors.response.use(
        (response) => response, 
        (error: unknown) => Promise.reject(toApiError(error))
    )

    return function addRawErrorInterceptor(
        onRejected: (error: AxiosError) => Promise<AxiosResponse>, 
    ) {
        client.interceptors.response.eject(baseErrorInterceptorId)

        const interceptorId = client.interceptors.response.use(
            (response) => response, 
            onRejected
        )

        baseErrorInterceptorId = client.interceptors.response.use(
            (response) => response, 
            (error: unknown) => Promise.reject(toApiError(error))
        )

        return () => {
            client.interceptors.response.eject(interceptorId)
        }
    }
}