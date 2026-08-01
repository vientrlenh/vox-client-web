// State phân trang + tìm kiếm dùng chung của hai picker người dùng trong kỳ thi.
// Tách khỏi `ExamDirectoryUserPicker.tsx` để file đó chỉ export component (react-refresh).

import { useState } from 'react'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'

export const USER_PICKER_PAGE_SIZE = 8
const SEARCH_DEBOUNCE_MS = 300

export function useUserPickerState() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const debouncedKeyword = useDebouncedValue(keyword, SEARCH_DEBOUNCE_MS)

  return { debouncedKeyword, keyword, page, setKeyword, setPage }
}

export type UserPickerState = ReturnType<typeof useUserPickerState>
