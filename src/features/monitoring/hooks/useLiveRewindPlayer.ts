import Hls from 'hls.js'
import { useCallback, useEffect, useRef, useState } from 'react'

import { appConfig } from '@/shared/config/env'

import type { StreamView } from '../api/useRoomMonitor'

/**
 * Khoảng an toàn (giây) chừa ra khỏi mép cuối vùng tua khi kẹp đích seek.
 *
 * <p>`end` là vị trí ngay SAU mẫu cuối cùng đã biết, bản thân nó không phải điểm giải mã được: tua
 * đúng vào đó (hoặc quá đó) khiến hls.js nạp lại fragment cuối, lùi về keyframe trước nó, hoặc nhảy
 * tới vị trí đồng bộ live - nhìn từ ngoài giống như vài giây cuối bị lặp lại.
 */
const SEEK_END_MARGIN_SECS = 0.25

/** Nhịp vẽ lại thanh tua. Chạy theo timer chứ không theo `timeupdate` để số liệu vẫn nhích khi phát bị kẹt. */
const SEEK_TICK_MS = 500

const MAX_MEDIA_ERROR_RECOVERIES = 3

/**
 * Số target duration mà hls.js cố tình đậu playhead lùi lại khỏi mép playlist.
 *
 * <p>Khai báo thành hằng thay vì viết thẳng vào config vì dung sai "coi như live" bên dưới phải suy
 * ra TỪ nó: hai con số rời nhau sẽ lệch, và lúc lệch thì trạng thái live không bao giờ đúng.
 */
const LIVE_SYNC_DURATION_COUNT = 3

/**
 * Trong khoảng này thì coi như đang ở hiện tại.
 *
 * <p>Phải LỚN hơn `LIVE_SYNC_DURATION_COUNT`, không phải bằng: ngay cả khi bám live hoàn hảo,
 * playhead vẫn nằm sau mép playlist đúng `LIVE_SYNC_DURATION_COUNT` nhịp. Lấy dung sai bằng đúng số
 * đó nghĩa là "đang ở live" không bao giờ true. Cộng thêm một nhịp để bù việc cửa sổ trượt: mép
 * playlist nhảy lên một segment mỗi lần server đóng file, nên khoảng cách dao động trong một nhịp mà
 * không phải do người xem làm gì.
 */
const LIVE_EDGE_TOLERANCE_COUNT = LIVE_SYNC_DURATION_COUNT + 1

/** Khớp FFMPEG_INGEST_HLS_SEGMENT_SECONDS mặc định phía vox-streaming. Chỉ dùng khi chưa đọc được playlist. */
const DEFAULT_TARGET_DURATION_SECS = 4

/**
 * `getStartDate()` là API riêng của Safari (bản đọc #EXT-X-PROGRAM-DATE-TIME của nền tảng) nên
 * không có trong `lib.dom`. Khai báo optional để chỗ dùng buộc phải kiểm tra trước khi gọi.
 */
type VideoElementWithStartDate = HTMLVideoElement & { getStartDate?: () => Date }

export type PlayerStatus = {
    kind: 'error' | 'idle' | 'loading' | 'playing'
    message: string
}

export type SeekReadout = {
    /** Mốc thời gian tuyệt đối có dựng được không (cần PROGRAM-DATE-TIME và giờ bắt đầu stream). */
    absolute: boolean
    /**
     * Có đang ở hiện tại hay không -- ĐO ĐƯỢC, không phải ý định của người xem.
     *
     * <p>Đây là thứ thay cho cờ "đang bám live" trước đây. Cờ đó chỉ đổi khi giám thị tự kéo thanh
     * tua, nên một luồng bị stall rồi trôi lại phía sau vẫn tự nhận là đang trực tiếp - đúng cái
     * trường hợp nguy hiểm nhất thì lại không có cảnh báo nào.
     */
    atLiveEdge: boolean
    /** Khoảng cách từ playhead tới mép vùng tua, giây. Không âm. */
    behindSecs: number
    domainEndOffset: number
    dvrEndOffset: number
    dvrStartOffset: number
    playheadOffset: number
}

