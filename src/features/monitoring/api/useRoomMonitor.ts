import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { AlertEvent, MonitorConnectionState, FrameNotification, MonitorMessage, ParticipantEvent, ScheduleStreamRecord, StreamSnapshot } from "../types";
import { useMonitorToken } from "./useMonitorToken";
import { buildMonitorSocketUrl, fetchScheduleStreams } from "./streamClient";

export type StreamView = StreamSnapshot & {
    latestFrameUrl?: string | null
    lastSeq?: number
    lastFrameAt?: number
    /**
     * Thời điểm stream ngừng, undefined nghĩa là đang sống.
     *
     * <p>Stream đã ngừng được GIỮ LẠI thay vì xoá khỏi map. Với giám sát thi, một học viên biến mất
     * là sự kiện nặng hơn một học viên đứng hình - nó không được biểu hiện bằng việc một ô lặng lẽ
     * mất đi giữa lưới mà không ai kịp nhận ra.
     */
    endedAt?: number
    /**
     * Thời điểm server báo transport rớt, undefined nghĩa là đang nối bình thường.
     *
     * <p>Khác `endedAt` ở chỗ luồng CHƯA đóng: peer còn trong cửa sổ reconnect và có thể sống lại.
     * Đây là câu trả lời chắc chắn cho "học viên này còn kết nối không", thay cho việc suy đoán từ
     * việc bao lâu rồi không có khung hình mới.
     */
    disconnectedAt?: number
}

type StreamsAction =
    | { type: 'snapshot'; streams?: StreamSnapshot[] }
    | { type: 'frame'; frame: FrameNotification }
    | { type: 'participant'; event: ParticipantEvent }
    | { type: 'reset' }
    | { type: 'seed'; streams: ScheduleStreamRecord[] }

