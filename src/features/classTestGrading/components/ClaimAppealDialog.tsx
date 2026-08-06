import { useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { ActionDialog } from '@/features/grading'

type ClaimAppealDialogProps = {
  isPending: boolean
  onCancel: () => void
  onConfirm: (overrideReason: string) => void
  studentName: string
}

/**
 * Chủ bài kiểm tra trên lớp tự nhận chấm phúc khảo.
 *
 * Luật xung đột lợi ích của BE cấm người ĐÃ chấm tay một bài đi chấm phúc khảo chính
 * bài đó — với bài trên lớp thì đó thường là chính người đang đứng đây. BE cho vượt
 * luật nhưng bắt ghi lý do (`overrideReason`), và lý do được lưu lên đơn làm dấu vết.
 *
 * Nếu họ mới chỉ GIỮ NGUYÊN điểm (không sinh bản chấm tay) thì không có xung đột và BE
 * bỏ qua lý do — nhập thừa vẫn vô hại, nên cứ hỏi cho nhất quán.
 */
export function ClaimAppealDialog({
  isPending,
  onCancel,
  onConfirm,
  studentName,
}: ClaimAppealDialogProps) {
  const [reason, setReason] = useState('')
  const trimmed = reason.trim()

  return (
    <ActionDialog
      confirmDisabled={trimmed.length === 0}
      confirmLabel="Nhận chấm phúc khảo"
      icon={<ShieldAlert className="size-5" />}
      isPending={isPending}
      onCancel={onCancel}
      onConfirm={() => onConfirm(trimmed)}
      subtitle={`Đơn của ${studentName}`}
      title="Tự nhận chấm phúc khảo"
      tone="violet"
    >
      <div className="mt-4 grid gap-3">
        <p className="text-[13px] text-slate-600">
          Bạn là người đã chấm bài này. Hệ thống cho phép bạn chấm phúc khảo vì bài trên lớp không có
          giáo viên khác, nhưng lý do dưới đây sẽ được ghi vào đơn.
        </p>
        <label className="grid gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Lý do nhận chấm
          </span>
          <textarea
            className="min-h-24 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-violet-400"
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ví dụ: Bài kiểm tra trên lớp, chỉ có giáo viên phụ trách chấm được."
            value={reason}
          />
        </label>
      </div>
    </ActionDialog>
  )
}
