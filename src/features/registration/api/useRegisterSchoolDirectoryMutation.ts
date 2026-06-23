import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'
import type { RegisterSchoolDirectoryRequest } from '../types'

type ApiResponse<T> = {
  data: T
  message: string
}

/**
 * Cùng một endpoint, backend tự quyết định path OTP hay Document và chỉ báo
 * cho FE qua `data.message`. FE đọc message để rẽ nhánh.
 */
export type RegisterSchoolDirectoryResult = {
  message: string
}

export async function registerSchoolDirectory(
  payload: RegisterSchoolDirectoryRequest,
) {
  const response = await apiClient.post<
    ApiResponse<RegisterSchoolDirectoryResult>
  >('/v1/auth/register-school-directory', payload)

  return response.data.data
}

/**
 * `true` nếu backend đi vào OTP path (cần chuyển sang màn nhập OTP),
 * `false` nếu đi vào Document path (chờ admin duyệt). Match keyword "OTP"
 * thay vì so khớp tuyệt đối để bớt giòn khi BE đổi câu chữ.
 */
export function isOtpPathMessage(message: string) {
  return message.toUpperCase().includes('OTP')
}

export function useRegisterSchoolDirectoryMutation() {
  return useMutation({
    mutationFn: registerSchoolDirectory,
  })
}