function streamsReducer(
    state: Map<string, StreamView>, 
    action: StreamsAction
): Map<string, StreamView> {
    switch (action.type) {
        case 'reset':
            return new Map()
        case 'seed': {
            // Nạp lịch sử luồng của ca thi từ server, chạy MỘT lần lúc mở phòng.
            //
            // Chỉ THÊM chứ không thay: seed có thể về sau snapshot, và khi đó thứ nó mang là bản
            // chụp cũ hơn -- ghi đè sẽ hạ một luồng đang sống xuống thành đã kết thúc. Vì vậy entry
            // đã có luôn thắng, bất kể ai tới trước.
            const next = new Map(state)
            for (const record of action.streams) {
                if (next.has(record.streamId)) {
                    continue
                }
                next.set(record.streamId, {
                    endedAt: record.endedAt ? Date.parse(record.endedAt) || Date.now() : undefined,
                    participantId: record.participantId,
                    sessionId: record.sessionId,
                    startedAt: record.startedAt,
                    streamId: record.streamId,
                    streamType: record.streamType,
                })
            }
            return next
        }
        case 'snapshot': {
            // Fire khi reconnect, giữ lại frame cũ nếu có.
            // ?? [] chứ không tin thẳng vào payload: đây là dữ liệu từ dây, và một trường thiếu
            // KHÔNG được phép làm sập cả trang giám sát. Trước đây server bỏ qua `streams` khi ca
            // thi chưa có ai lên sóng, và vòng for...of trên undefined ném lỗi ngay trong reducer -
            // React gỡ luôn cây component, giám thị nhận màn hình trắng.
            const incoming = action.streams ?? []
            const next = new Map<string, StreamView>()
            for (const stream of incoming) {
                const prev = state.get(stream.streamId)
                next.set(stream.streamId, {
                    ...stream,
                    latestFrameUrl: prev?.latestFrameUrl,
                    lastSeq: prev?.lastSeq,
                    lastFrameAt: prev?.lastFrameAt,
                    // Còn trong snapshot chỉ có nghĩa là peer chưa đóng - mà suốt cửa sổ reconnect
                    // thì đúng là chưa đóng. Nên snapshot không phải bằng chứng đã nối lại, và
                    // không được xoá dấu mất kết nối; chỉ 'reconnected' hoặc một khung hình mới mới
                    // xoá được.
                    disconnectedAt: prev?.disconnectedAt,
                })
            }
            // Snapshot là nguồn sự thật về việc AI đang sống, nên stream cũ không còn trong đó là đã
            // ngừng. Giữ lại và đánh dấu, thay vì để nó biến mất: cách này còn bắt được cả những
            // stream chết trong lúc socket đang đứt, tức đúng lúc sự kiện 'left' không tới nơi.
            for (const [streamId, prev] of state) {
                if (next.has(streamId)) {
                    continue
                }
                next.set(streamId, { ...prev, endedAt: prev.endedAt ?? Date.now() })
            }
            return next
        }
        case 'frame': {
            const frame = action.frame
            const prev = state.get(frame.streamId)
            
            // skip late frame / out-of-order using sequence no
            if (prev?.lastSeq !== undefined && frame.sequenceNo <= prev.lastSeq) {
                return state
            }

            const next = new Map(state)
            next.set(frame.streamId, {
                // frame come before snapshot/joined, create temporary entry
                streamId: frame.streamId,
                streamType: frame.streamType,
                participantId: prev?.participantId ?? frame.participantId ?? '',
                startedAt: prev?.startedAt ?? '',
                ...prev,
                latestFrameUrl: frame.frameUrl,
                lastSeq: frame.sequenceNo,
                lastFrameAt: Date.now(),
                // Frame mới về nghĩa là stream sống lại: gỡ dấu đã-ngừng để một lần rớt ngắn không
                // để lại ô xám vĩnh viễn. Khung hình đang chảy là bằng chứng mạnh hơn mọi sự kiện
                // nói ngược lại, nên nó xoá luôn cả dấu mất kết nối.
                disconnectedAt: undefined,
                endedAt: undefined,
            })
            return next
        }

        case 'participant': {
            const event = action.event
            const next = new Map(state)
            const prev = next.get(event.streamId)

            if (event.type === 'joined') {
                next.set(event.streamId, {
                    ...prev,
                    streamId: event.streamId,
                    streamType: event.streamType,
                    // Sự kiện 'joined' là nguồn ĐÚNG NHẤT về chủ nhân của luồng, nên nó phải ghi đè
                    // lên prev chứ không ngược lại. Frame notification của vox-streaming không mang
                    // participantId, nên một frame về trước 'joined' (Kafka chậm hơn Redis pub/sub)
                    // tạo ra ô tạm với participantId rỗng - và với thứ tự spread cũ, cái rỗng đó
                    // thắng vĩnh viễn: luồng mồ côi, không bao giờ ghép được roster, không hiện tên
                    // và không bấm "Hủy bài thi" được.
                    participantId: event.participantId || prev?.participantId || '',
                    startedAt: prev?.startedAt || event.at,
                    disconnectedAt: undefined,
                    endedAt: undefined,
                })
                return next
            }

            // Không dựng ô mới từ một tin "đã rời"/"mất kết nối": ô đó sẽ chẳng có gì để hiện. Nếu
            // luồng thật sự còn sống thì snapshot định kỳ sẽ dựng lại nó trong vòng một nhịp.
            if (!prev) {
                return next
            }

            const at = Date.parse(event.at) || Date.now()
            if (event.type === 'left') {
                next.set(event.streamId, {
                    ...prev,
                    // Ai báo trước thì thắng: cùng một luồng phát 'left' hai lần - trực tiếp từ peer
                    // ngay lúc đóng, rồi lại qua Kafka sau khi chốt xong bản ghi. Lần thứ hai tới
                    // sau đó hàng chục giây, nên ghi đè sẽ đẩy mốc "mất lúc" trôi khỏi thời điểm
                    // thật và giám thị đọc sai thời điểm học viên biến mất.
                    endedAt: prev.endedAt ?? at,
                })
                return next
            }

            if (event.type === 'disconnected') {
                next.set(event.streamId, { ...prev, disconnectedAt: prev.disconnectedAt ?? at })
                return next
            }

            next.set(event.streamId, { ...prev, disconnectedAt: undefined })
            return next
        }
            
        default:
            return state
    }
}

