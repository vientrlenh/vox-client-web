/**
 * Đích mặc định của một phiên vừa mở, theo vai trò.
 *
 * Trả `null` khi không vai trò nào trong danh sách được hỗ trợ — nơi gọi phải coi đó là đăng nhập
 * THẤT BẠI và xoá token, chứ không phải đưa về trang chủ: tài khoản đăng nhập được nhưng không có
 * màn hình nào để vào là trạng thái không có lối thoát.
 *
 * Thứ tự kiểm tra là thứ tự ưu tiên khi một người mang nhiều vai trò.
 */
export function getPostLoginPath(roles: readonly string[]) {
  if (roles.includes('SYSTEM_ADMIN')) {
    return '/system-admin/dashboard'
  }

  if (roles.includes('SCHOOL_ADMIN')) {
    return '/school-admin/dashboard'
  }

  if (roles.includes('TEACHER')) {
    return '/teacher/dashboard'
  }

  if (roles.includes('STUDENT')) {
    return '/student/exams'
  }

  return null
}
