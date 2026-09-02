import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { User } from '@/features/school/types'
import { graphQLRequest } from '@/shared/api'
import { profileQueryKeys } from './useProfileQuery'

/**
 * Sửa hồ sơ của CHÍNH mình. Không có userId -- backend luôn lấy id từ phiên đăng nhập, nên không
 * tồn tại đường sửa hồ sơ người khác qua đây (sửa người khác đi updateSchoolUser).
 *
 * Ngữ nghĩa PATCH: KHÔNG gửi field = giữ nguyên, gửi null = XOÁ. Backend phân biệt hai trường hợp
 * bằng Map.containsKey chứ không phải bằng giá trị null, nên chỗ này phải gửi đúng những field
 * người dùng thực sự đổi. Gửi thừa cả form là biến mọi ô bỏ trống thành lệnh xoá.
 *
 * Vì vậy kiểu là Partial: field vắng mặt và field mang null KHÁC nhau, và cả hai đều hợp lệ.
 */
export type UpdateProfileInput = Partial<{
  address: string | null
  avatarUrl: string | null
  dateOfBirth: string | null
  fullName: string | null
  phone: string | null
}>

const UPDATE_PROFILE_MUTATION = `
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      id
      email
      phone
      fullName
      gender
      dateOfBirth
      address
      avatarUrl
      createdAt
      updatedAt
    }
  }
`

async function updateProfile(input: UpdateProfileInput) {
  const data = await graphQLRequest<{ updateProfile: User }>(UPDATE_PROFILE_MUTATION, { input })
  return data.updateProfile
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (updated) => {
      // Mutation trả về đúng User sau khi sửa, nên ghi thẳng vào cache thay vì invalidate rồi đợi
      // một vòng request nữa. Ảnh đại diện hiện ở layout lẫn trang này, không nên nháy giữa chừng.
      queryClient.setQueryData(profileQueryKeys.me(), updated)
    },
  })
}
