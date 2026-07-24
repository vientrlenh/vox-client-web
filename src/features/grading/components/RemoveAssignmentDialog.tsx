import { TriangleAlert } from 'lucide-react'

type RemoveAssignmentDialogProps = {
  isPending?: boolean
  onCancel: () => void
  onConfirm: () => void
  resultCode: string
  teacherName?: string | null
}

/** Gỡ phân công = xoá dòng, bài quay lại tình trạng chưa gán. Chỉ gỡ được bài chưa chấm xong. */
export function RemoveAssignmentDialog({
  isPending,
  onCancel,
  onConfirm,
  resultCode,
  teacherName,
}: RemoveAssignmentDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-5">
      <div
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        role="dialog"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex size-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <TriangleAlert className="size-6" />
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Gỡ phân công</h2>
            <p className="mt-0.5 text-[12.5px] font-medium text-slate-500">
              Bài quay lại danh sách chưa gán.
            </p>
          </div>
        </div>
        <p className="mt-4.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-[13.5px] leading-relaxed text-slate-700">
          Gỡ <b className="text-slate-900">{teacherName ?? 'giáo viên này'}</b> khỏi bài{' '}
          <b className="text-slate-900">#{resultCode}</b>? Chỉ gỡ được bài <b>chưa chấm xong</b>.
        </p>
        <div className="mt-5 flex gap-2.5">
          <button
            className="h-11 flex-1 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            onClick={onCancel}
            type="button"
          >
            Hủy
          </button>
          <button
            className="h-11 flex-1 rounded-lg bg-red-600 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
            disabled={isPending}
            onClick={onConfirm}
            type="button"
          >
            Gỡ phân công
          </button>
        </div>
      </div>
    </div>
  )
}
