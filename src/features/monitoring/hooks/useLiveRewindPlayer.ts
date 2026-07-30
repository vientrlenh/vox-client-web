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
    const followingLiveRef = useRef(true)
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
    const [isFollowingLive, setIsFollowingLive] = useState(true)

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
        followingLiveRef.current = true
        setIsFollowingLive(true)
        setSeek(null)
        setStatus({ kind: 'loading', message: 'Đang tải luồng…' })

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
                video.onloadedmetadata = () => setStatus({ kind: 'playing', message: '' })
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
                liveSyncDurationCount: 3,
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

            // Thanh trượt trải trên TOÀN BỘ thời gian stream đã chạy - [lúc gửi yêu cầu .. bây giờ] -
            // chứ không chỉ phần tua được. Đó là thứ giữ cho độ dài thanh bằng đúng thời lượng stream
            // dù trình phát gắn vào lúc nào hay đã bị dựng lại bao nhiêu lần.
            const absolute = wallAnchorRef.current !== null && !Number.isNaN(streamStartMs)
            if (!draggingRef.current || !seekDomainRef.current) {
                seekDomainRef.current = absolute
                    ? { absolute: true, endMs: Date.now(), startMs: streamStartMs }
                    : { absolute: false, endMs: 0, startMs: 0 }
            }
            const domain = seekDomainRef.current

            if (domain.absolute) {
                const toOffset = (ms: number) => (ms - domain.startMs) / 1000
                setSeek({
                    absolute: true,
                    domainEndOffset: toOffset(domain.endMs),
                    dvrEndOffset: toOffset(mediaToDate(dvr.end)),
                    dvrStartOffset: toOffset(mediaToDate(dvr.start)),
                    playheadOffset: toOffset(mediaToDate(video.currentTime)),
                })
            } else {
                setSeek({
                    absolute: false,
                    domainEndOffset: dvr.end,
                    dvrEndOffset: dvr.end,
                    dvrStartOffset: dvr.start,
                    playheadOffset: video.currentTime,
                })
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scheduleId, streamId, dateToMedia, mediaToDate, readDvrWindow, requestFreshToken])

    const onScrubStart = useCallback(() => {
        draggingRef.current = true
        followingLiveRef.current = false
        setIsFollowingLive(false)
    }, [])

    /** Tua tới `offsetSecs` giây kể từ lúc stream bắt đầu - chính là đơn vị của thanh trượt. */
    const onScrubCommit = useCallback(
        (offsetSecs: number) => {
            draggingRef.current = false
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

    const goLive = useCallback(() => {
        followingLiveRef.current = true
        setIsFollowingLive(true)
        const video = videoRef.current
        const dvr = dvrRangeRef.current
        if (video && dvr) {
            video.currentTime = Math.max(dvr.start, dvr.end - SEEK_END_MARGIN_SECS)
        }
    }, [])

    return { goLive, isFollowingLive, onScrubCommit, onScrubStart, seek, status, videoRef }
}