/**
 * Khoảng chờ tối thiểu giữa hai lần xin token mới vì lỗi xác thực.
 *
 * <p>hls.js retry rất nhanh sau lỗi mạng, nên nếu không chặn thì một token chết sẽ sinh ra hàng
 * chục request token mỗi giây.
 */
const AUTH_REFRESH_THROTTLE_MS = 10_000

type UseLiveRewindPlayerParams = {
    /**
     * Gọi khi server từ chối token của luồng. Trình phát không tự lấy token được, mà nếu không có
     * đường báo ra ngoài thì nó sẽ retry vô hạn bằng đúng cái token đã chết - luồng đứng vĩnh viễn
     * dù chỉ cần một token mới là xong.
     */
    onAuthError?: () => void
    scheduleId?: string
    stream: null | StreamView
    token?: string
}

function manifestUrl(scheduleId: string, streamId: string, token: string): string {
    const base = appConfig.streamApiUrl.replace(/\/$/, '')
    return `${base}/live/${scheduleId}/${streamId}/playlist.m3u8?token=${encodeURIComponent(token)}`
}

export function formatDuration(seconds: number): string {
    const safe = !Number.isFinite(seconds) || seconds < 0 ? 0 : seconds
    const hours = Math.floor(safe / 3600)
    const minutes = Math.floor((safe % 3600) / 60)
    const secs = Math.floor(safe % 60)
    const mm = hours > 0 ? String(minutes).padStart(2, '0') : String(minutes)
    return `${hours > 0 ? `${hours}:` : ''}${mm}:${String(secs).padStart(2, '0')}`
}

/**
 * Phát HLS live có tua lại (DVR) cho một luồng đang chạy.
 *
 * <p>Port từ `vox-streaming/demo/web/monitor.js`, vốn đã là bản prototype chạy được và đã xử lý xong
 * đúng những chỗ khó: thứ tự hls.js/native, neo đồng hồ tường, viết lại token cho mọi request.
 */
