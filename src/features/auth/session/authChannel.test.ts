import { waitFor } from '@testing-library/react'
import {
  publishAuthBroadcast,
  resetAuthChannelForTests,
  subscribeToAuthBroadcast,
} from './authChannel'

/** Đóng vai một tab khác đang mở cùng trang. */
function openOtherTab() {
  const channel = new BroadcastChannel('vox.auth')
  const received: unknown[] = []

  channel.addEventListener('message', (event) => {
    received.push(event.data)
  })

  return { channel, received }
}

describe('authChannel', () => {
  afterEach(() => {
    resetAuthChannelForTests()
  })

  it('delivers the end-of-session message to other tabs', async () => {
    const otherTab = openOtherTab()

    publishAuthBroadcast({ type: 'anonymous' })

    await waitFor(() => expect(otherTab.received).toEqual([{ type: 'anonymous' }]))
    otherTab.channel.close()
  })

  it('delivers the new identity to other tabs', async () => {
    const otherTab = openOtherTab()

    publishAuthBroadcast({ accessToken: 'access-token', type: 'authenticated' })

    await waitFor(() =>
      expect(otherTab.received).toEqual([
        { accessToken: 'access-token', type: 'authenticated' },
      ]),
    )
    otherTab.channel.close()
  })

  it('hands incoming messages to the subscriber', async () => {
    const received: unknown[] = []
    const unsubscribe = subscribeToAuthBroadcast((message) => {
      received.push(message)
    })
    const otherTab = openOtherTab()

    otherTab.channel.postMessage({ type: 'anonymous' })

    await waitFor(() => expect(received).toEqual([{ type: 'anonymous' }]))
    unsubscribe()
    otherTab.channel.close()
  })

  /**
   * Một tab chưa tải lại sau khi deploy vẫn phát theo hình dạng cũ. Áp bừa một tin không hiểu
   * được vào trạng thái đăng nhập là cách nhanh nhất để đá người dùng ra khỏi phiên đang tốt.
   */
  it('ignores messages it cannot recognise', async () => {
    const received: unknown[] = []
    const unsubscribe = subscribeToAuthBroadcast((message) => {
      received.push(message)
    })
    const otherTab = openOtherTab()

    otherTab.channel.postMessage({ type: 'authenticated' })
    otherTab.channel.postMessage('anonymous')
    otherTab.channel.postMessage(null)
    otherTab.channel.postMessage({ type: 'anonymous' })

    await waitFor(() => expect(received).toEqual([{ type: 'anonymous' }]))
    unsubscribe()
    otherTab.channel.close()
  })

  it('stops delivering after unsubscribe', async () => {
    const received: unknown[] = []
    const unsubscribe = subscribeToAuthBroadcast((message) => {
      received.push(message)
    })
    const otherTab = openOtherTab()

    unsubscribe()
    otherTab.channel.postMessage({ type: 'anonymous' })

    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })

    expect(received).toEqual([])
    otherTab.channel.close()
  })
})
