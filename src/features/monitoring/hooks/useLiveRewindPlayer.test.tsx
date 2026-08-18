import { act, fireEvent, render } from '@testing-library/react'

import type { StreamView } from '../api/useRoomMonitor'

/**
 * Bàn thử cho đường kéo thanh tua.
 *
 * <p>hls.js được thay bằng bản giả vì thứ cần kiểm không phải nó, mà là phép bắc cầu giữa ba hệ toạ
 * độ mà trình phát phải nối: offset trên thanh trượt (giây kể từ lúc stream bắt đầu), giờ thực
 * (PROGRAM-DATE-TIME), và `currentTime` của thẻ video. Sai ở bất kỳ cầu nào cũng cho ra đúng một
 * triệu chứng nhìn từ ngoài: kéo thanh mà hình không nhúc nhích.
 */

type FragmentStub = { duration: number; programDateTime: number; start: number }

const EVENTS = {
    ERROR: 'hlsError',
    LEVEL_UPDATED: 'hlsLevelUpdated',
    MANIFEST_PARSED: 'hlsManifestParsed',
} as const

type FakeHlsInstance = {
    attachMedia: () => void
    destroy: () => void
    emit: (event: string, data?: unknown) => void
    liveSyncPosition: null | number
    loadSource: () => void
}

type FakeHlsClass = {
    instances: FakeHlsInstance[]
}

// Class phải khai báo BÊN TRONG factory: jest kéo `jest.mock` lên đầu module, nên mọi thứ định
// nghĩa ở ngoài đều chưa tồn tại lúc factory chạy.
jest.mock('hls.js', () => {
    const events = {
        ERROR: 'hlsError',
        LEVEL_UPDATED: 'hlsLevelUpdated',
        MANIFEST_PARSED: 'hlsManifestParsed',
    }

    class FakeHls {
        static Events = events
        static ErrorTypes = { MEDIA_ERROR: 'mediaError', NETWORK_ERROR: 'networkError' }
        static isSupported = () => true
        static instances: FakeHls[] = []

        liveSyncPosition: null | number = null
        private handlers = new Map<string, ((event: string, data: unknown) => void)[]>()

        constructor() {
            FakeHls.instances.push(this)
        }

        on(event: string, handler: (event: string, data: unknown) => void) {
            const list = this.handlers.get(event) ?? []
            list.push(handler)
            this.handlers.set(event, list)
        }

        emit(event: string, data?: unknown) {
            for (const handler of this.handlers.get(event) ?? []) {
                handler(event, data)
            }
        }

        loadSource() {}
        attachMedia() {}
        startLoad() {}
        recoverMediaError() {}
        destroy() {}
    }

    return { __esModule: true, default: FakeHls }
})

import Hls from 'hls.js'

import { LiveRewindPanel } from '../components/LiveRewindPanel'

const FakeHls = Hls as unknown as FakeHlsClass

const STREAM_START_ISO = '2026-08-18T09:00:00.000Z'
const STREAM_START_MS = Date.parse(STREAM_START_ISO)
const SEGMENT_SECS = 4
const FRAGMENT_COUNT = 100
/** 100 đoạn × 4 giây: mép thu ở giây 400 kể từ lúc stream bắt đầu. */
const EDGE_SECS = SEGMENT_SECS * FRAGMENT_COUNT
/** hls.js đậu playhead lùi 3 nhịp khỏi mép thu (liveSyncDurationCount). */
const LIVE_SYNC_SECS = EDGE_SECS - 3 * SEGMENT_SECS

function levelUpdatedPayload() {
    const fragments: FragmentStub[] = []
    for (let index = 0; index < FRAGMENT_COUNT; index += 1) {
        fragments.push({
            duration: SEGMENT_SECS,
            programDateTime: STREAM_START_MS + index * SEGMENT_SECS * 1000,
            start: index * SEGMENT_SECS,
        })
    }
    return { details: { fragments, targetduration: SEGMENT_SECS } }
}

const LIVE_STREAM: StreamView = {
    participantId: 'cand-1',
    startedAt: STREAM_START_ISO,
    streamId: 'cam-1',
    streamType: 'camera',
}