export function useLiveRewindPlayer({ onAuthError, scheduleId, stream, token }: UseLiveRewindPlayerParams) {
    const videoRef = useRef<HTMLVideoElement | null>(null)
    const hlsRef = useRef<Hls | null>(null)
    const usingNativeHlsRef = useRef(false)

    /**
     * Vùng tua được, theo hệ toạ độ `currentTime`, đọc từ playlist mà hls.js đã phân tích - KHÔNG
     * phải `videoEl.buffered`, vốn chỉ phản ánh phần tab này đã tải. Giám thị mở màn hình vào giữa
     * ca thi sẽ chỉ buffer vài giây cuối dù server còn liệt kê mọi fragment cũ.
     */
    const dvrRangeRef = useRef<null | { end: number; start: number }>(null)
    /**
     * Ánh xạ `currentTime` sang giờ thực: "vị trí `mediaTime` được ghi lúc `dateMs`". Đây là thứ giữ
     * cho thanh tua sống sót qua việc trình phát bị dựng lại - `currentTime` một mình vô nghĩa giữa
     * các phiên phát, vì hls.js gán fragment đầu tiên nó thấy vào mốc 0.
     */
    const wallAnchorRef = useRef<null | { dateMs: number; mediaTime: number }>(null)
    /** Miền thời gian tuyệt đối thanh trượt đang vẽ. Đóng băng suốt thao tác kéo. */
    const seekDomainRef = useRef<null | { absolute: boolean; endMs: number; startMs: number }>(null)
    const draggingRef = useRef(false)
    /**
     * `#EXT-X-TARGETDURATION` của playlist đang phát. Đọc từ server thay vì viết cứng vì độ dài
     * segment là cấu hình được (`FFMPEG_INGEST_HLS_SEGMENT_SECONDS`), và mọi ngưỡng live ở đây đều là
     * bội số của nó -- viết cứng 4 giây thì một cụm đổi sang segment 6 giây sẽ báo "đang xem lại"
     * suốt buổi thi.
     */
    const targetDurationRef = useRef(DEFAULT_TARGET_DURATION_SECS)
    const tokenRef = useRef<string | undefined>(token)
    /**
     * Đọc qua ref vì cùng một lý do với `token`: `stream` là object mới sau MỖI sự kiện frame (xem
     * `streamsReducer`), tức mỗi `FRAME_INTERVAL_SECS` giây. Giữ `startedAt` ở đây cho phép effect
     * bên dưới khoá vào `streamId` - một primitive - thay vì vào identity của object.
     */
    const startedAtRef = useRef<string | undefined>(stream?.startedAt)
    /** Cùng lý do với hai ref trên: giữ callback ngoài deps để không dựng lại trình phát. */
    const onAuthErrorRef = useRef(onAuthError)
    const lastAuthRefreshRef = useRef(0)

    const [status, setStatus] = useState<PlayerStatus>({ kind: 'idle', message: '' })
    const [seek, setSeek] = useState<null | SeekReadout>(null)
    /**
     * Vị trí con trượt trong lúc NGƯỜI DÙNG đang kéo, tách khỏi `seek.playheadOffset`.
     *
     * <p>Không có nó thì nhịp vẽ lại 500ms ghi đè vị trí thumb giữa hai bước kéo, và con trượt giật
     * ngược về playhead ngay dưới ngón tay.
     */
    const [dragOffset, setDragOffset] = useState<null | number>(null)
    /**
     * Mốc giám thị rời khỏi mép live, null khi đang ở hiện tại.
     *
     * <p>Tồn tại để phía trên SUY RA được "có cảnh báo nào xảy ra sau khi tôi ngừng xem hiện tại
     * không" -- một phép so sánh thuần, thay cho việc theo dõi cảnh báo bằng effect + state.
     * Cập nhật theo hàm (`prev ?? now`) chứ không ghi đè: mỗi lần kéo thanh tua tiếp mà đặt lại mốc
     * sẽ xoá mất đúng cảnh báo vừa bỏ lỡ.
     *
     * <p>Đặt từ nhịp đo trong `tick`, không từ hành động kéo: rời khỏi hiện tại vì stall cũng là rời
     * khỏi hiện tại, và đó mới là trường hợp giám thị không tự biết. Dùng `Date.now()` ở đây là đúng
     * chỗ -- nó chỉ đem so với `receivedAt` của cảnh báo, cũng là mốc đóng bởi máy này.
     */
    const [leftLiveAtMs, setLeftLiveAtMs] = useState<null | number>(null)
    const [isMuted, setIsMuted] = useState(false)
    const [volume, setVolumeState] = useState(1)
    /**
     * Trình duyệt chặn autoplay. Phải lộ ra ngoài vì panel không còn `controls` mặc định để người
     * xem tự bấm phát -- không có đường thoát này thì màn hình đứng im mà không nói tại sao.
     */
    const [autoplayBlocked, setAutoplayBlocked] = useState(false)

    useEffect(() => {
        tokenRef.current = token
    }, [token])

    useEffect(() => {
        startedAtRef.current = stream?.startedAt
    }, [stream?.startedAt])

    useEffect(() => {
        onAuthErrorRef.current = onAuthError
    }, [onAuthError])

    /**
     * Xin token mới khi server từ chối token hiện tại.
     *
     * <p>Chặn theo thời gian vì hls.js retry lỗi mạng rất dồn dập: không có nó thì một token chết sẽ
     * biến thành hàng chục request token mỗi giây, đúng lúc backend đang có vấn đề.
     */
    const requestFreshToken = useCallback(() => {
        const now = Date.now()
        if (now - lastAuthRefreshRef.current < AUTH_REFRESH_THROTTLE_MS) {
            return
        }
        lastAuthRefreshRef.current = now
        onAuthErrorRef.current?.()
    }, [])

    const mediaToDate = useCallback((mediaTime: number) => {
        const anchor = wallAnchorRef.current
        return anchor ? anchor.dateMs + (mediaTime - anchor.mediaTime) * 1000 : Number.NaN
    }, [])

    const dateToMedia = useCallback((dateMs: number) => {
        const anchor = wallAnchorRef.current
        return anchor ? anchor.mediaTime + (dateMs - anchor.dateMs) / 1000 : Number.NaN
    }, [])

    /**
     * Safari không có hls.js để hỏi, nhưng engine của nó quản `seekable` trực tiếp trên cả playlist
     * nên ở đó `seekable` MỚI là nguồn đúng, và `getStartDate()` là bản đọc PROGRAM-DATE-TIME của
     * nền tảng.
     */
    const readDvrWindow = useCallback((video: HTMLVideoElement) => {
        if (!usingNativeHlsRef.current) {
            return dvrRangeRef.current
        }
        const seekable = video.seekable
        if (!seekable || seekable.length === 0) {
            return null
        }
        const nativeVideo = video as VideoElementWithStartDate
        if (!wallAnchorRef.current && typeof nativeVideo.getStartDate === 'function') {
            const startDate = nativeVideo.getStartDate()
            if (startDate && !Number.isNaN(startDate.getTime())) {
                wallAnchorRef.current = { dateMs: startDate.getTime(), mediaTime: 0 }
            }
        }
        return { end: seekable.end(seekable.length - 1), start: seekable.start(0) }
    }, [])

    // Vòng đời trình phát: gắn với luồng đang chọn, và CHỈ dựng lại khi đổi sang luồng khác.
    //
    // Cả `token` lẫn `stream` đều cố tình không nằm trong deps, vì cùng một lý do: mỗi lần deps đổi
    // là một lần destroy() + loadSource() + attachMedia(), tức tải lại manifest, tải lại init
    // segment và buffer lại từ đầu - người xem thấy đúng một khoảng đứng hình.
    //
    // Với `token` thì mỗi 4 phút. Với `stream` thì tệ hơn nhiều: `streamsReducer` dựng object mới
    // cho luồng sau MỖI sự kiện frame, nên để nguyên object trong deps sẽ phá và dựng lại trình phát
    // mỗi FRAME_INTERVAL_SECS giây - mặc định là 5. Khoá vào `streamId` mới là thứ thực sự thay đổi
    // khi giám thị chuyển luồng; hai trường còn lại effect cần thì đọc qua ref.
    const streamId = stream?.streamId
    useEffect(() => {
        const video = videoRef.current
        if (!video || !streamId || !scheduleId || !tokenRef.current) {
            setStatus({ kind: 'idle', message: '' })
            return
        }

        dvrRangeRef.current = null
        wallAnchorRef.current = null
        seekDomainRef.current = null
        targetDurationRef.current = DEFAULT_TARGET_DURATION_SECS
        setLeftLiveAtMs(null)
        setSeek(null)
        setDragOffset(null)
        setAutoplayBlocked(false)
        setStatus({ kind: 'loading', message: 'Đang tải luồng…' })

        // Phát tường minh thay vì chỉ dựa vào thuộc tính `autoplay`: thuộc tính đó không trả về
        // promise nên một lần bị chặn sẽ im lặng tuyệt đối. Panel đã bỏ `controls` mặc định, nên
        // nếu không bắt được ở đây thì người xem ngồi trước khung hình đứng mà không có nút nào bấm.
        const tryPlay = () => {
            video.play().then(
                () => setAutoplayBlocked(false),
                () => setAutoplayBlocked(true),
            )
        }

        // Chỉ là token khởi tạo. Mọi request sau đó - kể cả manifest hls.js tự poll lại - đều được
        // xhrSetup ghi đè bằng `tokenRef.current`, nên URL này cũ đi không sao.
        const url = manifestUrl(scheduleId, streamId, tokenRef.current)
        let mediaErrorRecoveries = 0

        // hls.js được thử TRƯỚC, native HLS chỉ là phương án dự phòng. Đảo thứ tự không phải khác
        // biệt tinh tế mà là hỏng hẳn trên Chromium: Chrome VÀ Edge đều trả "maybe" - một chuỗi
        // truthy - cho canPlayType("application/vnd.apple.mpegurl"), nên dò cái đó trước sẽ đẩy mọi
        // trình duyệt Chromium xuống nhánh native, nơi manifest treo ở networkState=LOADING vĩnh
        // viễn: không sự kiện lỗi, seekable rỗng mãi, getStartDate() undefined (API riêng Safari).
        if (!Hls.isSupported()) {
            if (video.canPlayType('application/vnd.apple.mpegurl')) {
                usingNativeHlsRef.current = true
                video.src = url
                video.onloadedmetadata = () => {
                    setStatus({ kind: 'playing', message: '' })
                    tryPlay()
                }
                video.onerror = () =>
                    setStatus({
                        kind: 'error',
                        message: 'Không tải được luồng. Xem khung hình JPEG ở lưới thay thế.',
                    })
            } else {
                setStatus({
                    kind: 'error',
                    message: 'Trình duyệt này không hỗ trợ phát HLS (cần Chrome/Firefox/Edge/Safari bản mới).',
                })
                return
            }
        } else {
            usingNativeHlsRef.current = false
            const hls = new Hls({
                liveSyncDurationCount: LIVE_SYNC_DURATION_COUNT,
                // Mọi request tới route /live/ - cả manifest hls.js tự poll lại lẫn các URL init/
                // fragment mà manifest trỏ tới - đều được gắn token mới nhất. Nhờ vậy việc refetch
                // token nền là đủ để xem quá TTL 5 phút mà không cần nạp lại nguồn.
                xhrSetup: (xhr, requestUrl) => {
                    if (!requestUrl.includes('/live/') || !tokenRef.current) {
                        return
                    }
                    const withToken = new URL(requestUrl, window.location.href)
                    withToken.searchParams.set('token', tokenRef.current)
                    xhr.open('GET', withToken.toString(), true)
                },
            })
            hlsRef.current = hls

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                mediaErrorRecoveries = 0
                setStatus({ kind: 'playing', message: '' })
                tryPlay()
            })

            // Bắn ở MỌI lần nạp lại playlist, không chỉ lần đầu - đây là nơi duy nhất phản ánh vùng
            // DVR đầy đủ phía server, độc lập với việc tab này đã tải được bao nhiêu.
            hls.on(Hls.Events.LEVEL_UPDATED, (_event, data) => {
                const frags = data.details?.fragments
                if (!frags || frags.length === 0) {
                    return
                }
                const first = frags[0]
                const last = frags[frags.length - 1]
                dvrRangeRef.current = { end: last.start + last.duration, start: first.start }
                const target = data.details?.targetduration
                if (typeof target === 'number' && Number.isFinite(target) && target > 0) {
                    targetDurationRef.current = target
                }
                // Đọc lại mỗi lần thay vì cache từ lần đầu: sau một discontinuity server neo lại, và
                // fragment đầu cửa sổ đổi khi cửa sổ trượt.
                if (typeof first.programDateTime === 'number') {
                    wallAnchorRef.current = { dateMs: first.programDateTime, mediaTime: first.start }
                }
            })

            hls.on(Hls.Events.ERROR, (_event, data) => {
                // Log cả lỗi không fatal: một lần đơ hình im lặng nhìn từ ngoài chính là chuỗi lỗi
                // buffer/stall không fatal, và đây là chỗ duy nhất thấy được chẩn đoán của hls.js.
                console.warn('hls.js error', data.type, data.details, `fatal=${data.fatal}`, data)

                // Kiểm tra TRƯỚC nhánh !fatal: một token hết hạn xuất hiện dưới dạng chuỗi 401 không
                // fatal ở lần poll manifest, và chỉ trở thành fatal sau khi hls.js đã thử lại đủ số
                // lần. Chờ tới lúc fatal mới xin token mới là để luồng đứng hình vài chục giây trong
                // khi thứ cần làm đã rõ ngay từ lỗi đầu tiên.
                const status = data.response?.code
                if (status === 401 || status === 403) {
                    requestFreshToken()
                }

                if (!data.fatal) {
                    return
                }
                // Khôi phục theo đúng khuyến nghị của hls.js. Không có nhánh này thì BẤT KỲ lỗi fatal
                // nào - kể cả một lỗi thoáng qua tự phục hồi được - cũng giết luôn phiên phát.
                if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                    hls.startLoad()
                    return
                }
                if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaErrorRecoveries < MAX_MEDIA_ERROR_RECOVERIES) {
                    mediaErrorRecoveries += 1
                    hls.recoverMediaError()
                    return
                }
                setStatus({
                    kind: 'error',
                    message: 'Không tải được luồng (live rewind chưa bật ở server, hoặc chưa có đoạn nào sẵn sàng).',
                })
            })

            hls.loadSource(url)
            hls.attachMedia(video)
        }

        const tick = () => {
            // Đọc lại mỗi nhịp thay vì chốt một lần lúc dựng player: `streamsReducer` tạo entry tạm
            // với `startedAt: ''` khi frame về trước snapshot, nên giá trị thật có thể đến muộn. Đọc
            // ở đây thì thanh tua tự chuyển sang mốc tuyệt đối lúc nó tới, không cần dựng lại gì.
            const startedAt = startedAtRef.current
            const streamStartMs = startedAt ? new Date(startedAt).getTime() : Number.NaN

            const dvr = readDvrWindow(video)
            if (!dvr) {
                setSeek(null)
                return
            }
            dvrRangeRef.current = dvr

            // Mép phải của thanh là MÉP VÙNG TUA, không phải `Date.now()`.
            //
            // Trước đây nó là `Date.now()`, và đó là một phép so sánh giữa hai đồng hồ khác nhau: mép
            // phải lấy từ đồng hồ của máy giám thị, còn playhead lấy từ PROGRAM-DATE-TIME của server.
            // Máy giám thị nhanh hai phút là thanh mọc thêm hai phút vùng không thể tới, chậm hai
            // phút thì thumb dính mép và GIẤU luôn độ tụt thật. Neo cả hai đầu vào đồng hồ server thì
            // độ lệch đó biến mất khỏi hình học thanh, và phần còn lại đúng bằng độ trễ thật.
            //
            // Vẫn đóng băng suốt thao tác kéo: mép vùng tua nhảy lên một segment mỗi lần server đóng
            // file, và thang đo đổi giữa lúc kéo sẽ làm thumb giật dưới ngón tay.
            const absolute = wallAnchorRef.current !== null && !Number.isNaN(streamStartMs)
            if (!draggingRef.current || !seekDomainRef.current) {
                seekDomainRef.current = absolute
                    ? { absolute: true, endMs: mediaToDate(dvr.end), startMs: streamStartMs }
                    : { absolute: false, endMs: 0, startMs: 0 }
            }
            const domain = seekDomainRef.current
            const tolerance = LIVE_EDGE_TOLERANCE_COUNT * targetDurationRef.current

            let behindSecs: number
            if (domain.absolute) {
                const toOffset = (ms: number) => (ms - domain.startMs) / 1000
                const dvrEndOffset = toOffset(mediaToDate(dvr.end))
                const playheadOffset = toOffset(mediaToDate(video.currentTime))
                behindSecs = Math.max(0, dvrEndOffset - playheadOffset)
                setSeek({
                    absolute: true,
                    atLiveEdge: behindSecs <= tolerance,
                    behindSecs,
                    domainEndOffset: toOffset(domain.endMs),
                    dvrEndOffset,
                    dvrStartOffset: toOffset(mediaToDate(dvr.start)),
                    playheadOffset,
                })
            } else {
                behindSecs = Math.max(0, dvr.end - video.currentTime)
                setSeek({
                    absolute: false,
                    atLiveEdge: behindSecs <= tolerance,
                    behindSecs,
                    domainEndOffset: dvr.end,
                    dvrEndOffset: dvr.end,
                    dvrStartOffset: dvr.start,
                    playheadOffset: video.currentTime,
                })
            }

            // Mốc "từ lúc nào tôi không còn thấy hiện tại" được đo ở đây, không đặt lúc kéo thanh:
            // trôi lại phía sau vì stall cũng là không thấy hiện tại, và đó là trường hợp giám thị
            // không tự biết. `prev ?? now` để việc tụt kéo dài không đẩy mốc chạy theo và xoá mất
            // cảnh báo vừa bỏ lỡ; cả hai nhánh đều idempotent nên gọi mỗi nhịp không gây render thêm.
            if (behindSecs <= tolerance) {
                setLeftLiveAtMs(null)
            } else {
                setLeftLiveAtMs((previous) => previous ?? Date.now())
            }
        }

        tick()
        const timer = setInterval(tick, SEEK_TICK_MS)

        return () => {
            clearInterval(timer)
            if (hlsRef.current) {
                hlsRef.current.destroy()
                hlsRef.current = null
            }
            video.onloadedmetadata = null
            video.onerror = null
            video.removeAttribute('src')
            video.load()
            usingNativeHlsRef.current = false
            dvrRangeRef.current = null
            wallAnchorRef.current = null
            seekDomainRef.current = null
            draggingRef.current = false
        }
        // token và startedAt đọc qua ref có chủ ý, và `stream` được thu về `streamId`: xem lý do đầy
        // đủ ở đầu effect. Tóm tắt - deps ở đây đổi là player bị dựng lại và người xem đứng hình,
        // nên chỉ những thứ thực sự bắt buộc phải dựng lại mới được đứng đây.
    }, [scheduleId, streamId, dateToMedia, mediaToDate, readDvrWindow, requestFreshToken])

    // Không đặt cờ "đã rời live" ở đây nữa: nhịp đo trong `tick` tự thấy điều đó ngay sau lệnh tua, và
    // một cờ ý định song song với phép đo là đúng cách để hai nguồn sự thật lệch nhau.
    const onScrubStart = useCallback(() => {
        draggingRef.current = true
    }, [])

    /**
     * Người dùng đang kéo: CHỈ dời con trượt, không tua.
     *
     * <p>Tách khỏi `onScrubCommit` vì React bắn `onChange` của `input[type=range]` ở MỖI bước di
     * chuyển chứ không phải lúc thả tay. Tua ngay tại đây nghĩa là kéo qua một ca thi 40 phút sẽ
     * phát ra hàng trăm lệnh seek, mỗi lệnh khiến hls.js xả buffer và tải lại fragment -- thanh tua
     * trở nên gần như không dùng được đúng lúc cần nó nhất.
     */
    const onScrubMove = useCallback((offsetSecs: number) => {
        draggingRef.current = true
        setDragOffset(offsetSecs)
    }, [])

    /** Tua tới `offsetSecs` giây kể từ lúc stream bắt đầu - chính là đơn vị của thanh trượt. */
    const onScrubCommit = useCallback(
        (offsetSecs: number) => {
            draggingRef.current = false
            setDragOffset(null)
            const video = videoRef.current
            const dvr = dvrRangeRef.current
            const domain = seekDomainRef.current
            if (!video || !dvr || !domain) {
                return
            }
            // Đi qua giờ tuyệt đối chứ không coi offset là vị trí media: hai thứ chỉ trùng nhau khi
            // trình phát gắn vào đúng lúc stream bắt đầu.
            const target = domain.absolute ? dateToMedia(domain.startMs + offsetSecs * 1000) : offsetSecs
            // Kẹp trong vùng tua được thay vì tin giá trị thô: thanh trượt trải cả thời gian đã chạy
            // mà chỉ dvrRange là thực sự lấy được.
            const safeEnd = Math.max(dvr.start, dvr.end - SEEK_END_MARGIN_SECS)
            video.currentTime = Math.min(safeEnd, Math.max(dvr.start + 0.05, target))
        },
        [dateToMedia],
    )

    /**
     * Tua tới một MỐC GIỜ THỰC. Đây là thứ biến một cảnh báo thành điều hướng: cảnh báo mang
     * `capturedAt` tuyệt đối, còn `wallAnchorRef` đã có sẵn ánh xạ giờ thực sang thời gian media.
     *
     * @returns
     * `unavailable` khi chưa dựng được ánh xạ (playlist chưa có PROGRAM-DATE-TIME, hoặc trình phát
     * còn đang tải) -- phía gọi nên thử lại chứ đừng báo lỗi. `out-of-range` khi mốc đó đã trôi ra
     * ngoài cửa sổ tua: KHÔNG kẹp thầm về mép, vì nhảy tới một chỗ khác chỗ được bấm mà không nói gì
     * là đúng kiểu làm người xem mất lòng tin vào thanh tua.
     */
    const seekToDate = useCallback((dateMs: number): 'ok' | 'out-of-range' | 'unavailable' => {
        const video = videoRef.current
        const dvr = dvrRangeRef.current
        if (!video || !dvr || !wallAnchorRef.current || !Number.isFinite(dateMs)) {
            return 'unavailable'
        }

        const anchor = wallAnchorRef.current
        const target = anchor.mediaTime + (dateMs - anchor.dateMs) / 1000
        const safeEnd = Math.max(dvr.start, dvr.end - SEEK_END_MARGIN_SECS)
        if (target < dvr.start || target > dvr.end) {
            return 'out-of-range'
        }

        draggingRef.current = false
        setDragOffset(null)
        video.currentTime = Math.min(safeEnd, Math.max(dvr.start + 0.05, target))
        return 'ok'
    }, [])

    const goLive = useCallback(() => {
        setLeftLiveAtMs(null)
        setDragOffset(null)
        const video = videoRef.current
        const dvr = dvrRangeRef.current
        if (!video || !dvr) {
            return
        }
        // Về ĐIỂM ĐỒNG BỘ LIVE, không về mép playlist.
        //
        // Mép playlist là điểm ngay sau segment cuối, và hls.js chưa buffer tới đó -- nhảy vào đấy là
        // tự đặt playhead vào chỗ không có gì phía trước, phát hết segment cuối rồi đứng chờ segment
        // kế. Nút "Về hiện tại" giờ nằm trong dải cảnh báo nên được bấm thường xuyên hơn, và một cú
        // giật mỗi lần bấm sẽ dạy người ta đừng bấm nó.
        //
        // `liveSyncPosition` là con số hls.js tự nhắm tới; chỉ tính tay khi không có nó (nhánh native
        // HLS của Safari, nơi engine tự quản việc bám live).
        const syncPosition = hlsRef.current?.liveSyncPosition
        const target =
            typeof syncPosition === 'number' && Number.isFinite(syncPosition)
                ? syncPosition
                : dvr.end - LIVE_SYNC_DURATION_COUNT * targetDurationRef.current
        video.currentTime = Math.min(
            Math.max(dvr.start, dvr.end - SEEK_END_MARGIN_SECS),
            Math.max(dvr.start, target),
        )
    }, [])

    const toggleMute = useCallback(() => {
        const video = videoRef.current
        if (!video) {
            return
        }
        video.muted = !video.muted
        setIsMuted(video.muted)
    }, [])

    const setVolume = useCallback((next: number) => {
        const video = videoRef.current
        const clamped = Math.min(1, Math.max(0, next))
        setVolumeState(clamped)
        if (!video) {
            return
        }
        video.volume = clamped
        // Kéo âm lượng lên thì bỏ tắt tiếng luôn: để nguyên `muted` sẽ khiến thanh nhích mà vẫn
        // không nghe được gì, và người xem kết luận là luồng không có tiếng.
        if (clamped > 0 && video.muted) {
            video.muted = false
            setIsMuted(false)
        }
    }, [])

    /** Phát lại sau khi trình duyệt chặn autoplay -- chỉ dùng cho đúng tình huống đó. */
    const resume = useCallback(() => {
        const video = videoRef.current
        if (!video) {
            return
        }
        video.play().then(
            () => setAutoplayBlocked(false),
            () => setAutoplayBlocked(true),
        )
    }, [])

    return {
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
    }
}
