import '@testing-library/jest-dom'
import { BroadcastChannel } from 'node:worker_threads'
import { TextDecoder, TextEncoder } from 'node:util'

Object.assign(globalThis, {
  TextDecoder,
  TextEncoder,
})

/**
 * jsdom KHÔNG có `BroadcastChannel`, còn mọi trình duyệt được hỗ trợ thì có. Thiếu nó thì lớp
 * đồng bộ đa tab (`features/auth/session/authChannel.ts`) im lặng rơi vào nhánh "trình duyệt
 * không hỗ trợ" — tức là test đăng xuất/đăng nhập sẽ xanh mà không hề chứng minh được điều nó
 * nói là đang chứng minh. Bản của Node giao tin giữa các instance cùng tên trong cùng tiến trình,
 * đủ để đóng vai hai tab.
 */
if (typeof globalThis.BroadcastChannel === 'undefined') {
  /**
   * `unref()` là bắt buộc, không phải dọn dẹp cho đẹp: kênh của Node giữ event loop sống, nên
   * một kênh không được đóng sẽ khiến jest chạy xong toàn bộ test rồi TREO thay vì thoát. Kênh
   * đã unref vẫn giao tin bình thường trong suốt lượt chạy.
   */
  class TestBroadcastChannel extends BroadcastChannel {
    constructor(name: string) {
      super(name)
      this.unref()
    }
  }

  Object.assign(globalThis, { BroadcastChannel: TestBroadcastChannel })
}

/**
 * jsdom dựng được `Blob` nhưng KHÔNG có `Blob.prototype.text()` — trình duyệt thật có API
 * này từ 2019. Thiếu nó thì mọi đường xử lý blob (đọc body lỗi của response
 * `responseType: 'blob'`) im lặng rơi vào nhánh fallback trong test, đúng nhánh mà test
 * đang muốn chứng minh là KHÔNG chạy.
 */
if (typeof Blob !== 'undefined' && typeof Blob.prototype.text !== 'function') {
  Blob.prototype.text = function text(this: Blob) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(reader.error)
      reader.onload = () => resolve(String(reader.result))
      reader.readAsText(this)
    })
  }
}
