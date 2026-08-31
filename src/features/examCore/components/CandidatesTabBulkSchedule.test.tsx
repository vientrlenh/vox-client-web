import { QueryClient } from '@tanstack/react-query'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { apiClient } from '@/shared/api/apiClient'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { renderWithProviders } from '@/test/renderWithProviders'
import { CandidatesTab } from './CandidatesTab'

const mockedGraphql = jest.spyOn(graphqlApiClient, 'post')
const mockedPut = jest.spyOn(apiClient, 'put')
const mockedDelete = jest.spyOn(apiClient, 'delete')

type GraphQLBody = { query: string }

const schedule = {
  candidateCount: 2,
  endDate: '2026-09-05T03:00:00Z',
  examId: 'exam-1',
  id: 'schedule-1',
  proctors: [],
  requiredProctorCount: 1,
  room: { code: 'P.101', id: 'room-1', name: 'Phòng máy 1' },
  schoolRoomId: 'room-1',
  startDate: '2026-09-05T01:00:00Z',
  status: 'DRAFT',
}

function candidateFor(index: number, fullName: string, scheduleId: string | null) {
  return {
    assignedPaperId: null,
    attempts: [],
    blockedAt: null,
    id: `candidate-${index}`,
    scheduleId,
    status: scheduleId ? 'ASSIGNED' : 'PENDING',
    student: { email: `hs${index}@test.local`, fullName },
    studentId: `user-${index}`,
  }
}

/** Nút xác nhận trong hộp thoại trùng tên với nút trên thanh thao tác — luôn hỏi trong `dialog`. */
async function confirmDialog(user: ReturnType<typeof userEvent.setup>, label: string) {
  const dialog = await screen.findByRole('dialog')
  await user.click(within(dialog).getByRole('button', { name: label }))
}

describe('CandidatesTab · bỏ khỏi ca thi hàng loạt', () => {
  let candidates: unknown[] = []

  beforeEach(() => {
    mockedGraphql.mockReset()
    mockedPut.mockReset()
    mockedDelete.mockReset()
    candidates = [
      candidateFor(1, 'Nguyễn Văn An', 'schedule-1'),
      candidateFor(2, 'Trần Thị Bình', 'schedule-1'),
      candidateFor(3, 'Lê Văn Cường', null),
    ]

    mockedGraphql.mockImplementation((_url, body) => {
      const { query } = body as GraphQLBody
      if (query.includes('examSchedules')) {
        return Promise.resolve({ data: { data: { examSchedules: [schedule] } } })
      }
      if (query.includes('studentBusySlots')) {
        return Promise.resolve({ data: { data: { studentBusySlots: [] } } })
      }
      return Promise.resolve({ data: { data: { examCandidates: candidates } } })
    })
    mockedPut.mockResolvedValue({ data: { data: [] } })
    mockedDelete.mockImplementation((url) => {
      const id = String(url).split('/').pop()
      candidates = candidates.filter((candidate) => (candidate as { id: string }).id !== id)
      return Promise.resolve({ data: { data: null } })
    })
  })

  function renderTab() {
    return renderWithProviders(
      <CandidatesTab canManage examId="exam-1" examKind="CENTRALIZED" papers={[]} />,
      { queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
    )
  }

  it('hỏi lại kèm đích danh từng người trước khi gỡ', async () => {
    const user = userEvent.setup()
    renderTab()

    await screen.findByText('Nguyễn Văn An')
    await user.click(screen.getByLabelText('Chọn Nguyễn Văn An'))
    await user.click(screen.getByLabelText('Chọn Trần Thị Bình'))
    await user.click(screen.getByRole('button', { name: 'Bỏ khỏi ca thi' }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Xác nhận bỏ khỏi ca thi')
    expect(dialog).toHaveTextContent('Bỏ 2 thí sinh sau đây khỏi ca thi đang xếp?')
    expect(dialog).toHaveTextContent('Nguyễn Văn An')
    expect(dialog).toHaveTextContent('Trần Thị Bình')
    // Chưa bấm xác nhận thì tuyệt đối chưa được gọi API.
    expect(mockedPut).not.toHaveBeenCalled()
  })

  it('bấm Không thì không gửi gì lên server', async () => {
    const user = userEvent.setup()
    renderTab()

    await screen.findByText('Nguyễn Văn An')
    await user.click(screen.getByLabelText('Chọn Nguyễn Văn An'))
    await user.click(screen.getByRole('button', { name: 'Bỏ khỏi ca thi' }))
    await confirmDialog(user, 'Không')

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(mockedPut).not.toHaveBeenCalled()
  })

  it('xác nhận thì gỡ đúng những người đang có ca', async () => {
    const user = userEvent.setup()
    renderTab()

    await screen.findByText('Nguyễn Văn An')
    // Tick cả người CHƯA xếp ca: họ không được nằm trong lượt gỡ.
    await user.click(screen.getByLabelText('Chọn Nguyễn Văn An'))
    await user.click(screen.getByLabelText('Chọn Lê Văn Cường'))
    await user.click(screen.getByRole('button', { name: 'Bỏ khỏi ca thi' }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Bỏ 1 thí sinh sau đây khỏi ca thi đang xếp?')
    expect(dialog).not.toHaveTextContent('Lê Văn Cường')

    await confirmDialog(user, 'Bỏ khỏi ca thi')

    await waitFor(() => expect(mockedPut).toHaveBeenCalledTimes(1))
    expect(mockedPut).toHaveBeenCalledWith('/v1/exams/exam-1/candidates/schedule', {
      candidateIds: ['candidate-1'],
      scheduleId: null,
    })
  })

  it('tất cả người đang chọn đều chưa xếp ca: báo rõ thay vì gọi API rỗng', async () => {
    const user = userEvent.setup()
    renderTab()

    await screen.findByText('Lê Văn Cường')
    await user.click(screen.getByLabelText('Chọn Lê Văn Cường'))
    await user.click(screen.getByRole('button', { name: 'Bỏ khỏi ca thi' }))

    expect(await screen.findByText(/đều chưa được xếp ca thi nào/)).toBeInTheDocument()
    expect(mockedPut).not.toHaveBeenCalled()
  })

  // Backend đối chiếu số dòng tìm được với số id gửi lên và từ chối NGUYÊN LƯỢT nếu lệch, nên một
  // id "ma" còn sót trong tập tick sẽ kéo hỏng cả những người vẫn hợp lệ.
  it('id của người vừa bị xoá khỏi kỳ thi không được gửi kèm', async () => {
    const user = userEvent.setup()
    renderTab()

    await screen.findByText('Nguyễn Văn An')
    await user.click(screen.getByLabelText('Chọn Nguyễn Văn An'))
    await user.click(screen.getByLabelText('Chọn Trần Thị Bình'))

    // Xoá Nguyễn Văn An khỏi kỳ thi trong khi họ vẫn đang được tick.
    await user.click(screen.getByRole('button', { name: 'Thao tác cho Nguyễn Văn An' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Xóa khỏi kỳ thi' }))
    await confirmDialog(user, 'Xác nhận')
    await waitFor(() => expect(screen.queryByText('Nguyễn Văn An')).not.toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Bỏ khỏi ca thi' }))
    await confirmDialog(user, 'Bỏ khỏi ca thi')

    await waitFor(() => expect(mockedPut).toHaveBeenCalledTimes(1))
    expect(mockedPut).toHaveBeenCalledWith('/v1/exams/exam-1/candidates/schedule', {
      candidateIds: ['candidate-2'],
      scheduleId: null,
    })
  })
})
