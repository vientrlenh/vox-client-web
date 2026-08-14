/*
 * Service worker nhận thông báo đẩy khi tab đã đóng hoặc chạy nền.
 *
 * File này nằm trong `public/` nên được phục vụ nguyên văn ở gốc site, cả khi `pnpm dev`
 * lẫn sau khi build -- service worker phải ở gốc thì scope mới phủ toàn ứng dụng.
 *
 * Vì không đi qua Vite, nó KHÔNG đọc được `import.meta.env`. Cấu hình Firebase vì thế
 * được truyền qua query string lúc đăng ký (xem `pushDevice.ts`), thay vì chép cứng vào
 * đây -- chép cứng nghĩa là mỗi lần đổi Firebase project phải sửa hai nơi, và nơi thứ hai
 * chắc chắn sẽ bị quên.
 *
 * Bản compat được nạp từ gstatic vì service worker không dùng được ES module import của
 * gói npm. Số phiên bản phải khớp với `firebase` trong package.json khi nâng cấp.
 */
importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js')
importScripts(
  'https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js',
)

const params = new URL(self.location.href).searchParams

firebase.initializeApp({
  apiKey: params.get('apiKey'),
  appId: params.get('appId'),
  messagingSenderId: params.get('messagingSenderId'),
  projectId: params.get('projectId'),
})

/*
 * Chỉ cần khởi tạo, không cần `onBackgroundMessage`: backend gửi kèm khối `notification`
 * (xem FcmNotificationService.buildMessage), nên trình duyệt tự hiển thị. Thêm handler
 * rồi gọi `showNotification` nữa sẽ ra hai thông báo cho cùng một sự kiện.
 */
firebase.messaging()
