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
  // Riêng lỗi bean-validation (@Valid, BE ValidationErrorResponse) trả thêm field này:
  // { field: message } cho từng field không hợp lệ. `message` ở BE cho case này bị hardcode
  // thành mã lỗi "BAD_REQUEST" (không phải câu người đọc được) nên phải ưu tiên đọc từ đây,
  // không được dùng `message`/`error` khi `errors` có dữ liệu.
  errors?: Record<string, string>
}

export function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const responseData = error.response?.data
    const fieldErrors = responseData?.errors ? Object.values(responseData.errors) : []

    return {
      details: responseData?.details ?? responseData,
      message:
        fieldErrors.length > 0
          ? fieldErrors.join('; ')
          : (responseData?.message ?? responseData?.error ?? error.message),
      status: error.response?.status,
    }
  }

  if (isApiError(error)) {
    return error
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

/**
 * "Đăng nhập rồi nhưng không đủ quyền" — tách khỏi các lỗi khác vì cách xử lý khác hẳn: thử lại
 * không cứu được, mà im lặng thì người dùng tưởng dữ liệu không tồn tại.
 *
 * REST trả `status: 403`; GraphQL không có mã HTTP nên `graphQLRequest` đính nguyên mảng `errors`
 * vào `details`, phân loại nằm ở `extensions.classification` (BE map `ForbiddenException` sang
 * `ErrorType.FORBIDDEN` trong `GlobalExceptionResolver`).
 */
export function isForbiddenApiError(error: unknown): boolean {
  const apiError = toApiError(error)

  if (apiError.status === 403) {
    return true
  }

  if (!Array.isArray(apiError.details)) {
    return false
  }

  return apiError.details.some((detail) => {
    const extensions = (detail as { extensions?: { classification?: string } } | null)?.extensions
    return extensions?.classification === 'FORBIDDEN'
  })
}

/**
 * "Trường chưa có gói subscription đang hoạt động" (BE `PlanLimitExceededException`) — tách khỏi
 * các lỗi khác vì cách xử lý khác hẳn: thử lại không cứu được, cần điều hướng người dùng đi
 * gia hạn/đăng ký gói thay vì toast lỗi chung chung.
 *
 * REST trả `status: 422` kèm `{ error: "PLAN_LIMIT_EXCEEDED", message: "..." }` (xem
 * `GlobalExceptionHandler`); GraphQL không có mã HTTP riêng nên phân loại nằm ở
 * `extensions.code` (xem `GlobalExceptionResolver`), giống cách `isForbiddenApiError` đọc
 * `extensions.classification`.
 */
export function isPlanLimitExceededApiError(error: unknown): boolean {
  const apiError = toApiError(error)

  if (apiError.status === 422) {
    const details = apiError.details as { error?: string } | undefined
    if (details?.error === 'PLAN_LIMIT_EXCEEDED') {
      return true
    }
  }

  if (!Array.isArray(apiError.details)) {
    return false
  }

  return apiError.details.some((detail) => {
    const extensions = (detail as { extensions?: { code?: string } } | null)?.extensions
    return extensions?.code === 'PLAN_LIMIT_EXCEEDED'
  })
}

function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    !(error instanceof Error) &&
    typeof (error as ApiError).message === 'string'
  )
}
