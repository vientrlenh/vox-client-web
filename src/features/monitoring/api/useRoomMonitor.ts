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
                // để lại ô xám vĩnh viễn.
                endedAt: undefined,
            })
            return next
        }

        case 'participant': {
            const event = action.event
            const next = new Map(state)
            if (event.type === 'joined') {
                const prev = next.get(event.streamId)
                next.set(event.streamId, {
                    streamId: event.streamId,
                    streamType: event.streamType,
                    participantId: event.participantId,
                    startedAt: event.at,
                    ...prev,
                    endedAt: undefined,
                })
            } else {
                const prev = next.get(event.streamId)
                if (prev) {
                    next.set(event.streamId, { ...prev, endedAt: Date.parse(event.at) || Date.now() })
                }
            }
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
    return { alerts, connectionState, streamToken: token, streams }
}
