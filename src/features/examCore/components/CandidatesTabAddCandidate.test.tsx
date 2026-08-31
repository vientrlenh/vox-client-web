import { QueryClient } from '@tanstack/react-query'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { apiClient } from '@/shared/api/apiClient'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { renderWithProviders } from '@/test/renderWithProviders'
import { CandidatesTab } from './CandidatesTab'

const mockedGraphql = jest.spyOn(graphqlApiClient, 'post')
const mockedRest = jest.spyOn(apiClient, 'post')

type GraphQLBody = { query: string; variables: Record<string, unknown> }

// Danh bạ 30 học sinh: trang 1 của picker chỉ tới "Hoc Sinh 08" (USER_PICKER_PAGE_SIZE = 8),
// nên "Zung Nguyen" CHỈ tìm được qua ô tìm kiếm của modal.
const directory = [
  ...Array.from({ length: 29 }, (_, index) => ({
    email: `hs${index + 1}@test.local`,
    fullName: `Hoc Sinh ${String(index + 1).padStart(2, '0')}`,
    status: 'ACTIVE',
    userId: `user-${index + 1}`,
  })),
  { email: 'zung@test.local', fullName: 'Zung Nguyen', status: 'ACTIVE', userId: 'user-zung' },
]

function candidateFor(user: (typeof directory)[number], index: number) {
  return {
    assignedPaperId: null,
    attempts: [],
    blockedAt: null,
    id: `candidate-${index}`,
    scheduleId: null,
    status: 'ASSIGNED',
    student: { email: user.email, fullName: user.fullName },
    studentId: user.userId,
  }
}

/**
 * Thí sinh mới luôn xuống CUỐI danh sách (backend xếp theo `assignedAt`), nên khi kỳ thi đã quá
 * một trang thì người vừa thêm rơi ra ngoài trang đang xem: thêm xong không thấy đâu, tưởng hỏng
 * và phải F5. `12 thí sinh` là ca vỡ (PAGE_SIZE = 10); `5 thí sinh` là ca vốn vẫn chạy đúng.
 */
describe.each([5, 12])('CandidatesTab · thêm thí sinh khi đang có %i người', (existingCount) => {
  let candidates: unknown[] = []

  beforeEach(() => {
    mockedGraphql.mockReset()
    mockedRest.mockReset()
    candidates = directory.slice(0, existingCount).map(candidateFor)

    mockedGraphql.mockImplementation((_url, body) => {
      const { query, variables } = body as GraphQLBody
      if (query.includes('examSchedules')) {
        return Promise.resolve({ data: { data: { examSchedules: [] } } })
      }
      if (query.includes('studentBusySlots')) {
        return Promise.resolve({ data: { data: { studentBusySlots: [] } } })
      }
      if (query.includes('examDirectoryStudents')) {
        const search = (variables.search as string | null)?.toLowerCase() ?? null
        const matched = search
          ? directory.filter(
              (user) =>
                user.fullName.toLowerCase().includes(search) || user.email.toLowerCase().includes(search),
            )
          : directory
        const size = variables.size as number
        const page = variables.page as number
        return Promise.resolve({
          data: {
            data: {
              examDirectoryStudents: {
                content: matched.slice((page - 1) * size, page * size),
                page,
                size,
                totalElements: matched.length,
                totalPages: Math.ceil(matched.length / size),
              },
            },
          },
        })
      }
      return Promise.resolve({ data: { data: { examCandidates: candidates } } })
    })

    // POST /v1/exams/:id/candidates — hàng mới nằm CUỐI, đúng thứ tự `assignedAt` backend trả về.
    mockedRest.mockImplementation((_url, payload) => {
      const studentId = (payload as { studentId: string }).studentId
      const user = directory.find((entry) => entry.userId === studentId)!
      candidates = [...candidates, candidateFor(user, candidates.length)]
      return Promise.resolve({ data: { data: candidates[candidates.length - 1] } })
    })
  })

  it('người chọn từ kết quả tìm kiếm hiện ngay trong danh sách, không cần tải lại trang', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <CandidatesTab canManage examId="exam-1" examKind="CLASS_TEST" papers={[]} />,
      { queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
    )

    await screen.findByText('Hoc Sinh 01')

    await user.click(screen.getByRole('button', { name: 'Thêm thí sinh' }))
    await user.type(
      await screen.findByPlaceholderText('Tìm học sinh theo tên hoặc email…'),
      'Zung',
    )
    await user.click(await screen.findByRole('button', { name: /Zung Nguyen/ }, { timeout: 3000 }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText('Zung Nguyen')).toBeInTheDocument()
  })
})
