import { useState } from 'react'
import { DoorOpen, X } from 'lucide-react'
import { formatDateTime, formatDurationSeconds, toDateTimeLocalValue, type SchoolRoomLite } from '../../types'
import { RoomPickerModal } from './RoomPickerModal'

type CreateScheduleModalProps = {
  /**
   * Khung mở/đóng của kỳ thi. Ca thi phải nằm trọn trong khung này — BE kiểm ở
   * `Exam.isScheduleWindowOutsideExamWindow`. Bỏ trống một cận = kỳ thi chưa đặt cận đó,
   * và BE cũng không ràng buộc cận đó.
   */
  examCloseAt?: string | null
  examOpenAt?: string | null
  /**
   * Thời gian làm bài của kỳ thi (GIÂY, do BE tự tính từ các mã đề). Ca thi ngắn hơn con
   * số này bị BE từ chối — hiện ra ở đây để người dùng biết mình đang bị chặn vì cái gì.
   */
  examTimeDurationSecond?: number | null
  initial?: { endDate?: string | null; room?: SchoolRoomLite | null; startDate?: string | null }
  /**
   * Với CLASS_TEST, BE BỎ QUA ràng buộc "ca thi trong khung mở/đóng" khi sửa, vì ca thi
   * mới là nguồn của openAt/closeAt chứ không phải ngược lại. Áp check đó ở FE sẽ khiến
   * không dời được lịch bài trên lớp.
   */
  isClassTest?: boolean
  onClose: () => void
  onSubmit: (input: { endDate: string; schoolRoomId: string; startDate: string }) => void
  submitLabel?: string
  submitting?: boolean
  title?: string
}

/**
 * Kiểm tra tại chỗ những ràng buộc BE sẽ kiểm lại. Trả về câu lỗi đầu tiên, hoặc null.
 * Mục đích là để người dùng thấy vấn đề ngay trong form thay vì bấm xong mới ăn toast
 * đỏ — BE vẫn là nơi chốt, đây chỉ là lớp chặn trước.
 */
function validateWindow(input: {
  endDate: string
  examCloseAt?: string | null
  examOpenAt?: string | null
  examTimeDurationSecond?: number | null
  isClassTest?: boolean
  startDate: string
}): string | null {
  const start = new Date(input.startDate).getTime()
  const end = new Date(input.endDate).getTime()
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return 'Thời gian bắt đầu hoặc kết thúc không hợp lệ.'
  }
  if (end <= start) {
    return 'Thời gian kết thúc phải sau thời gian bắt đầu.'
  }
  const minSeconds = input.examTimeDurationSecond ?? 0
  if (minSeconds > 0 && (end - start) / 1000 < minSeconds) {
    return `Ca thi phải dài tối thiểu ${formatDurationSeconds(minSeconds)} — bằng thời gian làm bài của kỳ thi.`
  }
  if (input.isClassTest) {
    return null
  }
  const openAt = input.examOpenAt ? new Date(input.examOpenAt).getTime() : null
  if (openAt != null && !Number.isNaN(openAt) && start < openAt) {
    return `Ca thi không được bắt đầu trước giờ mở của kỳ thi (${formatDateTime(input.examOpenAt)}).`
  }
  const closeAt = input.examCloseAt ? new Date(input.examCloseAt).getTime() : null
  if (closeAt != null && !Number.isNaN(closeAt) && end > closeAt) {
    return `Ca thi không được kết thúc sau giờ đóng của kỳ thi (${formatDateTime(input.examCloseAt)}).`
  }
  return null
}

