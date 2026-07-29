export {
  type ApiResponse,
  type MutationResult,
  requireSchoolId,
} from '@/shared/api'

/**
 * Đổi lỗi thô của tầng API thành câu tiếng Việt hiển thị được. `requireSchoolId()` ném
 * thông báo kỹ thuật khi access token thiếu `schoolId`, nên phải dịch lại trước khi
 * đưa lên UI.
 */
export function getClassErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    if (
      error.message.includes('Missing schoolId in access token') ||
      error.message.includes('Missing VITE_SCHOOL_ID')
    ) {
      return 'Chưa xác định được trường học hiện tại. Vui lòng đăng nhập lại.'
    }

    return error.message
  }

  return undefined
}
