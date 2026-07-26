import { useState } from 'react'
import { Lock } from 'lucide-react'
import type { BulkFinalizePreview } from '../types'
import { ActionDialog } from './ActionDialog'

type FinalizeExamDialogProps = {
  examName?: string | null
  isLoading?: boolean
  isPending?: boolean
  onCancel: () => void
  onConfirm: (releasePendingWithAiScores: boolean) => void
  preview?: BulkFinalizePreview
}

function Row({ danger, label, value }: { danger?: boolean; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2 last:border-b-0">
      <span className="text-[12.5px] font-semibold text-slate-600">{label}</span>
      <span
        className={`text-[13.5px] font-extrabold ${
          danger && value > 0 ? 'text-amber-600' : 'text-slate-900'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

/**
 * Chốt sổ cả kỳ thi. Preview cho biết còn bao nhiêu bài dở — nếu còn thì admin phải
 * tick xác nhận công bố theo điểm AI, đúng luật của BE (mặc định an toàn là từ chối).
 */
export function FinalizeExamDialog({
  examName,
  isLoading,
  isPending,
  onCancel,
  onConfirm,
  preview,
}: FinalizeExamDialogProps) {
  const [acceptAiScores, setAcceptAiScores] = useState(false)
  const blocked =
    preview != null &&
    (preview.pendingUnassigned > 0 || preview.pendingAssigned > 0 || preview.openAppeals > 0)

  return (
    <ActionDialog
      confirmDisabled={isLoading || preview == null || (blocked && !acceptAiScores)}
      confirmLabel="Chốt sổ kỳ thi"
      icon={<Lock className="size-6" />}
      isPending={isPending}
      onCancel={onCancel}
      onConfirm={() => onConfirm(acceptAiScores)}
      subtitle={
        <>
          Đưa toàn bộ kết quả{examName ? ` của ${examName}` : ''} về trạng thái đã chốt.
        </>
      }
      title="Chốt sổ kỳ thi"
      tone="violet"
      width="lg"
    >
      {isLoading || !preview ? (
        <div className="mt-4.5 py-8 text-center text-sm text-slate-400">Đang kiểm tra…</div>
      ) : (
        <>
          <div className="mt-4.5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2">
            <Row label="Tổng số bài" value={preview.total} />
            <Row label="Sẵn sàng chốt" value={preview.readyToFinalize} />
            <Row danger label="Chờ chấm, chưa giao ai" value={preview.pendingUnassigned} />
            <Row danger label="Chờ chấm, đang có người cầm" value={preview.pendingAssigned} />
            <Row danger label="Đơn phúc khảo chưa xong" value={preview.openAppeals} />
            <Row label="Bài đã vô hiệu" value={preview.invalid} />
          </div>

          {preview.invalid > 0 ? (
            <p className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[12.5px] font-medium leading-relaxed text-slate-600">
              {preview.invalid} bài đang bị vô hiệu sẽ được chốt là <b>không đạt</b>.
            </p>
          ) : null}

          {blocked ? (
            <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
              <input
                checked={acceptAiScores}
                className="mt-0.5 size-4 accent-amber-600"
                onChange={(event) => setAcceptAiScores(event.target.checked)}
                type="checkbox"
              />
              <span className="text-[12.5px] font-medium leading-relaxed text-amber-800">
                Vẫn còn bài chưa chấm xong. Tôi xác nhận <b>công bố các bài đó theo điểm AI</b> đang
                có. Không tick thì hệ thống sẽ từ chối chốt sổ.
              </span>
            </label>
          ) : (
            <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12.5px] font-medium leading-relaxed text-emerald-800">
              Không còn bài nào dở dang — chốt sổ được ngay.
            </p>
          )}
        </>
      )}
    </ActionDialog>
  )
}
