import { AlertTriangle, Maximize, Minimize, Play, Radio, Volume2, VolumeX, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { StreamView } from '../api/useRoomMonitor'
import { formatDuration, useLiveRewindPlayer } from '../hooks/useLiveRewindPlayer'
import { getStreamTypeLabel } from '../types'

/** Một yêu cầu tua tới mốc giờ thực, thường phát ra khi giám thị bấm vào một cảnh báo. */
export type SeekRequest = {
    atMs: number
    /** Tăng dần để bấm lại CÙNG một cảnh báo vẫn tua lại lần nữa. */
    requestId: number
}

/** Cảnh báo mới nhất của cả phòng, để panel biết hiện tại vừa có chuyện gì. */
export type LatestAlertNotice = {
    /** Mốc SỰ VIỆC, không phải lúc tải về. Panel so nó với lúc giám thị rời khỏi live. */
    atMs: number
    label: string
    participantName: string
}

/**
 * Tụt lại quá mốc này thì trạng thái "đang xem lại" chuyển từ thông tin sang cảnh báo.
 *
 * <p>Trong giám sát thi, tụt sau live không phải một tuỳ chọn xem mà là một trạng thái rủi ro: giám
 * thị đang xem quá khứ trong khi bài thi diễn ra ở hiện tại. Hai phút là đủ dài để không quấy rầy
 * một lần kiểm tra bình thường, đủ ngắn để không ai quên mất mình đang ở đâu.
 */
const BEHIND_LIVE_WARNING_SECS = 120

/**
 * Nhãn của một tab luồng.
 *
 * <p>Khi học viên rớt rồi vào lại, một bản ghi cũ có thể xuất hiện cạnh luồng đang chạy cùng loại.
 * Hai tab cùng tên "Camera" thì không chọn được theo nghĩa thật - không có gì phân biệt đoạn nào với
 * đoạn nào. Giờ bắt đầu là thứ giám thị đối chiếu thẳng được với giờ trên dòng cảnh báo.
 */
function streamTabLabel(stream: StreamView): string {
    const label = getStreamTypeLabel(stream.streamType)
    if (stream.endedAt === undefined) {
        return label
    }
    const startedAt = Date.parse(stream.startedAt)
    if (!Number.isFinite(startedAt)) {
        return `${label} · bản ghi`
    }
    const clock = new Date(startedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    return `${label} · bản ghi ${clock}`
}

type LiveRewindPanelProps = {
    availableStreams: StreamView[]
    /**
     * Cảnh báo mới nhất trong phòng. Panel chỉ dùng nó khi giám thị ĐANG tua lại: lúc đó họ không
     * nhìn thấy hiện tại, nên một cảnh báo vừa xảy ra là thứ duy nhất có thể đáng để họ quay về.
     */
    latestAlert?: LatestAlertNotice | null
    onAuthError?: () => void
    onClose: () => void
    /** Báo ra ngoài khi mốc được yêu cầu đã trôi khỏi cửa sổ tua. */
    onSeekUnavailable?: () => void
    /**
     * Chọn một luồng cụ thể theo `streamId`.
     *
     * <p>Trước đây prop này báo ra ngoài mỗi `streamType`, trong khi tab lại vẽ theo từng luồng. Khi
     * một học viên có hai luồng cùng loại, bên nhận giải ngược bằng `find(theo loại)` và luôn nhận
     * về cái ĐẦU TIÊN - tab thứ hai bấm vào là nhảy về tab thứ nhất.
     */
    onSelectStream: (streamId: string) => void
    participantName: string
    scheduleId?: string
    seekRequest?: null | SeekRequest
    stream: StreamView
    token?: string
}

export function LiveRewindPanel({
    availableStreams,
    latestAlert,
    onAuthError,
    onClose,
    onSeekUnavailable,
    onSelectStream,
    participantName,
    scheduleId,
    seekRequest,
    stream,
    token,
}: LiveRewindPanelProps) {
    const {
        autoplayBlocked,
        dragOffset,
        goLive,
        isMuted,
        leftLiveAtMs,
        onScrubCommit,
        onScrubMove,
        onScrubStart,
        resume,
        seek,
        seekToDate,
        setVolume,
        status,
        toggleMute,
        videoRef,
        volume,
    } = useLiveRewindPlayer({ onAuthError, scheduleId, stream, token })

    const containerRef = useRef<HTMLDivElement | null>(null)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const handledSeekRef = useRef<null | number>(null)

    useEffect(() => {
        const onChange = () => setIsFullscreen(document.fullscreenElement === containerRef.current)
        document.addEventListener('fullscreenchange', onChange)
        return () => document.removeEventListener('fullscreenchange', onChange)
    }, [])

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') {
                return
            }
            // Đang toàn màn hình thì để trình duyệt xử lý Escape trước (nó thoát fullscreen). Đóng
            // luôn panel ở đây nghĩa là một lần bấm vừa thoát fullscreen vừa mất khung xem.
            if (document.fullscreenElement) {
                return
            }
            onClose()
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [onClose])

    const toggleFullscreen = useCallback(() => {
        // Toàn màn hình cả KHỐI chứ không riêng thẻ video: thanh tua và nút Live nằm ngoài video,
        // nên phóng to mỗi video sẽ vứt đi đúng phần khiến màn hình này khác một trình phát thường.
        if (document.fullscreenElement) {
            void document.exitFullscreen()
            return
        }
        void containerRef.current?.requestFullscreen()
    }, [])

    // Áp yêu cầu tua từ ngoài (bấm vào một cảnh báo). Chạy lại mỗi khi `seek` đổi vì lúc mới bấm,
    // trình phát của luồng vừa chọn có thể còn chưa phân tích xong playlist -- khi đó seekToDate trả
    // `unavailable` và yêu cầu được GIỮ LẠI để thử tiếp, thay vì báo lỗi cho một việc chỉ chưa sẵn sàng.
    useEffect(() => {
        if (!seekRequest || handledSeekRef.current === seekRequest.requestId || !seek) {
            return
        }
        const result = seekToDate(seekRequest.atMs)
        if (result === 'unavailable') {
            return
        }
        handledSeekRef.current = seekRequest.requestId
        if (result === 'out-of-range') {
            onSeekUnavailable?.()
        }
    }, [onSeekUnavailable, seek, seekRequest, seekToDate])

    // Mép phải của thanh là mép VÙNG TUA -- xa nhất mà con trượt có thể tới thật.
    //
    // Trước đây mép này là `Date.now()`, nên thanh luôn có một dải cuối không thể chạm vào: playhead
    // của HLS nằm sau mép playlist một khoảng cố định, cộng thời gian ghi xong segment, cộng độ lệch
    // đồng hồ giữa máy giám thị và server. Nhìn ra ngoài thì đó đúng là "thanh cuộn luôn chạy sau
    // kích thước thật của thanh". Phần `[0, dvrStartOffset]` vẫn được vẽ xám nên "cả ca thi dài bao
    // nhiêu" không mất đi -- chỉ bỏ đúng cái vùng vô nghĩa.
    const sliderMax = seek?.domainEndOffset ?? 0
    // Ghim vào mép khi đang ở hiện tại. Khoảng lùi mà hls.js cố tình giữ là hiện vật của giao thức,
    // không phải thông tin giám thị làm gì được; để thumb thiếu mép mãi mãi thì đọc như một cái lỗi.
    const sliderValue = dragOffset ?? (seek?.atLiveEdge ? sliderMax : (seek?.playheadOffset ?? 0))
    // Phần tua được, tính theo phần trăm chiều dài thanh. Vẽ ra thay vì chỉ mô tả bằng chữ: khi con
    // trượt bị kẹp ngược về đầu cửa sổ, dòng "tua được: X–Y" không cứu được gì vì lúc đó không ai
    // đang đọc chữ -- họ đang nhìn cái thumb vừa nhảy.
    const dvrLeftPct = sliderMax > 0 && seek ? Math.max(0, Math.min(100, (seek.dvrStartOffset / sliderMax) * 100)) : 0
    const dvrRightPct = sliderMax > 0 && seek ? Math.max(0, Math.min(100, (seek.dvrEndOffset / sliderMax) * 100)) : 100

    // Tụt lại hay không là một PHÉP ĐO, không phải cờ ý định.
    //
    // Bản trước dùng `!isFollowingLive`, cờ chỉ đổi khi giám thị tự kéo thanh tua. Nghĩa là một luồng
    // bị stall rồi trôi lại ba phút phía sau vẫn tự nhận là đang trực tiếp, và dải cảnh báo không hiện
    // -- đúng cái trường hợp giám thị KHÔNG tự biết thì lại là trường hợp duy nhất không được báo.
    // Luồng đã kết thúc là BẢN GHI, không phải luồng trực tiếp bị tụt lại.
    //
    // Server đóng playlist bằng #EXT-X-ENDLIST nên hls.js chuyển hẳn sang chế độ VOD: không còn mép
    // live, không còn poll. Mọi thứ nói về "hiện tại" ở đây vì thế đều vô nghĩa -- và tệ hơn là gây
    // hiểu nhầm: một dải vàng "đang xem lại, cách hiện tại 12 phút" trên một ca đã xong sẽ đẩy giám
    // thị đi tìm một hiện tại không tồn tại.
    const isRecorded = stream.endedAt !== undefined
    const behindSecs = seek?.behindSecs ?? 0
    const isBehind = !isRecorded && seek !== null && !seek.atLiveEdge
    const isFarBehind = isBehind && behindSecs >= BEHIND_LIVE_WARNING_SECS

    // Cảnh báo xảy ra SAU khi giám thị rời khỏi mép live -- tức thứ họ đang không nhìn thấy. Suy ra
    // thuần từ hai mốc thời gian, không effect và không state riêng: theo dõi bằng effect thì phải
    // tự nhớ "đã thấy cảnh báo nào", và cái sổ nhớ đó là chỗ sinh ra render lồng nhau.
    const missedAlert =
        isBehind && leftLiveAtMs !== null && latestAlert && latestAlert.atMs > leftLiveAtMs ? latestAlert : null

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4" ref={containerRef}>
            <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">{participantName}</p>
                    <p className="text-xs font-medium text-slate-500">
                        {getStreamTypeLabel(stream.streamType)}
                        {stream.endedAt !== undefined ? ' · đã kết thúc' : ''}
                    </p>
                </div>
                {/* Có chữ, không chỉ icon: một nút X 32px đọc như "đóng một cái thẻ", không như
                    "ngừng theo dõi học viên này". Esc cũng đóng được -- xem effect ở trên. */}
                <button
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                    onClick={onClose}
                    title="Ngừng xem (Esc)"
                    type="button"
                >
                    <X aria-hidden="true" className="size-3.5" />
                    Ngừng xem
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
                            onClick={() => onSelectStream(candidate.streamId)}
                            type="button"
                        >
                            {streamTabLabel(candidate)}
                        </button>
                    ))}
                </div>
            ) : null}

            <div className="relative">
                {/*
                  KHÔNG có `controls`. Thanh tua của trình duyệt chạy theo `video.seekable`, mà với
                  hls.js (đường MSE) `seekable` chỉ là phần tab này ĐÃ TẢI -- vài giây, trong khi
                  server vẫn phục vụ cả cửa sổ DVR. Bật nó lên là đặt cạnh nhau hai thanh tua, một
                  cái nói sai. Tệ hơn: ở nhánh native HLS (Safari) `seekable` lại đúng, nên lỗi này
                  chỉ lộ ra trên Chrome/Edge/Firefox và vô hình với ai kiểm thử trên máy Mac.
                */}
                {/*
                  Chặn theo CHIỀU CAO, không để chiều rộng quyết định. Cột chính trên màn 1920 rộng
                  ~1500px, mà khung 16:9 rộng thế thì cao 844px -- đẩy toàn bộ lưới xuống dưới màn
                  hình, tức phá đúng thứ cần giữ: liếc thấy những học viên còn lại. `aspect-video` +
                  `max-h` khiến trình duyệt thu chiều RỘNG lại để giữ tỉ lệ, nên khung tự căn giữa.
                */}
                <div className="relative mx-auto aspect-video max-h-[55vh] w-full">
                    <video
                        className="size-full rounded-lg bg-slate-900 object-contain"
                        playsInline
                        ref={videoRef}
                    />
                    {autoplayBlocked ? (
                        <button
                            className="absolute inset-0 grid place-items-center rounded-lg bg-slate-950/60"
                            onClick={resume}
                            type="button"
                        >
                            <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-900">
                                <Play aria-hidden="true" className="size-4" />
                                Trình duyệt đã chặn tự phát — bấm để xem
                            </span>
                        </button>
                    ) : null}
                </div>
            </div>

            {/*
              Trạng thái "đang xem lại" phải nhìn thấy được. Trước đây nó là dòng chữ 11px xám ở
              dưới cùng -- kiểu chữ mờ nhất trong panel, cho sự thật quan trọng nhất về nó. Tụt sau
              live trong giám sát thi không phải một tuỳ chọn xem: giám thị đang xem quá khứ trong
              khi bài thi diễn ra ở hiện tại.
            */}
            {isBehind ? (
                <div
                    className={`mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 ${
                        isFarBehind
                            ? 'border-red-300 bg-red-50 text-red-800'
                            : 'border-amber-200 bg-amber-50 text-amber-800'
                    }`}
                >
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold">
                        {isFarBehind ? <AlertTriangle aria-hidden="true" className="size-4" /> : null}
                        Đang xem lại — cách hiện tại {formatDuration(behindSecs)}
                        {isFarBehind ? '. Bạn không thấy những gì đang diễn ra.' : ''}
                    </span>
                    <button
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition ${
                            isFarBehind ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'
                        }`}
                        onClick={goLive}
                        type="button"
                    >
                        <Radio aria-hidden="true" className="size-3.5" />
                        Về hiện tại
                    </button>
                </div>
            ) : null}

            {/* Cảnh báo vừa xảy ra ở hiện tại trong lúc đang xem quá khứ. */}
            {missedAlert ? (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-300 bg-red-600 px-3 py-2 text-white">
                    <span className="text-xs font-bold">
                        Vừa có cảnh báo ở hiện tại — {missedAlert.participantName}: {missedAlert.label}
                    </span>
                    <button
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-50"
                        onClick={goLive}
                        type="button"
                    >
                        <Radio aria-hidden="true" className="size-3.5" />
                        Xem ngay
                    </button>
                </div>
            ) : null}

            {status.kind === 'error' ? (
                <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                    {status.message}
                </p>
            ) : null}
            {status.kind === 'loading' ? (
                <p className="mt-2 text-xs font-medium text-slate-500">{status.message}</p>
            ) : null}

            <div className="mt-3 grid gap-2">
                <div className="relative">
                    {/* Dải nền cho thấy phần nào của thanh thực sự tua được. */}
                    <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-slate-200">
                        {seek ? (
                            <div
                                className="absolute h-full rounded-full bg-cyan-200"
                                style={{ left: `${dvrLeftPct}%`, width: `${Math.max(0, dvrRightPct - dvrLeftPct)}%` }}
                            />
                        ) : null}
                    </div>
                    <input
                        aria-label="Thanh tua"
                        className="relative w-full accent-cyan-600"
                        disabled={!seek}
                        max={sliderMax}
                        min={0}
                        // onChange chỉ DỜI con trượt. Tua thật xảy ra lúc thả tay (pointerup) hoặc
                        // nhả phím -- xem doc của onScrubMove.
                        onChange={(event) => onScrubMove(Number(event.target.value))}
                        onKeyUp={onScrubCommit}
                        onPointerDown={onScrubStart}
                        // Bắt cả lostpointercapture: thả tay ngoài phạm vi thanh vẫn phải chốt, nếu
                        // không con trượt kẹt ở trạng thái đang kéo và không bao giờ tua.
                        //
                        // Cả ba đường đều gọi onScrubCommit KHÔNG kèm vị trí, và đó là điều bắt buộc:
                        // một lần thả tay bắn cả pointerup lẫn lostpointercapture, React render lại
                        // giữa hai lần và ghi giá trị cũ trở lại DOM, nên đọc `currentTarget.value` ở
                        // lần thứ hai là tua ngược về đúng chỗ vừa rời đi. Vị trí lấy từ ref bên trong
                        // hook, và lần chốt đầu tiên vô hiệu hoá mọi lần sau.
                        onLostPointerCapture={onScrubCommit}
                        onPointerUp={onScrubCommit}
                        step={0.1}
                        type="range"
                        value={sliderValue}
                    />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-medium text-slate-500">
                        {seek ? (
                            <>
                                {/*
                                  Trước đây dòng này mở đầu bằng "đã live: X", mà X chính là
                                  `dvrEndOffset` -- đúng bằng đầu phải của "tua được" ngay sau nó. Hai
                                  con số giống hệt nhau đứng cạnh nhau, và con số thực sự thiếu thì
                                  không có. Giờ ba số ở đây rời nhau hẳn: vùng tua được, đang xem ở
                                  đâu, và chậm bao nhiêu so với thứ vừa quay được.
                                */}
                                tua được: {formatDuration(seek.dvrStartOffset)}–
                                {formatDuration(seek.dvrEndOffset)}
                                {seek.absolute ? '' : ' (mốc tương đối)'} · đang xem:{' '}
                                {formatDuration(seek.playheadOffset)}
                                {/* "chậm" chỉ có nghĩa khi còn một hiện tại để chậm so với nó. Trên
                                    một bản ghi, cùng con số ấy chỉ là thời lượng còn lại. */}
                                {/*
                                  Độ trễ hiện thẳng ra thay vì để người xem tự đoán từ khoảng hở trên
                                  thanh. Khi đang bám live nó không về 0 mà đứng quanh khoảng đệm
                                  hls.js giữ lại -- đó là sàn độ trễ của hệ thống, và với giám sát thi
                                  thì "bạn đang xem chậm chừng này" là thông tin cần biết, không phải
                                  chi tiết kỹ thuật nên giấu.
                                */}
                                {isRecorded ? '' : ` · chậm ${formatDuration(behindSecs)}`}
                            </>
                        ) : (
                            'Chưa có đoạn nào để tua.'
                        )}
                    </p>

                    <div className="flex items-center gap-2">
                        <button
                            aria-label={isMuted ? 'Bật tiếng' : 'Tắt tiếng'}
                            className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                            onClick={toggleMute}
                            type="button"
                        >
                            {isMuted ? (
                                <VolumeX aria-hidden="true" className="size-4" />
                            ) : (
                                <Volume2 aria-hidden="true" className="size-4" />
                            )}
                        </button>
                        <input
                            aria-label="Âm lượng"
                            className="w-20 accent-cyan-600"
                            max={1}
                            min={0}
                            onChange={(event) => setVolume(Number(event.target.value))}
                            step={0.05}
                            type="range"
                            value={isMuted ? 0 : volume}
                        />
                        <button
                            aria-label={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
                            className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                            onClick={toggleFullscreen}
                            type="button"
                        >
                            {isFullscreen ? (
                                <Minimize aria-hidden="true" className="size-4" />
                            ) : (
                                <Maximize aria-hidden="true" className="size-4" />
                            )}
                        </button>
                        {/*
                          Trước đây nút này tô đỏ KHI ĐANG ở live -- tức nổi bật đúng lúc không có
                          gì để bấm, và mờ đi đúng lúc cần bấm. Giờ nó chỉ còn là ĐÈN BÁO trạng
                          thái: sáng khi đang ở hiện tại, lặng khi không. Việc kéo giám thị về hiện
                          tại đã có dải cảnh báo phía trên video lo -- ở đó nó là hành động, có màu
                          và có chỗ để giải thích tụt bao lâu. Một phần tử gánh cả hai vai là lý do
                          cái cũ nhấn mạnh ngược.

                          Đèn sáng theo `atLiveEdge` -- điều ĐO ĐƯỢC -- chứ không theo ý định của
                          giám thị. Một cái đèn "Live" sáng trong lúc luồng đã trôi lại phía sau còn
                          tệ hơn không có đèn nào.
                        */}
                        {/* Bản ghi thì không có "Live" để về. Một nút Live bấm được trên một ca đã
                            xong là lời mời đi tìm thứ không còn tồn tại. */}
                        {isRecorded ? (
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500">
                                <Radio aria-hidden="true" className="size-3.5" />
                                Bản ghi
                            </span>
                        ) : (
                            <button
                                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                                    seek?.atLiveEdge
                                        ? 'border-red-200 bg-red-50 text-red-700'
                                        : 'border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-700'
                                }`}
                                onClick={goLive}
                                title={seek?.atLiveEdge ? 'Đang xem trực tiếp' : 'Về hiện tại'}
                                type="button"
                            >
                                <Radio aria-hidden="true" className="size-3.5" />
                                Live
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
