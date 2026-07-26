import { useState } from 'react'
import { ShieldAlert, ShieldCheck, Undo2 } from 'lucide-react'
import type { ReactNode } from 'react'
import type { GradingOutcome, GradingRoundType } from '../types'
import { ActionDialog, ReasonField, type ActionDialogTone } from './ActionDialog'

/** Bốn hành động không nhập điểm. `REGRADED` có hộp thoại riêng vì phải soi điểm. */
export type DecisionOutcome = Exclude<GradingOutcome, 'REGRADED'>

type GradingDecisionDialogProps = {
  flagReason?: string | null
  isPending?: boolean
  onCancel: () => void
  onConfirm: (reason: string) => void
  outcome: DecisionOutcome
  resultCode: string
  roundType: GradingRoundType
}

type DecisionCopy = {
  body: ReactNode
  confirmLabel: string
  icon: ReactNode
  reasonHint?: string
  reasonLabel: string
  reasonPlaceholder: string
  // Lý do bắt buộc với ba hành động; UPHELD thì tuỳ chọn. Bản sao của
  // `GradingRoundPolicy.requiresReason` — BE vẫn là chỗ chốt, đây chỉ để chặn sớm.
  reasonRequired: boolean
  subtitle: string
  title: string
  tone: ActionDialogTone
}

/** Câu chữ cho UPHELD đổi theo vòng: cùng một nút nhưng hệ quả khác hẳn nhau. */
function upheldBody(roundType: GradingRoundType): ReactNode {
  switch (roundType) {
    case 'INITIAL':
      return (
        <>
          Bạn xác nhận điểm AI đang có là đúng. Bài sẽ được <b>công bố ngay</b> với điểm hiện tại —
          không có bước duyệt lại.
        </>
      )
    case 'SPOT_CHECK':
      return (
        <>
          Bạn xác nhận bản chấm đang có là đúng. Bài <b>giữ nguyên</b> điểm và trạng thái đã công
          bố; học sinh không thấy thay đổi gì.
        </>
      )
    case 'REMEDIATION':
      return (
        <>
          Bạn xác nhận bài <b>vẫn vi phạm</b>. Bài giữ nguyên trạng thái vô hiệu và phân công được
          đóng lại.
        </>
      )
    case 'APPEAL':
      return (
        <>
          Bạn xác nhận điểm cũ là đúng. Đơn phúc khảo được <b>kết thúc và công bố</b> với điểm giữ
          nguyên; học sinh nhận thông báo.
        </>
      )
  }
}

