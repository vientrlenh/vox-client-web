import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { MonitorConnectionState, FrameNotification, MonitorMessage, ParticipantEvent, StreamSnapshot } from "../types";
import { useMonitorToken } from "./useMonitorToken";
import { buildMonitorSocketUrl } from "./streamClient";

export type StreamView = StreamSnapshot & {
    latestFrameUrl?: string | null
    lastSeq?: number
    lastFrameAt?: number
}

type StreamsAction = 
    | { type: 'snapshot'; streams: StreamSnapshot[] }
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
            // Fire khi reconnect, giữ lại frame cũ nếu có
            const next = new Map<string, StreamView>()
            for (const stream of action.streams) {
                const prev = state.get(stream.streamId)
                next.set(stream.streamId, {
                    ...stream, 
                    latestFrameUrl: prev?.latestFrameUrl, 
                    lastSeq: prev?.lastSeq, 
                    lastFrameAt: prev?.lastFrameAt,
                })
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
                lastFrameAt: Date.now()
            })
            return next
        }

        case 'participant': {
            const event = action.event
            const next = new Map(state)
            if (event.type === 'joined') {
                if (!next.has(event.streamId)) {
                    next.set(event.streamId, {
                        streamId: event.streamId, 
                        streamType: event.streamType,
                        participantId: event.participantId, 
                        startedAt: event.at,
                    })
                }
            } else {
                next.delete(event.streamId)
            }
            return next
        }
            
        default:
            return state
    }
}

export function useRoomMonitor(roomId: string | undefined) {
    const { data: token, refetch: refetchToken } = useMonitorToken()
    const [streamMap, dispatch] = useReducer(
        streamsReducer, 
        undefined, 
        () => new Map<string, StreamView>()
    )
    const [connectionState, setConnectionState] = useState<MonitorConnectionState>('idle')

    const socketRef = useRef<WebSocket | null>(null)
    const tokenRef = useRef<string | null>(null)
    const reconnectRef = useRef(0)
    const closedRef = useRef(false)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // keep newest token for the reconnect attempt
    tokenRef.current = token?.token ?? null
    const hasToken = Boolean(token?.token)

    useEffect(() => {
        if (!roomId || !hasToken) {
            setConnectionState('idle')
            return
        }

        closedRef.current = false
        
        function connect() {
            const activeToken = tokenRef.current
            if (!activeToken || closedRef.current) return

            setConnectionState(reconnectRef.current === 0 ? 'connecting' : 'reconnecting')
            const ws = new WebSocket(buildMonitorSocketUrl(roomId!, activeToken))
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
                        // detect violation
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
            setConnectionState('closed')
        }
    }, [roomId, hasToken, refetchToken])

    const streams = useMemo(() => Array.from(streamMap.values()), [streamMap])
    return { connectionState, streams }
}