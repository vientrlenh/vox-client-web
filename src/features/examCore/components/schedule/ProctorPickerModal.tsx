import { useMemo } from 'react'
import { useExamDirectoryProctorsQuery, type ExamDirectoryUser } from '../../api/examDirectoryQueries'
import { useProctorBusySlotsQuery } from '../../api/queries'
import { formatDateTime } from '../../types'
import { ExamDirectoryUserPicker } from '../ExamDirectoryUserPicker'
import { USER_PICKER_PAGE_SIZE, useUserPickerState } from '../useUserPickerState'

type ProctorPickerModalProps = {
  examId: string
  excludeUserIds: string[]
  onClose: () => void
  onSelect: (teacher: ExamDirectoryUser) => void
  /** Ca thi đang xếp giám thị — dùng để hỏi backend ai đang bận đúng khung giờ này. */
  scheduleId: string
}

export function ProctorPickerModal({
  examId,
  excludeUserIds,
  onClose,
  onSelect,
  scheduleId,
}: ProctorPickerModalProps) {
  const state = useUserPickerState()
  const teachersQuery = useExamDirectoryProctorsQuery(
    examId,
    state.page,
    USER_PICKER_PAGE_SIZE,
    state.debouncedKeyword,
  )

  // Chỉ hỏi về đúng những giáo viên đang hiển thị — trang picker tối đa vài chục người.
  const visibleTeacherIds = useMemo(
    () => (teachersQuery.data?.content ?? []).map((teacher) => teacher.userId),
    [teachersQuery.data],
  )
  const busySlotsQuery = useProctorBusySlotsQuery(scheduleId, visibleTeacherIds)

  // Làm mờ chứ không lọc bỏ: người dùng cần biết giáo viên có tồn tại nhưng đang bận, và vì sao.
  // Đây chỉ là lớp tiện dụng — backend vẫn chặn khi submit.
  const disabledReasonByUserId = useMemo(() => {
    const reasons = new Map<string, string>()
    for (const slot of busySlotsQuery.data ?? []) {
      if (reasons.has(slot.teacherId)) {
        continue
      }
      reasons.set(
        slot.teacherId,
        `Đang gác ca thi khác: ${formatDateTime(slot.startDate)} – ${formatDateTime(slot.endDate)}`,
      )
    }
    return reasons
  }, [busySlotsQuery.data])

  return (
    <ExamDirectoryUserPicker
      countLabel="giáo viên"
      disabledReasonByUserId={disabledReasonByUserId}
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
