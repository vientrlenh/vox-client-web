import { useState } from 'react'
import { CalendarClock } from 'lucide-react'
import { localDateTimeToIso } from '../types'
import { ActionDialog, DeadlineField } from './ActionDialog'

type SetDeadlineDialogProps = {
  assignmentCount: number
  isPending?: boolean
  onCancel: () => void
  onConfirm: (deadlineAt: string | null) => void
}

/** Đặt / sửa / gỡ hạn chấm cho các phân công đang chọn. Bỏ trống ô ngày = gỡ hạn. */
export function SetDeadlineDialog({
  assignmentCount,
  isPending,
  onCancel,
  onConfirm,
}: SetDeadlineDialogProps) {
  const [deadline, setDeadline] = useState('')
  const clearing = deadline === ''

  return (
    <ActionDialog
      confirmLabel={clearing ? 'Gỡ hạn chấm' : 'Đặt hạn chấm'}
      icon={<CalendarClock className="size-6" />}
      isPending={isPending}
      onCancel={onCancel}
      onConfirm={() => onConfirm(localDateTimeToIso(deadline))}
      subtitle={
        <>
          Áp cho <b className="text-slate-700">{assignmentCount} phân công</b> đang chọn.
        </>
      }
      title="Hạn chấm bài"
      tone="cyan"
    >
      <DeadlineField
        hint="Bỏ trống rồi bấm xác nhận để GỠ hạn — bài không còn bị tính là quá hạn."
        id="set-deadline"
        label="Hạn mới"
        onChange={setDeadline}
        value={deadline}
      />
      <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[12.5px] font-medium leading-relaxed text-slate-600">
        Hạn chấm chỉ để nhắc và để lọc bài quá hạn — hệ thống <b>không</b> tự thu hồi khi hết hạn.
        Thu hồi là thao tác riêng của bạn.
      </p>
    </ActionDialog>
  )
}
