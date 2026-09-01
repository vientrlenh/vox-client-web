import { act, renderHook, waitFor } from '@testing-library/react'

import { useScheduleMonitor } from './useRoomMonitor'

/**
 * Bàn thử cho đường sống-chết của phòng giám sát.
 *
 * <p>Thứ được kiểm ở đây không phải là "nối được không", mà là chuyện xảy ra khi socket ĐÓNG -- tín
 * hiệu duy nhất báo cho giám thị biết một học viên đang gặp chuyện, và cho tới nay là phần không có
 * lấy một dòng test nào. Riêng trường hợp đóng SẠCH từng làm cả phòng chết lặng lẽ: nó chỉ bắn
 * close chứ không bắn error, mà bản cũ chỉ cài onerror.
 */

const refetchToken = jest.fn()
let currentToken: string | undefined = 'token-1'

jest.mock('./useMonitorToken', () => ({
    useMonitorToken: () => ({ data: currentToken, refetch: refetchToken }),
}))

jest.mock('./streamClient', () => ({
    buildMonitorSocketUrl: (scheduleId: string, token: string) =>
        `wss://stream.test/ws/monitor?scheduleId=${scheduleId}&token=${token}`,
    fetchScheduleStreams: jest.fn(() => Promise.resolve([])),
}))

type Handler = ((event: unknown) => void) | null

class FakeWebSocket {
    static instances: FakeWebSocket[] = []

    onclose: Handler = null
    onerror: Handler = null
    onmessage: Handler = null
    onopen: Handler = null

    closed = false
    readonly url: string

    constructor(url: string) {
        this.url = url
        FakeWebSocket.instances.push(this)
    }

    close() {
        this.closed = true
    }

    /** Đóng như một proxy hết idle timeout: chỉ close, không error. */
    emitClose() {
        this.onclose?.({})
    }

    /** Đóng bất thường: theo spec là error RỒI close, nên bản giả phải bắn cả hai. */
    emitErrorThenClose() {
        this.onerror?.({})
        this.onclose?.({})
    }

    emitMessage(payload: unknown) {
        this.onmessage?.({ data: JSON.stringify(payload) })
    }

    emitOpen() {
        this.onopen?.({})
    }
}

function latestSocket() {
    return FakeWebSocket.instances[FakeWebSocket.instances.length - 1]
}

function renderMonitor() {
    return renderHook(() => useScheduleMonitor({ examId: 'exam-1', scheduleId: 'sched-1' }))
}

/** Chạy hết hẹn giờ backoff rồi nhả cho promise xin token kịp giải quyết. */
async function advanceThroughReconnect() {
    await act(async () => {
        jest.runOnlyPendingTimers()
        await Promise.resolve()
        await Promise.resolve()
    })
}

beforeEach(() => {
    jest.useFakeTimers()
    FakeWebSocket.instances = []
    currentToken = 'token-1'
    refetchToken.mockReset()
    refetchToken.mockResolvedValue({ data: 'token-1' })
    global.WebSocket = FakeWebSocket as unknown as typeof WebSocket
})

afterEach(() => {
    jest.useRealTimers()
})

describe('useScheduleMonitor reconnect', () => {
    it('reconnects after a clean close that never fires an error', async () => {
        renderMonitor()
        expect(FakeWebSocket.instances).toHaveLength(1)

        act(() => {
            latestSocket().emitOpen()
        })
        act(() => {
            latestSocket().emitClose()
        })

        await advanceThroughReconnect()

        // Đây là cả lý do tồn tại của thay đổi này: bản cũ chỉ cài onerror, nên một lần đóng sạch
        // không mở lại socket nào và phòng đứng hình trong khi vẫn khoe "Đang kết nối trực tiếp".
        expect(FakeWebSocket.instances).toHaveLength(2)
    })

    it('opens exactly one socket when a failure fires error and close together', async () => {
        renderMonitor()

        act(() => {
            latestSocket().emitOpen()
        })
        act(() => {
            latestSocket().emitErrorThenClose()
        })

        await advanceThroughReconnect()

        // Nối lại ở cả onerror lẫn onclose sẽ ra hai socket cho cùng một lần rớt -- hai nguồn cùng
        // bơm vào một reducer.
        expect(FakeWebSocket.instances).toHaveLength(2)
    })

    it('waits for a fresh token before reconnecting', async () => {
        renderMonitor()
        refetchToken.mockResolvedValue({ data: 'token-2' })

        act(() => {
            latestSocket().emitOpen()
        })
        act(() => {
            latestSocket().emitClose()
        })

        await advanceThroughReconnect()

        expect(refetchToken).toHaveBeenCalled()
        // Bản cũ bắn `void refetchToken()` rồi nối ngay, nên lần thử lại mang đúng cái token vừa bị
        // từ chối -- hỏng đúng ở trường hợp socket chết VÌ token.
        expect(latestSocket().url).toContain('token=token-2')
    })

    it('keeps the token it has when the refetch fails', async () => {
        renderMonitor()
        refetchToken.mockRejectedValue(new Error('offline'))

        act(() => {
            latestSocket().emitOpen()
        })
        act(() => {
            latestSocket().emitClose()
        })

        await advanceThroughReconnect()

        expect(FakeWebSocket.instances).toHaveLength(2)
        expect(latestSocket().url).toContain('token=token-1')
    })

    it('ignores messages from a socket that has already been replaced', async () => {
        const { result } = renderMonitor()

        const stale = latestSocket()
        act(() => {
            stale.emitOpen()
            stale.emitMessage({
                streams: [
                    {
                        participantId: 'cand-1',
                        sessionId: 'sess-1',
                        startedAt: '2026-09-01T09:00:00.000Z',
                        streamId: 'stream-1',
                        streamType: 'camera',
                    },
                ],
                type: 'snapshot',
            })
        })
        expect(result.current.streams).toHaveLength(1)

        act(() => {
            stale.emitClose()
        })
        await advanceThroughReconnect()

        act(() => {
            latestSocket().emitOpen()
        })

        // Socket cũ nói lời cuối SAU khi đã bị thay. Snapshot của nó chỉ mang những luồng nó từng
        // biết, nên nếu lọt vào reducer thì nó đánh dấu "đã ngừng" cho học viên đang sống trên kết
        // nối mới.
        act(() => {
            stale.emitMessage({ streams: [], type: 'snapshot' })
        })

        expect(result.current.streams[0]?.endedAt).toBeUndefined()
    })

    it('escalates to error after repeated failures but keeps retrying', async () => {
        const { result } = renderMonitor()

        for (let attempt = 0; attempt < 4; attempt++) {
            act(() => {
                latestSocket().emitClose()
            })
            await advanceThroughReconnect()
        }

        await waitFor(() => {
            expect(result.current.connectionState).toBe('error')
        })

        const socketsSoFar = FakeWebSocket.instances.length
        act(() => {
            latestSocket().emitClose()
        })
        await advanceThroughReconnect()

        // 'error' là một lời mô tả, không phải một lần bỏ cuộc: ca thi đang chạy thì không có lúc
        // nào hợp lý để ngừng thử lại.
        expect(FakeWebSocket.instances.length).toBeGreaterThan(socketsSoFar)
    })

    it('stops reconnecting once the hook unmounts', async () => {
        const { unmount } = renderMonitor()

        const socket = latestSocket()
        act(() => {
            socket.emitOpen()
        })

        unmount()
        expect(socket.closed).toBe(true)
        expect(socket.onmessage).toBeNull()

        await advanceThroughReconnect()
        expect(FakeWebSocket.instances).toHaveLength(1)
    })
})
