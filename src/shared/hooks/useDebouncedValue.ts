import { useEffect, useState } from 'react'

/**
 * Trì hoãn một giá trị đang thay đổi liên tục.
 *
 * <p>Dùng cho các giá trị nằm trong queryKey — ô tìm kiếm, bộ điểm gửi sang
 * `/regrade/preview` — vì truyền thẳng state của ô nhập sẽ thành một request mỗi ký tự.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timeoutId)
  }, [value, delayMs])

  return debounced
}
