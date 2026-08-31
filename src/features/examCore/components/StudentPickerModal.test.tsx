import { QueryClient } from '@tanstack/react-query'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { renderWithProviders } from '@/test/renderWithProviders'
import { ProctorPickerModal } from './schedule/ProctorPickerModal'
import { StudentPickerModal } from './StudentPickerModal'

const mockedPost = jest.spyOn(graphqlApiClient, 'post')

type GraphQLBody = { query: string; variables: Record<string, unknown> }

function bodies() {
  return mockedPost.mock.calls.map((call) => call[1] as GraphQLBody)
}

const users = [
  { email: 'an@test.local', fullName: 'Nguyen Van An', status: 'ACTIVE', userId: 'user-1' },
  { email: 'binh@test.local', fullName: 'Tran Thi Binh', status: 'ACTIVE', userId: 'user-2' },
]

function mockUsers(field: string) {
  mockedPost.mockResolvedValue({
    data: { data: { [field]: { content: users, page: 1, size: 8, totalElements: 2, totalPages: 1 } } },
  })
}

// QueryClient của app retry 1 lần; chờ hết retry là quá timeout mặc định của findBy*.
function testQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

describe('StudentPickerModal', () => {
  beforeEach(() => {
    mockedPost.mockReset()
    mockUsers('examDirectoryStudents')
  })

  it('gọi danh bạ học sinh theo examId, không dùng query quản trị của trường', async () => {
    renderWithProviders(
      <StudentPickerModal examId="exam-1" excludeUserIds={[]} onClose={jest.fn()} onSelect={jest.fn()} />,
      { queryClient: testQueryClient() },
    )

    await screen.findByText('Nguyen Van An')
    expect(bodies()[0].query).toContain('examDirectoryStudents')
    expect(bodies()[0].variables).toMatchObject({ examId: 'exam-1' })
    // Query cũ gated SCHOOL_ADMIN — chủ tịch hội đồng gọi vào là 403.
    expect(bodies()[0].query).not.toContain('schoolStudentsBySchool')
  })

  // Loại ở BE chứ không lọc lại sau khi nhận trang: lọc ở client thì `content` ngắn đi trong khi
  // `totalElements`/`totalPages` vẫn đếm cả người bị bỏ — nhập xong một lớp là picker hiện trang
  // trống kèm số đếm khác 0.
  it('nhờ backend loại người đã là thí sinh, không tự lọc lại trang đã nhận', async () => {
    renderWithProviders(
      <StudentPickerModal
        examId="exam-1"
        excludeUserIds={['user-1']}
        onClose={jest.fn()}
        onSelect={jest.fn()}
      />,
      { queryClient: testQueryClient() },
    )

    await screen.findByText('Tran Thi Binh')
    expect(bodies()[0].query).toContain('excludeUserIds')
    expect(bodies()[0].variables).toMatchObject({ excludeUserIds: ['user-1'] })
  })

  it('trả về userId khi chọn', async () => {
    const user = userEvent.setup()
    const onSelect = jest.fn()
    renderWithProviders(
      <StudentPickerModal examId="exam-1" excludeUserIds={[]} onClose={jest.fn()} onSelect={onSelect} />,
      { queryClient: testQueryClient() },
    )

    await user.click(await screen.findByRole('button', { name: /Nguyen Van An/ }))

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1' }))
  })

  it('hiện thông báo lỗi khi bị từ chối quyền, không phải "không tìm thấy"', async () => {
    mockedPost.mockResolvedValue({
      data: { errors: [{ extensions: { classification: 'FORBIDDEN' }, message: 'Quyền truy cập bị từ chối' }] },
    })

    renderWithProviders(
      <StudentPickerModal examId="exam-1" excludeUserIds={[]} onClose={jest.fn()} onSelect={jest.fn()} />,
      { queryClient: testQueryClient() },
    )

    expect(await screen.findByText('Quyền truy cập bị từ chối')).toBeInTheDocument()
    expect(screen.queryByText('Không tìm thấy học sinh phù hợp.')).not.toBeInTheDocument()
  })
})

describe('ProctorPickerModal', () => {
  beforeEach(() => {
    mockedPost.mockReset()
    mockUsers('examDirectoryProctors')
  })

  it('gọi danh bạ giám thị theo examId, không dùng query quản trị của trường', async () => {
    renderWithProviders(
      <ProctorPickerModal
        examId="exam-1"
        excludeUserIds={[]}
        onClose={jest.fn()}
        onSelect={jest.fn()}
        scheduleId="schedule-1"
      />,
      { queryClient: testQueryClient() },
    )

    await screen.findByText('Nguyen Van An')
    expect(bodies()[0].query).toContain('examDirectoryProctors')
    expect(bodies()[0].query).not.toContain('schoolTeachersBySchool')
  })

  it('hiện thông báo lỗi khi bị từ chối quyền', async () => {
    mockedPost.mockResolvedValue({
      data: { errors: [{ extensions: { classification: 'FORBIDDEN' }, message: 'Quyền truy cập bị từ chối' }] },
    })

    renderWithProviders(
      <ProctorPickerModal
        examId="exam-1"
        excludeUserIds={[]}
        onClose={jest.fn()}
        onSelect={jest.fn()}
        scheduleId="schedule-1"
      />,
      { queryClient: testQueryClient() },
    )

    expect(await screen.findByText('Quyền truy cập bị từ chối')).toBeInTheDocument()
    expect(screen.queryByText('Không tìm thấy giáo viên phù hợp.')).not.toBeInTheDocument()
  })
})
