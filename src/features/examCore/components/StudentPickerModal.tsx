import { useExamDirectoryStudentsQuery, type ExamDirectoryUser } from '../api/examDirectoryQueries'
import { ExamDirectoryUserPicker } from './ExamDirectoryUserPicker'
import { USER_PICKER_PAGE_SIZE, useUserPickerState } from './useUserPickerState'

type StudentPickerModalProps = {
  examId: string
  excludeUserIds: string[]
  onClose: () => void
  onSelect: (student: ExamDirectoryUser) => void
}

export function StudentPickerModal({ examId, excludeUserIds, onClose, onSelect }: StudentPickerModalProps) {
  const state = useUserPickerState()
  const studentsQuery = useExamDirectoryStudentsQuery(
    examId,
    state.page,
    USER_PICKER_PAGE_SIZE,
    state.debouncedKeyword,
  )

  return (
    <ExamDirectoryUserPicker
      countLabel="học sinh"
      emptyLabel="Không tìm thấy học sinh phù hợp."
      excludeUserIds={excludeUserIds}
      loadingLabel="Đang tải danh sách học sinh…"
      onClose={onClose}
      onSelect={onSelect}
      searchPlaceholder="Tìm học sinh theo tên hoặc email…"
      state={state}
      title="Thêm thí sinh"
      titleId="student-picker-title"
      usersQuery={studentsQuery}
    />
  )
}
