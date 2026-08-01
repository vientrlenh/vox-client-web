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
 * Chốt sổ cả kỳ thi. Preview cho biết còn bao nhiêu bài dở, và BE có HAI luật khác
 * hẳn nhau cho hai loại "dở":
 *
 * - Đơn phúc khảo chưa xong: BE từ chối vô điều kiện — `releasePendingWithAiScores`
 *   KHÔNG bỏ qua được. Nên đây là rào cứng, không dựng checkbox.
 * - Bài còn chờ chấm: admin tick xác nhận là công bố theo điểm AI đang có.
 *
 * Gộp hai loại vào một cờ như trước làm checkbox hứa một điều nó không làm được:
 * tick xong nút bật lên, bấm vào thì BE trả 400.
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
  const hardBlocked = preview != null && preview.openAppeals > 0
  const needsAiConfirm =
    preview != null && (preview.pendingUnassigned > 0 || preview.pendingAssigned > 0)

  return (
    <ActionDialog
      confirmDisabled={
        isLoading || preview == null || hardBlocked || (needsAiConfirm && !acceptAiScores)
      }
      confirmLabel="Chốt sổ kỳ thi"
      icon={<Lock className="size-6" />}
      isPending={isPending}
      onCancel={onCancel}
      onConfirm={() => onConfirm(acceptAiScores)}
      subtitle={
        <>
          Công bố các bài còn chờ người chấm{examName ? ` của ${examName}` : ''} theo điểm AI đang
          có, để kỳ thi công bố kết quả được.
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
              Chốt sổ <b>không đụng tới</b> {preview.invalid} bài đang bị vô hiệu. Các bài đó thành{' '}
              <b>không đạt</b> với điểm 0 khi kỳ thi công bố kết quả.
            </p>
          ) : null}

          {hardBlocked ? (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5 text-[12.5px] font-medium leading-relaxed text-red-800">
              Kỳ thi còn <b>{preview.openAppeals} đơn phúc khảo chưa xong</b>. Phải xử lý hết các đơn
              này trước — chốt sổ không bỏ qua được, kể cả khi chấp nhận điểm AI.
            </p>
          ) : needsAiConfirm ? (
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
