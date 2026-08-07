import '@testing-library/jest-dom'
import { TextDecoder, TextEncoder } from 'node:util'

Object.assign(globalThis, {
  TextDecoder,
  TextEncoder,
})

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