function copyFor(outcome: DecisionOutcome, roundType: GradingRoundType): DecisionCopy {
  switch (outcome) {
    case 'UPHELD':
      return {
        body: upheldBody(roundType),
        confirmLabel: 'Giữ nguyên điểm',
        icon: <ShieldCheck className="size-6" />,
        reasonLabel: 'Ghi chú của bạn',
        reasonPlaceholder: 'Vì sao bạn kết luận điểm hiện tại là đúng…',
        reasonRequired: false,
        subtitle: 'Đóng phân công mà không đổi điểm.',
        title: 'Giữ nguyên điểm',
        tone: 'emerald',
      }
    case 'INVALIDATED':
      return {
        body: (
          <>
            Thao tác này <b>chốt kết quả là vô hiệu</b> (không có điểm) và kết thúc phân công. Chỉ
            dùng khi đã nghe bài và xác nhận có vi phạm thật.
          </>
        ),
        confirmLabel: 'Vô hiệu bài thi',
        icon: <ShieldAlert className="size-6" />,
        reasonHint: 'Lý do được lưu vào lịch sử điểm của bài.',
        reasonLabel: 'Lý do vô hiệu',
        reasonPlaceholder: 'Mô tả vi phạm bạn quan sát được…',
        reasonRequired: true,
        subtitle: 'Kết luận bài thi có vi phạm.',
        title: 'Kết luận vi phạm',
        tone: 'red',
      }
    case 'CLEARED_INVALID':
      return {
        body: (
          <>
            Bạn kết luận bài <b>không vi phạm</b>. Hệ thống gỡ vô hiệu, gỡ chặn thí sinh, và mở
            luôn một lượt <b>chấm lần đầu</b> cho chính bạn để chấm bài này.
          </>
        ),
        confirmLabel: 'Gỡ vô hiệu',
        icon: <ShieldCheck className="size-6" />,
        reasonHint: 'Lý do được lưu vào lịch sử điểm của bài.',
        reasonLabel: 'Lý do gỡ vô hiệu',
        reasonPlaceholder: 'Vì sao bạn kết luận bài không vi phạm…',
        reasonRequired: true,
        subtitle: 'Đưa bài trở lại hàng chờ chấm.',
        title: 'Gỡ vô hiệu bài thi',
        tone: 'emerald',
      }
    case 'DECLINED':
      return {
        body: (
          <>
            Bài quay về hàng <b>chưa phân công</b> và quản trị viên nhận thông báo. Dùng khi bạn
            không nên chấm bài này (quen biết thí sinh, xung đột lợi ích…).
          </>
        ),
        confirmLabel: 'Trả lại phân công',
        icon: <Undo2 className="size-6" />,
        reasonHint: 'Quản trị viên đọc lý do này để giao lại cho người khác.',
        reasonLabel: 'Lý do trả lại',
        reasonPlaceholder: 'Vì sao bạn không thể chấm bài này…',
        reasonRequired: true,
        subtitle: 'Không chấm bài này.',
        title: 'Trả lại phân công',
        tone: 'slate',
      }
  }
}

/**
 * Hộp thoại xác nhận cho bốn hành động không nhập điểm. Một component vì chúng chỉ
 * khác nhau ở câu chữ và việc lý do có bắt buộc hay không — tách ra bốn file thì
 * bốn chỗ trôi dạt khỏi nhau.
 */
export function GradingDecisionDialog({
  flagReason,
  isPending,
  onCancel,
  onConfirm,
  outcome,
  resultCode,
  roundType,
}: GradingDecisionDialogProps) {
  const [reason, setReason] = useState('')
  const copy = copyFor(outcome, roundType)
  const trimmed = reason.trim()

  return (
    <ActionDialog
      confirmDisabled={copy.reasonRequired && trimmed.length === 0}
      confirmLabel={copy.confirmLabel}
      icon={copy.icon}
      isPending={isPending}
      onCancel={onCancel}
      onConfirm={() => onConfirm(trimmed)}
      subtitle={
        <>
          Bài <b className="text-slate-700">#{resultCode}</b> · {copy.subtitle}
        </>
      }
      title={copy.title}
      tone={copy.tone}
      width="lg"
    >
      {flagReason && outcome === 'INVALIDATED' ? (
        <div className="mt-4.5 rounded-xl border-l-2 border-amber-500 bg-amber-50 px-4 py-3">
          <div className="text-[11.5px] font-bold text-amber-700">Lý do hệ thống đánh dấu</div>
          <p className="mt-0.5 text-[13px] leading-relaxed text-amber-800">{flagReason}</p>
        </div>
      ) : null}

      <p
        className={`mt-4 rounded-xl border px-4 py-3.5 text-[13px] leading-relaxed ${
          copy.tone === 'red'
            ? 'border-red-200 bg-red-50 text-red-700'
            : copy.tone === 'emerald'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-slate-200 bg-slate-50 text-slate-700'
        }`}
      >
        {copy.body}
      </p>

      <ReasonField
        hint={copy.reasonHint}
        id={`decision-reason-${outcome}`}
        label={copy.reasonLabel}
        onChange={setReason}
        placeholder={copy.reasonPlaceholder}
        required={copy.reasonRequired}
        value={reason}
      />
    </ActionDialog>
  )
}
