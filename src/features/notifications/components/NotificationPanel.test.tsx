import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { renderWithProviders } from '@/test/renderWithProviders'
import { NotificationPanel } from './NotificationPanel'

const mockUsePushPermission = jest.fn()

jest.mock('../hooks/useNotificationPush', () => ({
  usePushPermission: () => mockUsePushPermission(),
}))

const mockedPost = jest.spyOn(graphqlApiClient, 'post')
const mockEnablePush = jest.fn()

function givenPermission(
  permission: 'default' | 'denied' | 'granted',
  isSupported = true,
) {
  mockUsePushPermission.mockReturnValue({
    enablePush: mockEnablePush,
    isSupported,
    permission,
  })
}

function renderPanel() {
  mockedPost.mockResolvedValue({
    data: {
      data: {
        myNotifications: { content: [], hasNext: false, nextCursor: null },
      },
    },
  } as never)

  return renderWithProviders(<NotificationPanel onClose={jest.fn()} />)
}

describe('NotificationPanel', () => {
  beforeEach(() => {
    mockedPost.mockReset()
    mockEnablePush.mockReset()
  })

  it('mời bật thông báo khi người dùng chưa quyết định', async () => {
    givenPermission('default')
    renderPanel()

    await userEvent.click(
      await screen.findByRole('button', { name: 'Bật thông báo' }),
    )

    expect(mockEnablePush).toHaveBeenCalled()
  })

  /**
   * Quyền thông báo chỉ hỏi được một lần: đã bị chặn thì `requestPermission` không còn
   * mở hộp thoại nào nữa, nên hiện nút bấm ở đây chỉ tạo một nút chết.
   */
  it('không hiện nút bật khi trình duyệt đã chặn, chỉ hướng dẫn', async () => {
    givenPermission('denied')
    renderPanel()

    expect(
      await screen.findByText(/Trình duyệt đang chặn thông báo/),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Bật thông báo' }),
    ).not.toBeInTheDocument()
  })

  it('không mời gì khi đã bật thông báo', async () => {
    givenPermission('granted')
    renderPanel()

    expect(await screen.findByText('Bạn chưa có thông báo nào.')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Bật thông báo' }),
    ).not.toBeInTheDocument()
  })

  it('không mời gì khi trình duyệt không hỗ trợ thông báo đẩy', async () => {
    givenPermission('default', false)
    renderPanel()

    expect(await screen.findByText('Bạn chưa có thông báo nào.')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Bật thông báo' }),
    ).not.toBeInTheDocument()
  })
})