describe('thanh tua live rewind', () => {
    let currentTime = 0

    beforeEach(() => {
        jest.useFakeTimers()
        FakeHls.instances = []
        currentTime = LIVE_SYNC_SECS
        HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve())
        Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
            configurable: true,
            get: () => currentTime,
            set: (next: number) => {
                currentTime = next
            },
        })
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    function mount(stream: StreamView = LIVE_STREAM, options: { liveSyncPosition?: null | number } = {}) {
        const { container } = render(
            <LiveRewindPanel
                availableStreams={[stream]}
                onClose={() => {}}
                onSelectStream={() => {}}
                participantName="Nguyễn Văn A"
                scheduleId="sch-1"
                stream={stream}
                token="tok"
            />,
        )
        const hls = FakeHls.instances[0]
        act(() => {
            hls.liveSyncPosition =
                options.liveSyncPosition === undefined ? LIVE_SYNC_SECS : options.liveSyncPosition
            hls.emit(EVENTS.MANIFEST_PARSED)
            hls.emit(EVENTS.LEVEL_UPDATED, levelUpdatedPayload())
            jest.advanceTimersByTime(600)
        })
        return {
            slider: container.querySelector('input[type=range]') as HTMLInputElement,
        }
    }

    it('mép phải của thanh là điểm đồng bộ live, không phải mép thu', () => {
        const { slider } = mount()

        expect(slider.disabled).toBe(false)
        expect(Number(slider.max)).toBeCloseTo(LIVE_SYNC_SECS, 1)
    })

    it('kéo về một mốc rồi thả thì playhead nhảy tới đúng mốc đó', () => {
        const { slider } = mount()

        act(() => {
            fireEvent.pointerDown(slider)
            fireEvent.change(slider, { target: { value: '100' } })
            fireEvent.pointerUp(slider)
        })

        // Offset 100 giây kể từ lúc stream bắt đầu, và fragment đầu tiên được ghi ĐÚNG lúc đó, nên
        // trong hệ toạ độ media nó cũng là giây 100.
        expect(currentTime).toBeCloseTo(100, 1)
    })

    it('bản ghi đã kết thúc thì thanh trải hết đoạn, không chừa lại mép live', () => {
        // hls.js vẫn trả `liveSyncPosition` cho playlist VOD, nên nếu tin nó thì mép phải của thanh
        // tụt lại ~12 giây và con trượt không bao giờ tới được đoạn kết -- đúng đoạn hay cần xem nhất.
        const recorded: StreamView = { ...LIVE_STREAM, endedAt: STREAM_START_MS + EDGE_SECS * 1000 }
        const { slider } = mount(recorded, { liveSyncPosition: LIVE_SYNC_SECS })

        expect(Number(slider.max)).toBeCloseTo(EDGE_SECS, 1)
    })

    it('trên bản ghi đã kết thúc, tua TỚI phải chạy được', () => {
        // Playlist đã đóng bằng #EXT-X-ENDLIST nên hls.js sang chế độ VOD và thôi báo điểm đồng bộ
        // live. Đây là nhánh dự phòng tính tay -- và cũng là nửa còn lại của triệu chứng.
        const recorded: StreamView = { ...LIVE_STREAM, endedAt: STREAM_START_MS + EDGE_SECS * 1000 }
        currentTime = 0
        const { slider } = mount(recorded, { liveSyncPosition: null })

        act(() => {
            fireEvent.pointerDown(slider)
            fireEvent.change(slider, { target: { value: '300' } })
            fireEvent.pointerUp(slider)
        })

        expect(currentTime).toBeCloseTo(300, 1)
    })

    /**
     * Thả tay sinh ra HAI sự kiện, không phải một.
     *
     * <p>`input[type=range]` tự bắt con trỏ lúc nhấn xuống, nên lúc nhả trình duyệt bắn `pointerup`
     * rồi `lostpointercapture`. Cả hai đều là đường chốt hợp lệ -- thả tay ra ngoài phạm vi thanh chỉ
     * có cái sau. Nhưng React kịp render lại giữa hai lần đó, và bản render ấy ghi giá trị cũ trở lại
     * DOM, nên lần chốt thứ hai đọc phải chính con số vừa bị bỏ đi và tua ngược về chỗ cũ.
     *
     * <p>Nhìn từ ngoài: kéo xong thả tay là hình nhảy về đoạn vừa đi qua.
     */
    it('thả tay chỉ chốt MỘT lần, dù trình duyệt bắn cả pointerup lẫn lostpointercapture', () => {
        const { slider } = mount()

        act(() => {
            fireEvent.pointerDown(slider)
            fireEvent.change(slider, { target: { value: '100' } })
        })
        // Ba act tách rời, cố ý: trong trình duyệt đây là ba sự kiện rời nhau, và React flush state
        // giữa chúng. Gộp vào một act là bỏ mất đúng cái khe mà lỗi chui qua.
        act(() => {
            fireEvent.pointerUp(slider)
        })
        act(() => {
            fireEvent.lostPointerCapture(slider)
        })

        expect(currentTime).toBeCloseTo(100, 1)
    })

    it('con trượt ở nguyên chỗ vừa thả trong lúc chờ playhead tới nơi', () => {
        const { slider } = mount()

        act(() => {
            fireEvent.pointerDown(slider)
            fireEvent.change(slider, { target: { value: '100' } })
        })
        act(() => {
            fireEvent.pointerUp(slider)
        })

        // Chưa có nhịp đo nào chạy kể từ lúc chốt: nếu thumb đã trả về `seek.playheadOffset` ở đây thì
        // nó đang hiện một vị trí cũ hơn cả lệnh tua vừa phát ra.
        expect(Number(slider.value)).toBeCloseTo(100, 1)
    })

    it('sau khi tua về quá khứ, thanh không tự nhảy lại về mép', () => {
        const { slider } = mount()

        act(() => {
            fireEvent.pointerDown(slider)
            fireEvent.change(slider, { target: { value: '100' } })
            fireEvent.pointerUp(slider)
            jest.advanceTimersByTime(600)
        })

        expect(Number(slider.value)).toBeCloseTo(100, 1)
    })
})
