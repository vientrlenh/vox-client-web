import { useEffect, useState } from 'react'

/**
 * Trì hoãn một giá trị đang thay đổi liên tục.
 *
 * <p>Dùng cho bộ điểm gửi sang `/grade/preview`: giá trị nằm trong queryKey nên
 * truyền thẳng state của ô nhập sẽ thành một request mỗi ký tự.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timeoutId)
  }, [value, delayMs])

  return debounced
}
