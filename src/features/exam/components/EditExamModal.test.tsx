import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { apiClient } from '@/shared/api/apiClient'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { ExamDto } from '@/features/examCore/types'
import { EditExamModal } from './EditExamModal'

const mockedPut = jest.spyOn(apiClient, 'put')
const mockedGraphQL = jest.spyOn(graphqlApiClient, 'post')

function exam(overrides: Partial<ExamDto> = {}): ExamDto {
  return {
    closeAt: '2026-07-20T10:00:00.000Z',
    code: 'EX-01',
    description: 'Mô tả cũ',
    id: 'exam-1',
    kind: 'CENTRALIZED',
    languageId: 'lang-1',
    members: [],
    name: 'Kỳ thi giữa kỳ',
    openAt: '2026-07-20T01:00:00.000Z',
    papers: [],
    requiredStreamType: 'CAMERA_AND_SCREEN',
    requiresOtp: true,
    resultDecisionMethod: 'HIGHEST',
    schoolId: 'school-1',
    status: 'DRAFT',
    streamTypePermission: 'ALL',
    ...overrides,
  }
}

function payloadOfLastPut() {
  const calls = mockedPut.mock.calls
  return calls[calls.length - 1]?.[1] as Record<string, unknown>
}

describe('EditExamModal', () => {
  beforeEach(() => {
    mockedPut.mockReset()
    mockedPut.mockResolvedValue({ data: { data: exam() } })
    mockedGraphQL.mockReset()
    mockedGraphQL.mockResolvedValue({ data: { data: { searchSchoolRubrics: { content: [] } } } })
  })

  it('điền sẵn thông tin hiện tại của kỳ thi', () => {
    renderWithProviders(<EditExamModal exam={exam()} onClose={jest.fn()} onSaved={jest.fn()} />)

    expect(screen.getByLabelText(/Tên kỳ thi/)).toHaveValue('Kỳ thi giữa kỳ')
    expect(screen.getByLabelText(/Mô tả/)).toHaveValue('Mô tả cũ')
  })

  // Mở form ra mà thấy sai mức giám sát thì bấm Lưu là hạ mức giám sát của một kỳ thi thật.
  it('chọn sẵn đúng mức giám sát đang lưu trên kỳ thi', () => {
    renderWithProviders(
      <EditExamModal
        exam={exam({ requiredStreamType: 'CAMERA', streamTypePermission: null })}
        onClose={jest.fn()}
        onSaved={jest.fn()}
      />,
    )

    expect(screen.getByRole('radio', { name: /Chỉ camera/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /Bắt buộc cả camera và màn hình/ })).not.toBeChecked()
  })

  it('gửi cấu hình giám sát mới khi đổi lựa chọn', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EditExamModal exam={exam()} onClose={jest.fn()} onSaved={jest.fn()} />)

    await user.click(screen.getByRole('radio', { name: /Cho học viên tự chọn/ }))
    await user.click(screen.getByRole('button', { name: 'Lưu' }))

    await waitFor(() => expect(mockedPut).toHaveBeenCalledWith('/v1/exams/exam-1', expect.anything()))
    expect(payloadOfLastPut()).toMatchObject({
      requiredStreamTypes: ['CAMERA', 'SCREEN'],
      streamTypePermission: 'ANY',
    })
  })

  // "Không giám sát" phải là mảng rỗng: gửi null thì API sửa hiểu là "giữ nguyên" và thao tác tắt
  // giám sát im lặng không có tác dụng.
  it('tắt giám sát gửi mảng rỗng chứ không phải null', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EditExamModal exam={exam()} onClose={jest.fn()} onSaved={jest.fn()} />)

    await user.click(screen.getByRole('radio', { name: /Không giám sát/ }))
    await user.click(screen.getByRole('button', { name: 'Lưu' }))

    await waitFor(() => expect(mockedPut).toHaveBeenCalled())
    expect(payloadOfLastPut()).toMatchObject({ requiredStreamTypes: [], streamTypePermission: null })
  })

  // Không đụng tới chính sách thì tuyệt đối không được gửi field lên, kể cả null.
  it('không gửi assessmentPolicyId khi không đổi chính sách', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EditExamModal exam={exam()} onClose={jest.fn()} onSaved={jest.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Lưu' }))

    await waitFor(() => expect(mockedPut).toHaveBeenCalled())
    expect(payloadOfLastPut()).not.toHaveProperty('assessmentPolicyId')
  })

  // Quyết định H.8: kỳ thi tập trung luôn OTP và mỗi thí sinh đúng 1 lượt, không cho nhập tay.
  it('luôn khoá OTP và 1 lượt thi cho kỳ thi tập trung', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EditExamModal exam={exam()} onClose={jest.fn()} onSaved={jest.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Lưu' }))

    await waitFor(() => expect(mockedPut).toHaveBeenCalled())
    expect(payloadOfLastPut()).toMatchObject({ maxAttempt: 1, requiresOtp: true })
    expect(screen.queryByLabelText(/Số lượt thi/)).not.toBeInTheDocument()
  })

  // Hệ quả của H.8: đúng 1 lượt thi thì HIGHEST/LATEST/FIRST/AVERAGE/LOWEST cho ra cùng kết quả,
  // nên không hỏi người dùng nữa — nhưng vẫn phải gửi giá trị lên để hành vi là hiển nhiên.
  it('không hỏi cách chốt điểm nhưng vẫn gửi HIGHEST', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EditExamModal exam={exam()} onClose={jest.fn()} onSaved={jest.fn()} />)

    expect(screen.queryByLabelText(/Cách chốt điểm/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Lưu' }))

    await waitFor(() => expect(mockedPut).toHaveBeenCalled())
    expect(payloadOfLastPut()).toMatchObject({ resultDecisionMethod: 'HIGHEST' })
  })

  it('chặn lưu khi thời gian mở không nhỏ hơn thời gian đóng', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EditExamModal exam={exam()} onClose={jest.fn()} onSaved={jest.fn()} />)

    await user.clear(screen.getByLabelText(/Mở lúc/))
    await user.type(screen.getByLabelText(/Mở lúc/), '2026-07-21T10:00')
    await user.click(screen.getByRole('button', { name: 'Lưu' }))

    expect(await screen.findByText('Thời gian mở bài phải nhỏ hơn thời gian đóng bài.')).toBeInTheDocument()
    expect(mockedPut).not.toHaveBeenCalled()
  })

  it('báo lỗi và không gọi API khi bỏ trống tên kỳ thi', async () => {
    const user = userEvent.setup()
    renderWithProviders(<EditExamModal exam={exam()} onClose={jest.fn()} onSaved={jest.fn()} />)

    await user.clear(screen.getByLabelText(/Tên kỳ thi/))
    await user.click(screen.getByRole('button', { name: 'Lưu' }))

    expect(await screen.findByText('Vui lòng nhập tên kỳ thi.')).toBeInTheDocument()
    expect(mockedPut).not.toHaveBeenCalled()
  })
})
