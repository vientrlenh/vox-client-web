import { Radio, X } from 'lucide-react'

import type { StreamView } from '../api/useRoomMonitor'
import { formatDuration, useLiveRewindPlayer } from '../hooks/useLiveRewindPlayer'
import { getStreamTypeLabel, type StreamType } from '../types'

type LiveRewindPanelProps = {
    availableStreams: StreamView[]
    onClose: () => void
    onSelectStreamType: (streamType: StreamType) => void
    participantName: string
    scheduleId?: string
    stream: StreamView
    token?: string
}

export function LiveRewindPanel({
    availableStreams,
    onClose,
    onSelectStreamType,
    participantName,
    scheduleId,
    stream,
    token,
}: LiveRewindPanelProps) {
    const { goLive, isFollowingLive, onScrubCommit, onScrubStart, seek, status, videoRef } =
        useLiveRewindPlayer({ scheduleId, stream, token })

    // Thanh trượt trải hết thời gian stream đã chạy, kể cả phần không tua được, nên độ dài của nó
    // luôn bằng thời lượng thật của stream.
    const sliderMax = seek ? Math.max(seek.domainEndOffset, seek.dvrEndOffset) : 0

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">{participantName}</p>
                    <p className="text-xs font-medium text-slate-500">
                        {getStreamTypeLabel(stream.streamType)}
                        {stream.endedAt !== undefined ? ' · đã kết thúc' : ''}
                    </p>
                </div>
                <button
                    aria-label="Ngừng xem"
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                    onClick={onClose}
                    type="button"
                >
                    <X aria-hidden="true" className="size-4" />
                </button>
            </div>

            {availableStreams.length > 1 ? (
                <div className="mb-3 inline-flex rounded-lg border border-slate-200 bg-white p-1">
                    {availableStreams.map((candidate) => (
                        <button
                            className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                                candidate.streamId === stream.streamId
                                    ? 'bg-cyan-600 text-white'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                            key={candidate.streamId}
                            onClick={() => onSelectStreamType(candidate.streamType)}
                            type="button"
                        >
                            {getStreamTypeLabel(candidate.streamType)}
                        </button>
                    ))}
                </div>
            ) : null}

            <video
                autoPlay
                className="aspect-video w-full rounded-lg bg-slate-900"
                controls
                playsInline
                ref={videoRef}
            />

            {status.kind === 'error' ? (
                <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                    {status.message}
                </p>
            ) : null}
            {status.kind === 'loading' ? (
                <p className="mt-2 text-xs font-medium text-slate-500">{status.message}</p>
            ) : null}

            <div className="mt-3 grid gap-2">
                <input
                    aria-label="Thanh tua"
                    className="w-full accent-cyan-600"
                    disabled={!seek}
                    max={sliderMax}
                    min={0}
                    onChange={(event) => onScrubCommit(Number(event.target.value))}
                    onPointerDown={onScrubStart}
                    step={0.1}
                    type="range"
                    value={seek?.playheadOffset ?? 0}
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-medium text-slate-500">
                        {seek ? (
                            <>
                                {seek.absolute ? (
                                    <>
                                        đã live: {formatDuration(seek.domainEndOffset)} · tua được:{' '}
                                        {formatDuration(seek.dvrStartOffset)}–{formatDuration(seek.dvrEndOffset)}
                                    </>
                                ) : (
                                    <>
                                        tua được: {formatDuration(seek.dvrStartOffset)}–
                                        {formatDuration(seek.dvrEndOffset)} (mốc tương đối)
                                    </>
                                )}
                                {' · '}
                                {isFollowingLive
                                    ? 'đang xem trực tiếp'
                                    : `đang xem lại (cách live ${formatDuration(
                                          Math.max(0, seek.dvrEndOffset - seek.playheadOffset),
                                      )})`}
                            </>
                        ) : (
                            'Chưa có đoạn nào để tua.'
                        )}
                    </p>
                    <button
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                            isFollowingLive
                                ? 'border-red-200 bg-red-50 text-red-700'
                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                        onClick={goLive}
                        type="button"
                    >
                        <Radio aria-hidden="true" className="size-3.5" />
                        Live
                    </button>
                </div>
            </div>
        </div>
    )
}
