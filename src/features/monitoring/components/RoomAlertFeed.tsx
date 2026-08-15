import type { AlertView } from '../api/useRoomMonitor'
import { getAlertTypeDisplay } from '../types'

type RoomAlertFeedProps = {
    alerts: AlertView[]
    /**
     * Đổi một cảnh báo thành tên học viên; trả về id thô nếu chưa ghép được roster.
     *
     * <p>Nhận cả cảnh báo chứ không chỉ `participantId` vì với cảnh báo do AI sinh thì trường đó
     * không phải candidateId, và phải ngả sang `sessionId` mới tra ra người - xem
     * `resolveAlertCandidateId`.
     */
    resolveName: (alert: AlertView) => string
}

function formatClock(value: string, fallbackAt: number): string {
    const parsed = Date.parse(value)
    return new Date(Number.isNaN(parsed) ? fallbackAt : parsed).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    })
}

export function RoomAlertFeed({ alerts, resolveName }: RoomAlertFeedProps) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-black text-slate-950">Cảnh báo</h2>

            {alerts.length === 0 ? (
                <p className="mt-3 rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs font-medium text-slate-500">
                    Chưa có cảnh báo nào trong ca thi này.
                </p>
            ) : (
                <ul className="mt-3 grid max-h-96 gap-2 overflow-y-auto">
                    {alerts.map((alert) => {
                        const display = getAlertTypeDisplay(alert.alertType)
                        return (
                            <li
                                className={`rounded-lg border px-3 py-2 ${display.className}`}
                                key={`${alert.streamId}-${alert.capturedAt}-${alert.alertType}`}
                            >
                                <div className="flex items-baseline justify-between gap-2">
                                    <span className="truncate text-xs font-bold">{display.label}</span>
                                    <span className="shrink-0 text-[11px] font-semibold opacity-70">
                                        {formatClock(alert.capturedAt, alert.receivedAt)}
                                    </span>
                                </div>
                                <p className="mt-0.5 truncate text-[11px] font-medium opacity-80">
                                    {resolveName(alert)}
                                </p>
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}
