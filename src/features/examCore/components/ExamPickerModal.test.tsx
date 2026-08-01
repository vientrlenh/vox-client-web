import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { renderWithProviders } from '@/test/renderWithProviders'
import { ExamPickerModal } from './ExamPickerModal'

const mockedPost = jest.spyOn(graphqlApiClient, 'post')

type GraphQLBody = { query: string; variables: Record<string, unknown> }

function variablesOfLastCall() {
  const calls = mockedPost.mock.calls
  return (calls[calls.length - 1]?.[1] as GraphQLBody).variables
}

const exams = [
  {
    closeAt: '2026-07-20T17:00:00+07:00',
    code: 'KT-01',
    id: 'exam-1',
    name: 'Kỳ thi giữa kỳ',
    openAt: '2026-07-18T08:00:00+07:00',
    status: 'RESULTS_PUBLISHED',
  },
  {
    closeAt: null,
    code: 'KT-02',
    id: 'exam-2',
    name: 'Kỳ thi cuối kỳ',
    openAt: null,
    status: 'SCHEDULED',
  },
]

function mockExamsPage(overrides: Partial<{ totalElements: number; totalPages: number }> = {}) {
  mockedPost.mockResolvedValue({
    data: {
      data: {
        exams: {
          content: exams,
          page: 0,
          size: 8,
          totalElements: overrides.totalElements ?? 2,
          totalPages: overrides.totalPages ?? 1,
        },
      },
    },
  })
}

describe('ExamPickerModal', () => {
  beforeEach(() => {
    mockedPost.mockReset()
    mockExamsPage()
  })

  it('hiển thị tên, mã và trạng thái của từng kỳ thi', async () => {
    renderWithProviders(<ExamPickerModal onClose={jest.fn()} onSelect={jest.fn()} />)

    const row = await screen.findByRole('button', { name: /Kỳ thi giữa kỳ/ })
    // Bó hẹp trong dòng: nhãn trạng thái cũng xuất hiện ở dropdown lọc phía trên.
    expect(within(row).getByText('KT-01')).toBeInTheDocument()
    expect(within(row).getByText('Đã công bố kết quả')).toBeInTheDocument()
    expect(screen.getByText(/kỳ thi · trang/)).toHaveTextContent('2 kỳ thi · trang 1/1')
  })

  it('gửi keyword sau khi hết debounce, không gửi mỗi ký tự', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ExamPickerModal onClose={jest.fn()} onSelect={jest.fn()} />)
    await screen.findByText('Kỳ thi giữa kỳ')

    const callsBefore = mockedPost.mock.calls.length
    await user.type(screen.getByLabelText('Tìm kỳ thi'), 'giữa')

    await waitFor(() => expect(variablesOfLastCall().keyword).toBe('giữa'))
    // 4 ký tự nhưng chỉ thêm đúng một request nhờ debounce 350ms.
    expect(mockedPost.mock.calls.length - callsBefore).toBe(1)
  })

  it('lọc theo trạng thái kỳ thi', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ExamPickerModal onClose={jest.fn()} onSelect={jest.fn()} />)
    await screen.findByText('Kỳ thi giữa kỳ')

    await user.selectOptions(screen.getByLabelText('Lọc theo trạng thái kỳ thi'), 'CLOSED')

    await waitFor(() => expect(variablesOfLastCall().status).toBe('CLOSED'))
  })

  it('sang trang sau thì tăng page và về trang 1 khi đổi từ khoá', async () => {
    const user = userEvent.setup()
    mockExamsPage({ totalElements: 20, totalPages: 3 })
    renderWithProviders(<ExamPickerModal onClose={jest.fn()} onSelect={jest.fn()} />)
    await screen.findByText('Kỳ thi giữa kỳ')

    await user.click(screen.getByRole('button', { name: 'Sau' }))
    // UI 1-based, server 0-based: trang 2 trên UI = page 1 gửi đi.
    await waitFor(() => expect(variablesOfLastCall().page).toBe(1))

    await user.type(screen.getByLabelText('Tìm kỳ thi'), 'cuối')
    await waitFor(() => expect(variablesOfLastCall().page).toBe(0))
  })

  it('chọn một kỳ thi thì trả về cả object và đóng modal', async () => {
    const user = userEvent.setup()
    const onSelect = jest.fn()
    const onClose = jest.fn()
    renderWithProviders(<ExamPickerModal onClose={onClose} onSelect={onSelect} />)

    await user.click(await screen.findByText('Kỳ thi giữa kỳ'))

    // Phải là cả object: màn grading cần `name` cho tên file CSV và các dialog.
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'exam-1', name: 'Kỳ thi giữa kỳ' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('có lối bỏ lọc bằng mục "Tất cả kỳ thi"', async () => {
    const user = userEvent.setup()
    const onClear = jest.fn()
    const onClose = jest.fn()
    renderWithProviders(
      <ExamPickerModal onClear={onClear} onClose={onClose} onSelect={jest.fn()} selectedExamId="exam-1" />,
    )

    await user.click(await screen.findByRole('button', { name: 'Tất cả kỳ thi' }))

    expect(onClear).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('đóng bằng phím Esc', async () => {
    const user = userEvent.setup()
    const onClose = jest.fn()
    renderWithProviders(<ExamPickerModal onClose={onClose} onSelect={jest.fn()} />)
    await screen.findByText('Kỳ thi giữa kỳ')

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalled()
  })
})
