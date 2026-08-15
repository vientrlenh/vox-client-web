import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { AlertEvent, MonitorConnectionState, FrameNotification, MonitorMessage, ParticipantEvent, StreamSnapshot } from "../types";
import { useMonitorToken } from "./useMonitorToken";
import { buildMonitorSocketUrl } from "./streamClient";

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

function streamsReducer(
    state: Map<string, StreamView>, 
    action: StreamsAction
): Map<string, StreamView> {
    switch (action.type) {
        case 'reset': 
            return new Map()
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

    useEffect(() => {
        if (!scheduleId || !hasToken) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing connection state with the external WebSocket lifecycle
            setConnectionState('idle')
            return
        }

        closedRef.current = false
        
        function connect() {
            const activeToken = tokenRef.current
            if (!activeToken || closedRef.current) return

            setConnectionState(reconnectRef.current === 0 ? 'connecting' : 'reconnecting')
            const ws = new WebSocket(buildMonitorSocketUrl(scheduleId!, activeToken))
            socketRef.current = ws

            ws.onopen = () => {
                reconnectRef.current = 0
                setConnectionState('connected')
            }

            ws.onmessage = (event) => {
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

            ws.onerror = () => {
                socketRef.current = null
                if (closedRef.current) return

                // token expires in the middle of exam session -> request a new token
                void refetchToken()
                const attempt = (reconnectRef.current += 1)
                const delay = Math.min(30_000, 1000 * 2 ** (attempt - 1))
                setConnectionState('reconnecting')
                timerRef.current = setTimeout(connect, delay)
                // if fail to refetch token multiple times -> set error and stop streaming
            }
        }
        connect()

        return () => {
            // close ws when leaving the page, do not close converter lazy-gate
            // consume CPU/storage to produce .jpg for no-eye rooms
            closedRef.current = true
            if (timerRef.current) clearTimeout(timerRef.current)
            socketRef.current?.close()
            socketRef.current = null
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
