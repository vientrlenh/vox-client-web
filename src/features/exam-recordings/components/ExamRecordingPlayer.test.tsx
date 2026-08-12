import { screen, waitFor } from '@testing-library/react'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { ExamRecordingPlaybackDto } from '../types'
import { ExamRecordingPlayer } from './ExamRecordingPlayer'

const mockedPost = jest.spyOn(graphqlApiClient, 'post')

const SESSION_ID = '019fe05b-b419-72fd-beb0-2d8a019cef1a'

function playbackResponse(recordings: ExamRecordingPlaybackDto[]) {
  return { data: { data: { examRecordingPlayback: recordings } } }
}

/** Ca thi thật: màn hình ghép xong, camera chết giữa chừng. */
const screenRecording: ExamRecordingPlaybackDto = {
  canonical: true,
  durationSeconds: 143,
  id: 'rec-screen',
  playbackUrl: 'https://s3.example/screen.mp4',
  source: 'DESKTOP_SEGMENT_UPLOAD',
  status: 'READY',
  streamType: 'SCREEN',
}

const cameraRecording: ExamRecordingPlaybackDto = {
  canonical: true,
  durationSeconds: null,
  id: 'rec-camera',
  playbackUrl: null,
  source: 'SERVER_WEBRTC',
  status: 'FAILED',
  streamType: 'CAMERA',
}

describe('ExamRecordingPlayer', () => {
  beforeEach(() => {
    mockedPost.mockReset()
  })

  it('renders a player for each stream that has recordings', async () => {
    mockedPost.mockResolvedValue(playbackResponse([screenRecording, cameraRecording]))

    const { container } = renderWithProviders(<ExamRecordingPlayer sessionId={SESSION_ID} />)

    expect(await screen.findByText('Màn hình')).toBeInTheDocument()
    expect(screen.getByText('Camera thí sinh')).toBeInTheDocument()
    expect(container.querySelector('video')).toHaveAttribute('src', screenRecording.playbackUrl)
    // Luồng hỏng vẫn phải nói ra lý do thay vì biến mất khỏi lưới.
    expect(screen.getByText('Bản ghi lỗi trong lúc tải lên.')).toBeInTheDocument()
  })

  /**
   * Đây là hồi quy cho đúng sự cố đã gặp: giáo viên được phân công chấm nhưng không phải giám thị
   * bị backend trả 403, còn màn hình thì không hiện gì cả nên không ai biết là vấn đề phân quyền.
   */
  it('explains a permission denial instead of hiding the section', async () => {
    mockedPost.mockResolvedValue({
      data: {
        errors: [
          {
            extensions: { classification: 'FORBIDDEN' },
            message: 'Bạn không được phân công để giám sát ca thi này',
          },
        ],
      },
    })

    renderWithProviders(<ExamRecordingPlayer sessionId={SESSION_ID} />)

    expect(await screen.findByText(/không có quyền xem bản ghi/i)).toBeInTheDocument()
    expect(screen.getByText('Bản ghi ca thi')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Thử lại' })).not.toBeInTheDocument()
  })

  it('offers a retry for non-permission failures', async () => {
    mockedPost.mockRejectedValue(new Error('Network Error'))

    renderWithProviders(<ExamRecordingPlayer sessionId={SESSION_ID} />)

    expect(await screen.findByText('Không tải được bản ghi ca thi.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument()
  })

  it('says the session has no recordings when the list is empty', async () => {
    mockedPost.mockResolvedValue(playbackResponse([]))

    renderWithProviders(<ExamRecordingPlayer sessionId={SESSION_ID} />)

    expect(await screen.findByText('Ca thi này chưa có bản ghi nào.')).toBeInTheDocument()
  })

  it('renders nothing and skips the request when there is no session', async () => {
    const { container } = renderWithProviders(<ExamRecordingPlayer sessionId={null} />)

    await waitFor(() => expect(mockedPost).not.toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })
})
