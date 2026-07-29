import { useExamDirectoryProctorsQuery, type ExamDirectoryUser } from '../../api/examDirectoryQueries'
import { ExamDirectoryUserPicker } from '../ExamDirectoryUserPicker'
import { USER_PICKER_PAGE_SIZE, useUserPickerState } from '../useUserPickerState'

type ProctorPickerModalProps = {
  examId: string
  excludeUserIds: string[]
  onClose: () => void
  onSelect: (teacher: ExamDirectoryUser) => void
}

export function ProctorPickerModal({ examId, excludeUserIds, onClose, onSelect }: ProctorPickerModalProps) {
  const state = useUserPickerState()
  const teachersQuery = useExamDirectoryProctorsQuery(
    examId,
    state.page,
    USER_PICKER_PAGE_SIZE,
    state.debouncedKeyword,
  )

  return (
    <ExamDirectoryUserPicker
      countLabel="giáo viên"
      emptyLabel="Không tìm thấy giáo viên phù hợp."
      excludeUserIds={excludeUserIds}
      loadingLabel="Đang tải danh sách giáo viên…"
      onClose={onClose}
      onSelect={onSelect}
      searchPlaceholder="Tìm giáo viên theo tên hoặc email…"
      state={state}
      title="Thêm giám thị"
      titleId="proctor-picker-title"
      usersQuery={teachersQuery}
    />
  )
}
