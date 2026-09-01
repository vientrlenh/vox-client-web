import { useAppSelector } from '@/app/store/hooks'
import { getPostLoginPath } from './postLoginPath'

/**
 * Đường mặc định của người đang đăng nhập, hoặc `null` khi chưa đăng nhập.
 *
 * Cũng trả `null` cho người đã đăng nhập nhưng mang vai trò chưa được hỗ trợ — nơi gọi phải coi
 * đó là "không có đích nào để đi" chứ không phải "chưa đăng nhập", nếu không sẽ đẩy họ tới một
 * đường dẫn không tồn tại rồi vòng lại chính chỗ vừa đi ra.
 */
export function useDashboardPath() {
  const user = useAppSelector((state) => state.auth.user)

  return user ? getPostLoginPath(user.roles) : null
}
