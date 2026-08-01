import { UserRoundX } from 'lucide-react'

import { getCandidateStatusDisplay, type ProctorCandidateSummaryDto } from '@/features/examCore/types'
import { StatusBadge } from '@/shared/ui/StatusBadge'

import type { ParticipantBoardEntry } from '../hooks/useMonitoringBoard'

type RoomRosterPanelProps = {
    neverConnected: ProctorCandidateSummaryDto[]
    onScreen: ParticipantBoardEntry[]
}

function displayName(candidate: ProctorCandidateSummaryDto): string {
    return candidate.studentName?.trim() || candidate.studentEmail?.trim() || candidate.candidateId
}

/**
 * Danh sách thí sinh của ca thi, và trên hết là những người **không có ô nào trên lưới**.
 *
 * <p>Đây là lý do tồn tại của panel: lưới chỉ hiển thị được người đang gửi hình, nên một thí sinh
 * chưa bao giờ kết nối là hoàn toàn vô hình ở đó. Lưới lo video, panel này lo điểm danh.
 */
export function RoomRosterPanel({ neverConnected, onScreen }: RoomRosterPanelProps) {
    return (
        <aside className="grid gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-baseline justify-between gap-2">
                    <h2 className="text-sm font-black text-slate-950">Chưa lên sóng</h2>
                    <span className="text-2xl font-black text-slate-950">{neverConnected.length}</span>
                </div>
                <p className="mt-1 text-xs font-medium text-slate-500">
                    Thí sinh được xếp ca nhưng chưa gửi luồng nào.
                </p>

                {neverConnected.length === 0 ? (
                    <p className="mt-3 rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs font-medium text-slate-500">
                        Tất cả thí sinh đều đã lên sóng.
                    </p>
                ) : (
                    <ul className="mt-3 grid gap-2">
                        {neverConnected.map((candidate) => {
                            const status = getCandidateStatusDisplay(candidate.status)
                            return (
                                <li
                                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2"
                                    key={candidate.candidateId}
                                >
                                    <span className="flex min-w-0 items-center gap-2">
                                        <UserRoundX aria-hidden="true" className="size-4 shrink-0 text-slate-400" />
                                        <span className="truncate text-xs font-bold text-slate-800">
                                            {displayName(candidate)}
                                        </span>
                                    </span>
                                    <StatusBadge label={status.label} tone={status.tone} />
                                </li>
                            )
                        })}
                    </ul>
                )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-baseline justify-between gap-2">
                    <h2 className="text-sm font-black text-slate-950">Đang theo dõi</h2>
                    <span className="text-2xl font-black text-slate-950">{onScreen.length}</span>
                </div>
                <p className="mt-1 text-xs font-medium text-slate-500">
                    Thí sinh có luồng đang sống hoặc vừa mất kết nối.
                </p>
            </div>
        </aside>
    )
}
