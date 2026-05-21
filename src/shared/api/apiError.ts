import axios from 'axios'

export type ApiError = {
  details?: unknown
  message: string
  status?: number
}

type ApiErrorResponse = {
  details?: unknown
  error?: string
  message?: string
}

export function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const responseData = error.response?.data

    return {
      details: responseData?.details ?? responseData,
      message: responseData?.message ?? responseData?.error ?? error.message,
      status: error.response?.status,
    }
  }

  if (error instanceof Error) {
    return {
      message: error.message,
    }
  }

  return {
    details: error,
    message: 'Unexpected API error',
  }
}
