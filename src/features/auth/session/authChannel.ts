const AUTH_CHANNEL_NAME = 'vox.auth'

/**
 * Hai thay đổi mà các tab khác BẮT BUỘC phải biết ngay:
 *
 * - `anonymous`: phiên đã kết thúc. Không có tin này thì tab còn mở vẫn hiện nguyên giao diện đã
 *   đăng nhập và access token trong đó còn dùng được thêm tối đa 15 phút (JWT không mang claim
 *   phiên nào, backend chỉ kiểm chữ ký). Trên máy phòng máy dùng chung, đó là 15 phút người kế
 *   tiếp đọc được dữ liệu của người vừa bấm đăng xuất.
 * - `authenticated`: có người vừa đăng nhập ở tab khác. Đáng lo không phải chuyện tab cũ hiển thị
 *   chậm, mà là đăng nhập bằng tài khoản KHÁC: tab cũ sẽ vẽ giao diện của người trước trong khi
 *   mọi request nó gửi đi đã mang token của người mới.
 *
 * Refresh token cố tình KHÔNG có tin nhắn riêng: localStorage vốn dùng chung giữa các tab nên tab
 * nào cũng tự đọc được access token mới ở request kế tiếp. Chỉ đổi danh tính và kết thúc phiên
 * mới cần báo.
 */
export type AuthBroadcast =
  | { accessToken: string; type: 'authenticated' }
  | { type: 'anonymous' }

let channel: BroadcastChannel | null | undefined

/**
 * Dùng CHUNG một đối tượng BroadcastChannel cho cả gửi lẫn nhận, không phải để tiết kiệm.
 * Theo chuẩn, tin nhắn không được giao lại cho chính đối tượng đã gửi nó — nhờ vậy tab phát
 * không tự nghe lại tin của mình, và vòng lặp "nhận rồi phát lại" không thể xảy ra ngay từ đầu.
 */
function getChannel() {
  if (channel === undefined) {
    channel =
      typeof globalThis.BroadcastChannel === 'undefined'
        ? null
        : new globalThis.BroadcastChannel(AUTH_CHANNEL_NAME)
  }

  return channel
}

function isAuthBroadcast(value: unknown): value is AuthBroadcast {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const message = value as Partial<AuthBroadcast>

  if (message.type === 'anonymous') {
    return true
  }

  return (
    message.type === 'authenticated' &&
    typeof (message as { accessToken?: unknown }).accessToken === 'string'
  )
}

export function publishAuthBroadcast(message: AuthBroadcast) {
  getChannel()?.postMessage(message)
}

/**
 * Trả về hàm huỷ đăng ký. Trình duyệt không có BroadcastChannel thì đây là no-op và ứng dụng chạy
 * đúng như trước khi có đồng bộ đa tab — kém hơn, không hỏng.
 */
export function subscribeToAuthBroadcast(
  onMessage: (message: AuthBroadcast) => void,
) {
  const activeChannel = getChannel()

  if (!activeChannel) {
    return () => {}
  }

  function handleMessage(event: MessageEvent<unknown>) {
    // Tin nhắn đến từ một bản deploy khác của chính trang này (tab cũ chưa tải lại) hoàn toàn có
    // thể mang hình dạng khác — kiểm tra trước khi tin.
    if (isAuthBroadcast(event.data)) {
      onMessage(event.data)
    }
  }

  activeChannel.addEventListener('message', handleMessage)

  return () => {
    activeChannel.removeEventListener('message', handleMessage)
  }
}

/** Chỉ dùng cho test: dựng lại kênh sau khi jsdom thay global giữa các file test. */
export function resetAuthChannelForTests() {
  channel?.close()
  channel = undefined
}
