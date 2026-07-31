import { History, X } from 'lucide-react'
import { useResultStatusHistoryQuery } from '../api/useGradingQueries'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import {
  formatIsoDateTime,
  formatScore,
  formatScoreDelta,
  getResultStatusDisplay,
  getSourceLabel,
} from '../types'

type ResultHistoryDialogProps = {
  candidateResultId: string
  onClose: () => void
  resultCode: string
  studentName?: string | null
}

/**
 * Dòng thời gian điểm của một bài. Bảng chỉ-ghi-thêm ở BE nên đây thuần chỉ-đọc —
 * không có thao tác nào trong hộp thoại này.
 */
export function ResultHistoryDialog({
  candidateResultId,
  onClose,
  resultCode,
  studentName,
}: ResultHistoryDialogProps) {
  const historyQuery = useResultStatusHistoryQuery(candidateResultId)
  const entries = historyQuery.data ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-5">
      <div
        aria-modal="true"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <History className="size-6" />
            </span>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Lịch sử điểm</h2>
              <p className="mt-0.5 text-[12.5px] font-medium text-slate-500">
                Bài <b className="text-slate-700">#{resultCode}</b>
                {studentName ? ` · ${studentName}` : ''}
              </p>
            </div>
          </div>
          <button
            aria-label="Đóng hộp thoại"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {historyQuery.isLoading ? (
            <div className="py-10 text-center text-sm text-slate-400">Đang tải…</div>
          ) : entries.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">
              Chưa có mốc nào trong lịch sử của bài này.
            </div>
          ) : (
            <ol className="relative grid gap-4 border-l border-slate-200 pl-5">
              {entries.map((entry) => {
                const to = getResultStatusDisplay(entry.toStatus)
                const from = entry.fromStatus ? getResultStatusDisplay(entry.fromStatus) : null
                const delta = formatScoreDelta(entry.scoreBefore, entry.scoreAfter)
                return (
                  <li className="relative" key={entry.id}>
                    <span className="absolute -left-[26px] top-1.5 size-2.5 rounded-full bg-cyan-500 ring-4 ring-white" />
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {from ? (
                          <>
                            <StatusBadge label={from.label} tone={from.tone} />
                            <span className="text-[12px] font-bold text-slate-400">→</span>
                          </>
                        ) : null}
                        <StatusBadge label={to.label} tone={to.tone} />
                        <span className="ml-auto text-[11.5px] font-semibold text-slate-400">
                          {formatIsoDateTime(entry.createdAt)}
                        </span>
                      </div>
                      <div className="mt-2 text-[12.5px] font-semibold text-slate-600">
                        {getSourceLabel(entry.source)}
                        {/* actorName rỗng nghĩa là hệ thống tự đổi (AI chấm xong, job chốt sổ). */}
                        {entry.actorName ? (
                          <span className="text-slate-400"> · {entry.actorName}</span>
                        ) : null}
                      </div>
                      {entry.scoreBefore != null || entry.scoreAfter != null ? (
                        <div className="mt-1.5 text-[12.5px] font-bold text-slate-500">
                          Điểm {formatScore(entry.scoreBefore)} → {formatScore(entry.scoreAfter)}
                          {delta ? (
                            <span className="ml-1.5 text-slate-900">({delta})</span>
                          ) : null}
                        </div>
                      ) : null}
                      {entry.reason ? (
                        <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[12.5px] leading-relaxed text-slate-600">
                          {entry.reason}
                        </p>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  )
}
