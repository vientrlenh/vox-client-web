import { refreshAuthTokens } from '../api/refreshAuthTokens'
import {
  decodeAccessToken,
  getAuthTokens,
  isAccessTokenExpired,
} from './authSession'

const AUTH_REFRESH_LOCK = 'vox.auth.refresh'

let inFlight: Promise<string> | null = null

/**
 * Web Locks không có thì chạy thẳng: mất phần bảo vệ đa tab, nhưng vẫn đúng như ứng dụng đã chạy
 * trước khi có khoá này. Không có API nào khác thay thế được — `localStorage` mutex tự chế thì
 * không có tính nguyên tử và không tự nhả khi tab bị đóng giữa chừng.
 */
async function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  const locks = globalThis.navigator?.locks

  if (!locks) {
    return task()
  }

  return locks.request(AUTH_REFRESH_LOCK, task)
}

/**
 * Lấy access token mới, đảm bảo TẠI MỘT THỜI ĐIỂM chỉ có đúng một lượt xoay token trên toàn bộ
 * trình duyệt.
 *
 * Đây không phải tối ưu hoá. Refresh token của vox dùng MỘT LẦN rồi xoay, và
 * `RefreshUseCase.validateValidRequest` coi việc dùng lại một token đã tiêu là dấu hiệu bị đánh
 * cắp: nó THU HỒI cả device session. Hai tab cùng đọc một giá trị cookie rồi cùng gửi đi thì tab
 * thua cuộc kích hoạt đúng nhánh đó, và cả hai tab bị đăng xuất — mất cả phiên chỉ vì mở hai tab.
 *
 * Hai lớp chặn, mỗi lớp lo một phạm vi:
 * - `inFlight` gộp các lời gọi trong CÙNG một tab (interceptor 401 hàng loạt là chuyện thường).
 * - Web Locks xếp hàng giữa CÁC tab, thứ mà biến trong module không với tới được.
 */
export function refreshSessionOnce(): Promise<string> {
  if (!inFlight) {
    inFlight = withRefreshLock(refreshWithinLock).finally(() => {
      inFlight = null
    })
  }

  return inFlight
}

/**
 * Vào được tới đây nghĩa là đã tới lượt mình. Nhưng trong lúc xếp hàng, tab đi trước có thể đã
 * xoay xong và ghi token mới vào localStorage — dùng lại nó thay vì xoay thêm một vòng nữa.
 *
 * Bỏ bước này thì N tab cùng nhận 401 sẽ tạo ra N vòng xoay nối đuôi nhau. Không sai (mỗi lượt
 * gửi đi cookie mới nhất nên không tab nào chạm vào nhánh thu hồi), chỉ là lãng phí — mà màn giám
 * sát thi thì mở nhiều tab là chuyện bình thường.
 */
async function refreshWithinLock(): Promise<string> {
  const tokens = getAuthTokens()
  const user = tokens ? decodeAccessToken(tokens.accessToken) : null

  if (tokens && user && !isAccessTokenExpired(user)) {
    return tokens.accessToken
  }

  const refreshed = await refreshAuthTokens()

  return refreshed.accessToken
}
