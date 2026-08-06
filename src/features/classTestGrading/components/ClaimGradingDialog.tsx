import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { ActionDialog } from '@/features/grading'
import { CLAIM_ROUND_LABEL, CLAIMABLE_RESULT_STATUS, type ClaimableRoundType } from '../types'

type ClaimGradingDialogProps = {
  isPending: boolean
  onCancel: () => void
  onConfirm: (roundType: ClaimableRoundType) => void
  selectedCount: number
}

/**
 * Nhận chấm vòng hậu kiểm / soi lại bài vô hiệu.
 *
 * Vòng `INITIAL` không có ở đây: BE tự mở nó khi bài rơi vào `PENDING_REVIEW`, nên đưa
 * vào dialog chỉ tạo một nút gần như luôn báo "Bài thi này đang được chấm".
 *
 * `APPEAL` cũng không: nó gắn với một đơn phúc khảo cụ thể, đi qua màn đơn.
 */
const OFFERED_ROUNDS: ClaimableRoundType[] = ['SPOT_CHECK', 'REMEDIATION']

export function ClaimGradingDialog({
  isPending,
  onCancel,
  onConfirm,
  selectedCount,
}: ClaimGradingDialogProps) {
  const [roundType, setRoundType] = useState<ClaimableRoundType>('SPOT_CHECK')

  return (
    <ActionDialog
      confirmLabel={`Nhận chấm ${selectedCount} bài`}
      icon={<UserPlus className="size-5" />}
      isPending={isPending}
      onCancel={onCancel}
      onConfirm={() => onConfirm(roundType)}
      subtitle="Bạn là giáo viên tạo bài này nên tự nhận chấm, không qua nhà trường."
      title="Nhận chấm bài"
      tone="cyan"
    >
      <div className="mt-4 grid gap-3">
      <p className="text-[13px] text-slate-600">
        Bạn nhận chấm <b className="font-bold">{selectedCount}</b> bài. Mỗi vòng chỉ nhận được bài
        đang ở đúng trạng thái của nó — bài không hợp lệ sẽ bị từ chối cả lô.
      </p>
      <div className="grid gap-2">
        {OFFERED_ROUNDS.map((round) => (
          <label
            className={[
              'flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 transition',
              roundType === round
                ? 'border-cyan-400 bg-cyan-50'
                : 'border-slate-200 bg-white hover:bg-slate-50',
            ].join(' ')}
            key={round}
          >
            <input
              checked={roundType === round}
              className="mt-0.5 size-4 accent-cyan-600"
              name="claim-round-type"
              onChange={() => setRoundType(round)}
              type="radio"
              value={round}
            />
            <span className="leading-tight">
              <span className="block text-[13px] font-bold text-slate-800">
                {CLAIM_ROUND_LABEL[round]}
              </span>
              <span className="block text-[11px] font-medium text-slate-500">
                Chỉ nhận bài đang ở trạng thái {CLAIMABLE_RESULT_STATUS[round]}
              </span>
            </span>
          </label>
        ))}
      </div>
      </div>
    </ActionDialog>
  )
}