export function CreateScheduleModal({
  examCloseAt,
  examOpenAt,
  examTimeDurationSecond,
  initial,
  isClassTest,
  onClose,
  onSubmit,
  submitLabel = 'Tạo ca thi',
  submitting = false,
  title = 'Thêm ca thi',
}: CreateScheduleModalProps) {
  const [room, setRoom] = useState<SchoolRoomLite | null>(initial?.room ?? null)
  const [startDate, setStartDate] = useState(toDateTimeLocalValue(initial?.startDate))
  const [endDate, setEndDate] = useState(toDateTimeLocalValue(initial?.endDate))
  const [showRoomPicker, setShowRoomPicker] = useState(false)

  const windowError =
    startDate && endDate
      ? validateWindow({
          endDate,
          examCloseAt,
          examOpenAt,
          examTimeDurationSecond,
          isClassTest,
          startDate,
        })
      : null
  const canSubmit = Boolean(room && startDate && endDate) && windowError == null

  // Kẹp luôn ở picker cho kỳ thi thường — CLASS_TEST không bị ràng khung nên để trống.
  const windowBounds = isClassTest
    ? { max: undefined, min: undefined }
    : {
        max: toDateTimeLocalValue(examCloseAt) || undefined,
        min: toDateTimeLocalValue(examOpenAt) || undefined,
      }
  const minDurationHint =
    examTimeDurationSecond && examTimeDurationSecond > 0
      ? `Ca thi phải dài tối thiểu ${formatDurationSeconds(examTimeDurationSecond)}.`
      : null

  function handleSubmit() {
    if (!room || !startDate || !endDate || windowError) {
      return
    }
    onSubmit({
      endDate: new Date(endDate).toISOString(),
      schoolRoomId: room.id,
      startDate: new Date(startDate).toISOString(),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <section
        aria-labelledby="create-schedule-title"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
        role="dialog"
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <h2 className="text-lg font-black text-slate-900" id="create-schedule-title">
            {title}
          </h2>
          <button
            aria-label="Đóng"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="grid gap-3.5 px-6 py-5">
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Phòng thi</label>
            {room ? (
              <button
                className="mt-1.5 flex w-full items-center justify-between gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3.5 py-2.5 text-left"
                onClick={() => setShowRoomPicker(true)}
                type="button"
              >
                <span>
                  <span className="text-sm font-bold text-slate-900">{room.code}</span>
                  <span className="ml-2 text-xs text-slate-500">{room.name}</span>
                </span>
                <DoorOpen aria-hidden="true" className="size-4 text-indigo-600" />
              </button>
            ) : (
              <button
                className="mt-1.5 flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 text-sm font-semibold text-slate-500 hover:bg-slate-50"
                onClick={() => setShowRoomPicker(true)}
                type="button"
              >
                <DoorOpen aria-hidden="true" className="size-4" />
                Chọn phòng…
              </button>
            )}
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500" htmlFor="schedule-start">
              Bắt đầu
            </label>
            <input
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-indigo-400"
              id="schedule-start"
              max={windowBounds.max}
              min={windowBounds.min}
              onChange={(event) => setStartDate(event.target.value)}
              type="datetime-local"
              value={startDate}
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500" htmlFor="schedule-end">
              Kết thúc
            </label>
            <input
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-indigo-400"
              id="schedule-end"
              max={windowBounds.max}
              min={windowBounds.min}
              onChange={(event) => setEndDate(event.target.value)}
              type="datetime-local"
              value={endDate}
            />
            {minDurationHint ? (
              <p className="mt-1.5 text-xs font-medium text-slate-500">{minDurationHint}</p>
            ) : null}
          </div>

          {windowError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold leading-relaxed text-red-700">
              {windowError}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button
            className="h-10 rounded-full border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            Hủy
          </button>
          <button
            className="h-10 rounded-full bg-linear-to-r from-indigo-600 to-cyan-500 px-4 text-sm font-bold text-white disabled:opacity-50"
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
            type="button"
          >
            {submitLabel}
          </button>
        </div>
      </section>

      {showRoomPicker ? (
        <RoomPickerModal
          onClose={() => setShowRoomPicker(false)}
          onSelect={(selected) => {
            setRoom(selected)
            setShowRoomPicker(false)
          }}
        />
      ) : null}
    </div>
  )
}