/**
 * Số cảnh báo giữ lại trong bộ nhớ. Đủ để giám thị cuộn lại vài phút vừa qua mà không biến một ca
 * thi dài thành rò rỉ bộ nhớ; lịch sử đầy đủ thuộc về bản ghi phía server, không phải tab này.
 */
const MAX_ALERTS = 100

/**
 * Số lần thử lại liên tiếp trước khi phòng tự nhận là đang hỏng thật, thay vì chỉ đang chớp.
 *
 * <p>Vẫn thử lại mãi sau mốc này -- một ca thi đang chạy thì không có lúc nào là lúc hợp lý để bỏ
 * cuộc. Đây thuần tuý là chuyện nói thật với giám thị: bốn lần trượt liên tiếp đã là khoảng 7 giây,
 * đủ lâu để "Đang kết nối lại..." biến thành một lời trấn an sai.
 */
const ATTEMPTS_BEFORE_ERROR = 4

export type AlertView = AlertEvent & { receivedAt: number }

type UseScheduleMonitorParams = {
    examId?: string
    scheduleId?: string
}

export function useScheduleMonitor({ examId, scheduleId }: UseScheduleMonitorParams) {
    const { data: token, refetch: refetchToken } = useMonitorToken({
        examId: examId ?? '', 
        scheduleIds: scheduleId ? [scheduleId] : []
    })
    const [streamMap, dispatch] = useReducer(
        streamsReducer, 
        undefined, 
        () => new Map<string, StreamView>()
    )
    const [connectionState, setConnectionState] = useState<MonitorConnectionState>('idle')
    const [alerts, setAlerts] = useState<AlertView[]>([])

    const pushAlert = useCallback((alert: AlertEvent) => {
        setAlerts((prev) => [{ ...alert, receivedAt: Date.now() }, ...prev].slice(0, MAX_ALERTS))
    }, [])

    const socketRef = useRef<WebSocket | null>(null)
    const tokenRef = useRef<string | null>(null)
    const reconnectRef = useRef(0)
    const closedRef = useRef(false)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const hasToken = Boolean(token)

    // keep newest token for the reconnect attempt, without retriggering the connect effect below
    useEffect(() => {
        tokenRef.current = token ?? null
    }, [token])

    /**
     * Nạp lịch sử luồng của ca thi, một lần cho mỗi lần mở phòng.
     *
     * <p>Đây là thứ khiến phòng giám sát sống sót qua F5. Bản đồ luồng vốn chỉ được dựng từ snapshot
     * WebSocket, mà snapshot chỉ trả luồng ĐANG sống -- nên nạp lại trang giữa ca là mọi học viên đã
     * rớt biến mất, kèm theo đường vào đoạn ghi của họ, dù đoạn ghi vẫn còn nguyên phía server.
     *
     * <p>Lỗi thì bỏ qua trong im lặng: seed chỉ là lớp phủ thêm lên luồng trực tiếp, và một phòng
     * thiếu vài ô đã kết thúc vẫn tốt hơn nhiều so với một phòng không mở được.
     */
    useEffect(() => {
        const activeToken = tokenRef.current
        if (!scheduleId || !activeToken) {
            return
        }
        let cancelled = false
        fetchScheduleStreams(scheduleId, activeToken)
            .then((streams) => {
                if (!cancelled && streams.length > 0) {
                    dispatch({ streams, type: 'seed' })
                }
            })
            .catch(() => {})
        return () => {
            cancelled = true
        }
        // `hasToken` chứ không phải `token`: cái sau được làm mới mỗi 4 phút và sẽ gọi lại API mỗi
        // lần gia hạn cho dữ liệu gần như không đổi, còn cái này lật false->true đúng một lần. Phải
        // có nó trong deps -- lần render đầu token thường chưa về, và chỉ khoá theo scheduleId thì
        // seed sẽ không bao giờ chạy.
    }, [hasToken, scheduleId])

    useEffect(() => {
        if (!scheduleId || !hasToken) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing connection state with the external WebSocket lifecycle
            setConnectionState('idle')
            return
        }

        closedRef.current = false

        /**
         * Gỡ hết handler RỒI mới đóng.
         *
         * <p>Chỗ này trước đây chỉ gán `socketRef.current = null`, tức là bỏ tham chiếu chứ không bỏ
         * cái socket: handler vẫn còn treo trên nó. Một socket cũ đang giãy chết vì thế vẫn đẩy được
         * snapshot vào reducer, và snapshot của nó chỉ chứa những luồng nó từng biết -- đủ để đánh
         * dấu "đã ngừng" cho những học viên đang sống rất khoẻ trên kết nối vừa lập lại.
         */
        function discard(socket: WebSocket | null) {
            if (!socket) {
                return
            }
            socket.onopen = null
            socket.onmessage = null
            socket.onerror = null
            socket.onclose = null
            try {
                socket.close()
            } catch {
                // Đóng một socket đã chết không phải là lỗi đáng báo.
            }
        }

        /** Trạng thái hiển thị lúc chưa nối được, tách ra để hai chỗ dùng không lệch nhau. */
        function pendingState(): MonitorConnectionState {
            if (reconnectRef.current === 0) {
                return 'connecting'
            }
            return reconnectRef.current >= ATTEMPTS_BEFORE_ERROR ? 'error' : 'reconnecting'
        }

        function scheduleReconnect() {
            const attempt = (reconnectRef.current += 1)
            const ceiling = Math.min(30_000, 1000 * 2 ** (attempt - 1))
            // Nửa cố định + nửa ngẫu nhiên. Khi server khởi động lại, MỌI tab giám thị đều rớt trong
            // cùng một giây; không có jitter thì tất cả cũng gõ cửa lại đúng cùng một thời điểm, và
            // đợt nối đồng loạt đó là thứ dễ làm một server vừa sống lại chết thêm lần nữa.
            const delay = ceiling / 2 + Math.random() * (ceiling / 2)

            setConnectionState(pendingState())
            timerRef.current = setTimeout(() => {
                void reconnect()
            }, delay)
        }

        /**
         * Xin token mới TRƯỚC khi nối lại, thay vì bắn `void refetchToken()` rồi nối ngay.
         *
         * <p>Lần thử đầu chỉ cách lúc rớt khoảng một giây, nên bản cũ gần như chắc chắn nối lại bằng
         * đúng cái token vừa bị từ chối. Thường thì không sao -- useMonitorToken tự làm mới mỗi 4
         * phút nên trong tay đã sẵn token còn hạn -- nhưng đúng trường hợp cần nhất, là socket chết
         * VÌ token, thì nó lại hỏng: mọi lần thử lại đều mang theo token đã chết cho tới khi một
         * nhịp làm mới định kỳ tình cờ chen vào.
         */
        async function reconnect() {
            if (closedRef.current) {
                return
            }
            try {
                const refreshed = await refetchToken()
                if (refreshed.data) {
                    tokenRef.current = refreshed.data
                }
            } catch {
                // Giữ token đang có và cứ thử: xin token hỏng thường là vì mạng, mà mạng hỏng thì
                // socket bên dưới cũng hỏng theo và vòng lặp này tự chạy tiếp.
            }
            if (closedRef.current) {
                return
            }
            connect()
        }

        function connect() {
            const activeToken = tokenRef.current
            if (!activeToken || closedRef.current) {
                return
            }

            // Socket cũ (nếu còn) phải chết hẳn trước khi có socket mới, nếu không hai socket cùng
            // bơm vào một reducer.
            discard(socketRef.current)

            let ws: WebSocket
            try {
                ws = new WebSocket(buildMonitorSocketUrl(scheduleId!, activeToken))
            } catch {
                // Hàm này chạy bên trong một promise (xem reconnect), nên ngoại lệ ở đây sẽ thành
                // unhandled rejection chứ không dừng lại ở đâu cả.
                scheduleReconnect()
                return
            }
            socketRef.current = ws
            setConnectionState(pendingState())

            ws.onopen = () => {
                if (socketRef.current !== ws) {
                    return
                }
                reconnectRef.current = 0
                setConnectionState('connected')
            }

            ws.onmessage = (event) => {
                if (socketRef.current !== ws) {
                    return
                }
                let message: MonitorMessage
                try {
                    message = JSON.parse(event.data as string) as MonitorMessage
                } catch {
                    return
                }
                switch (message.type) {
                    case 'snapshot':
                        dispatch({ type: 'snapshot', streams: message.streams })
                        break
                    case 'frame':
                        dispatch({ type: 'frame', frame: message.frame })
                        break
                    case 'participant':
                        dispatch({ type: 'participant', event: message.event })
                        break
                    case 'alert':
                        pushAlert(message.alert)
                        break
                    default:
                        break
                }
            }

            // Nối lại nằm ở onclose, và CHỈ ở onclose.
            //
            // Trước đây nó nằm ở onerror, chỗ duy nhất được cài -- nên một lần đóng SẠCH (server gửi
            // close frame, đúng thứ mọi proxy/ingress làm khi hết idle timeout) chỉ bắn close chứ
            // không bắn error, và phòng giám sát chết lặng lẽ: badge vẫn ghi "Đang kết nối trực
            // tiếp" trong khi không còn khung hình nào về, rồi mọi ô lần lượt quá ngưỡng và cả phòng
            // cùng báo mất kết nối -- một báo động giả mà giám thị không phân biệt nổi với thật.
            //
            // Đổi hẳn sang onclose thay vì cài thêm: theo spec thì một kết nối hỏng bắn error RỒI
            // bắn close, nên để cả hai cùng nối lại là đặt hai hẹn giờ và mở hai socket cho cùng một
            // lần rớt. onclose là tín hiệu bắn đúng một lần cho mọi kiểu đóng, sạch hay không.
            ws.onclose = () => {
                if (socketRef.current !== ws) {
                    return
                }
                socketRef.current = null
                if (closedRef.current) {
                    return
                }
                scheduleReconnect()
            }
        }
        connect()

        return () => {
            // close ws when leaving the page, do not close converter lazy-gate
            // consume CPU/storage to produce .jpg for no-eye rooms
            closedRef.current = true
            if (timerRef.current) {
                clearTimeout(timerRef.current)
                timerRef.current = null
            }
            discard(socketRef.current)
            socketRef.current = null
            reconnectRef.current = 0
            dispatch({ type: 'reset' })
            setAlerts([])
            setConnectionState('closed')
        }
    }, [scheduleId, hasToken, refetchToken, pushAlert])

    const streams = useMemo(() => Array.from(streamMap.values()), [streamMap])
    // Token được trả ra ngoài để trình phát live-rewind dùng chung một nguồn: manifest HLS bị poll
    // lại liên tục và mỗi lần poll đều xác thực lại token, nên nó cần đúng bản mới nhất mà hook này
    // đang giữ. Tự quản một vòng refresh riêng sẽ tạo ra hai đồng hồ lệch nhau cho cùng một TTL.
    // refreshStreamToken được trả ra vì cùng lý do với streamToken: trình phát live-rewind là bên
    // duy nhất thấy được server từ chối token (WebSocket đã tự chữa qua ws.onerror), nhưng nó không
    // tự lấy token được. Không có đường này thì một token hết hạn khiến hls.js retry vô hạn bằng
    // đúng token đã chết và luồng đứng vĩnh viễn.
    return { alerts, connectionState, refreshStreamToken: refetchToken, streamToken: token, streams }
}
