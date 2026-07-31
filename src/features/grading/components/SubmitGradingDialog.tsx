import { Flag, MailCheck } from 'lucide-react'
import { formatScore, formatScoreDelta, type GradingRoundType } from '../types'
import { ActionDialog } from './ActionDialog'

type SubmitGradingDialogProps = {
  flagged: boolean
  isPending?: boolean
  onCancel: () => void
  onConfirm: () => void
  partCount: number
  resultBandName?: string | null
  resultCode: string
  roundType: GradingRoundType
  // Điểm lúc được giao. Có ở mọi vòng, nhưng chỉ đáng đối chiếu khi bài đã có điểm.
  scoreBefore?: number | null
  totalScore?: number | null
}

/** Hệ quả của việc nộp điểm khác nhau theo vòng — nói rõ trước khi bấm. */
function consequenceFor(roundType: GradingRoundType) {
  switch (roundType) {
    case 'INITIAL':
      return 'Bài được công bố ngay với điểm này — không có bước duyệt lại.'
    case 'SPOT_CHECK':
      return 'Điểm mới thay điểm đã công bố; bài vẫn ở trạng thái đã công bố và học sinh nhận thông báo.'
    case 'REMEDIATION':
      return 'Điểm mới được ghi cho bài vừa được gỡ vô hiệu.'
    case 'APPEAL':
      return 'Nộp là công bố kết quả phúc khảo; học sinh nhận thông báo điểm cập nhật.'
  }
}

/**
 * Xác nhận nộp điểm chấm lại. Nộp LÀ CHỐT — không có bước admin duyệt, không sửa
 * lại được.
 *
 * <p>Với bài đang bị đánh dấu nghi vấn, đây cũng chính là lúc cờ được gỡ: nếu giáo
 * viên bỏ đi giữa chừng thì bài vẫn còn cờ.
 */
export function SubmitGradingDialog({
  flagged,
  isPending,
  onCancel,
  onConfirm,
  partCount,
  resultBandName,
  resultCode,
  roundType,
  scoreBefore,
  totalScore,
}: SubmitGradingDialogProps) {
  const delta = formatScoreDelta(scoreBefore, totalScore)

  return (
    <ActionDialog
      cancelLabel="Xem lại"
      confirmLabel="Nộp điểm"
      icon={<MailCheck className="size-6" />}
      isPending={isPending}
      onCancel={onCancel}
      onConfirm={onConfirm}
      subtitle={
        <>
          Bài <b className="text-slate-700">#{resultCode}</b> · {partCount} phần thi
        </>
      }
      title="Nộp điểm &amp; chốt kết quả"
      tone="emerald"
    >
      {scoreBefore == null ? (
        <div className="mt-4.5 rounded-2xl border border-emerald-200 bg-linear-to-r from-emerald-50 to-white px-5 py-4 text-center">
          <div className="text-[11.5px] font-bold text-emerald-700">ĐIỂM TỔNG CẢ BÀI</div>
          <div className="text-4xl font-extrabold leading-tight text-emerald-600">
            {formatScore(totalScore)}
          </div>
          {resultBandName ? (
            <div className="text-[12px] font-bold text-emerald-700/80">{resultBandName}</div>
          ) : null}
          <div className="mt-1 text-[11px] font-medium text-slate-400">
            Hệ thống tính từ điểm tiêu chí bạn nhập
          </div>
        </div>
      ) : (
        <>
          <div className="mt-4.5 flex items-stretch gap-2.5">
            <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-center">
              <div className="text-[11px] font-bold text-slate-500">ĐIỂM TRƯỚC</div>
              <div className="text-2xl font-extrabold leading-tight text-slate-500">
                {formatScore(scoreBefore)}
              </div>
            </div>
            <div className="flex-1 rounded-2xl border border-emerald-200 bg-linear-to-r from-emerald-50 to-white px-4 py-3.5 text-center">
              <div className="text-[11px] font-bold text-emerald-700">ĐIỂM SAU</div>
              <div className="text-2xl font-extrabold leading-tight text-emerald-600">
                {formatScore(totalScore)}
              </div>
              {resultBandName ? (
                <div className="text-[11px] font-bold text-emerald-700/80">{resultBandName}</div>
              ) : null}
            </div>
          </div>
          {delta ? (
            <p className="mt-2 text-center text-[12px] font-bold text-slate-500">
              Chênh lệch: <span className="text-slate-900">{delta}</span>
            </p>
          ) : null}
        </>
      )}

      {flagged ? (
        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Flag className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <span className="text-[12.5px] font-medium leading-relaxed text-amber-800">
            Bài này đang bị đánh dấu nghi vấn. Nộp điểm đồng nghĩa bạn xác nhận{' '}
            <b>không có vi phạm</b> — cờ sẽ được gỡ khi nộp.
          </span>
        </div>
      ) : null}

      <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[12.5px] font-medium leading-relaxed text-slate-600">
        {consequenceFor(roundType)} Nộp là chốt — không sửa lại được sau khi nộp.
      </p>
    </ActionDialog>
  )
}
