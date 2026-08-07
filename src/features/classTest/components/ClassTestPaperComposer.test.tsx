import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { QuestionDto } from '@/features/question/types'
import { ClassTestPaperComposer } from './ClassTestPaperComposer'

// Chọn câu hỏi đi qua QuestionPicker (gọi API thật); ở đây chỉ quan tâm luật chia trọng số nên
// thay bằng một picker giả bắn thẳng ra 3 câu hỏi cố định.
const pickedQuestions: QuestionDto[] = [
  { code: 'Q1', id: 'q-1', maxResponseSeconds: 60, preparationTimeSeconds: 30, questionText: 'Câu 1' },
  { code: 'Q2', id: 'q-2', maxResponseSeconds: 60, preparationTimeSeconds: 30, questionText: 'Câu 2' },
  { code: 'Q3', id: 'q-3', maxResponseSeconds: 60, preparationTimeSeconds: 30, questionText: 'Câu 3' },
] as QuestionDto[]

jest.mock('@/features/examCore/components/QuestionPicker', () => ({
  QuestionPicker: ({ onClose, onSelect }: { onClose: () => void; onSelect: (question: QuestionDto) => void }) => (
    <div>
      {pickedQuestions.map((question) => (
        <button key={question.id} onClick={() => onSelect(question)} type="button">
          {`Chọn ${question.code}`}
        </button>
      ))}
      <button onClick={onClose} type="button">
        Đóng picker
      </button>
    </div>
  ),
}))

jest.mock('@/features/subscription_school/api/useMySubscriptionQuery', () => ({
  useMySubscriptionQuery: () => ({ data: { plan: { maxTimePerAttemptMin: null } } }),
}))

function renderComposer() {
  renderWithProviders(
    <ClassTestPaperComposer examId="exam-1" onClose={jest.fn()} onCreated={jest.fn()} questionDetailBasePath="/teacher" />,
  )
}

function sectionWeightInputs() {
  return screen.getAllByRole('spinbutton', { name: 'Trọng số phần' }) as HTMLInputElement[]
}

function questionWeightInputs() {
  return screen.getAllByRole('spinbutton', { name: 'Trọng số' }) as HTMLInputElement[]
}

describe('ClassTestPaperComposer — chia trọng số tự động', () => {
  it('chia đều trọng số giữa các phần, phần cuối hấp thụ phần dư', async () => {
    const user = userEvent.setup()
    renderComposer()

    // 3 phần: 1/3 không chia chẵn được, tổng vẫn phải đúng 1.00.
    await user.click(screen.getByRole('button', { name: /Thêm phần/ }))
    await user.click(screen.getByRole('button', { name: /Thêm phần/ }))
    await user.click(screen.getByRole('button', { name: /Chia đều các phần/ }))

    expect(sectionWeightInputs().map((input) => input.value)).toEqual(['0.33', '0.33', '0.34'])
    expect(screen.getByText(/Tổng 1\.00/)).toBeInTheDocument()
  })

  it('cảnh báo khi tổng trọng số phần khác 1.00', async () => {
    const user = userEvent.setup()
    renderComposer()

    await user.click(screen.getByRole('button', { name: /Thêm phần/ }))
    await user.type(sectionWeightInputs()[0], '0.5')
    await user.type(sectionWeightInputs()[1], '0.2')

    expect(screen.getByText(/Tổng 0\.70 — phải bằng 1\.00/)).toBeInTheDocument()
  })

  it('nhắc còn phần chưa nhập khi mới điền dở dang', async () => {
    const user = userEvent.setup()
    renderComposer()

    await user.click(screen.getByRole('button', { name: /Thêm phần/ }))
    await user.type(sectionWeightInputs()[0], '0.5')

    expect(screen.getByText(/còn 1 phần chưa nhập/)).toBeInTheDocument()
  })

  it('chia đều trọng số câu hỏi trong một phần', async () => {
    const user = userEvent.setup()
    renderComposer()

    await user.click(screen.getByRole('button', { name: /Thêm câu hỏi/ }))
    await user.click(screen.getByRole('button', { name: 'Chọn Q1' }))
    await user.click(screen.getByRole('button', { name: /Thêm câu hỏi/ }))
    await user.click(screen.getByRole('button', { name: 'Chọn Q2' }))
    await user.click(screen.getByRole('button', { name: /Thêm câu hỏi/ }))
    await user.click(screen.getByRole('button', { name: 'Chọn Q3' }))

    await user.click(screen.getByRole('button', { name: /Chia đều câu hỏi trong phần này/ }))

    expect(questionWeightInputs().map((input) => input.value)).toEqual(['0.33', '0.33', '0.34'])
  })

  /** Nút dùng nhiều nhất: một lần bấm là cả hai mức đều hợp lệ. */
  it('chia đều cả phần lẫn câu hỏi trong một lần bấm', async () => {
    const user = userEvent.setup()
    renderComposer()

    await user.click(screen.getByRole('button', { name: /Thêm câu hỏi/ }))
    await user.click(screen.getByRole('button', { name: 'Chọn Q1' }))
    await user.click(screen.getByRole('button', { name: 'Chọn Q2' }))

    await user.click(screen.getByRole('button', { name: /Chia đều tất cả trọng số/ }))

    expect(sectionWeightInputs().map((input) => input.value)).toEqual(['1'])
    expect(questionWeightInputs().map((input) => input.value)).toEqual(['0.5', '0.5'])
  })

  it('không cho chia đều tất cả khi chưa có câu hỏi nào', () => {
    renderComposer()

    expect(screen.getByRole('button', { name: /Chia đều tất cả trọng số/ })).toBeDisabled()
  })

  it('xoá trọng số phần để quay lại chế độ server tự chia', async () => {
    const user = userEvent.setup()
    renderComposer()

    await user.click(screen.getByRole('button', { name: /Chia đều các phần/ }))
    expect(screen.queryByText(/hệ thống sẽ tự chia đều khi tạo/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Xoá trọng số phần/ }))

    expect(screen.getByText(/hệ thống sẽ tự chia đều khi tạo/)).toBeInTheDocument()
    expect(within(sectionWeightInputs()[0]).queryByDisplayValue(/.+/)).toBeNull()
  })
})
