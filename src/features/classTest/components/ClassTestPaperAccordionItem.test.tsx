import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ExamPaperDto } from '@/features/examCore/types'
import { ClassTestPaperAccordionItem } from './ClassTestPaperAccordionItem'

function paper(overrides: Partial<ExamPaperDto> = {}): ExamPaperDto {
  return {
    code: 'CT-49E263FB25EB-P2',
    examId: 'exam-1',
    id: 'paper-2',
    sections: [
      {
        id: 'sec-1',
        items: [{ id: 'item-1', order: 1, questionId: 'q-1', sectionId: 'sec-1' }],
        order: 1,
        title: 'Life Around',
      },
    ],
    status: 'DRAFT',
    timeDurationSeconds: 100,
    variant: 2,
    ...overrides,
  } as ExamPaperDto
}

describe('ClassTestPaperAccordionItem', () => {
  it('lấy "Mã đề 2" làm nhãn chính, mã đầy đủ chỉ là phụ', () => {
    render(<ClassTestPaperAccordionItem isOpen={false} onOpen={jest.fn()} paper={paper()} />)

    expect(screen.getByText('Mã đề 2')).toBeInTheDocument()
    expect(screen.getByText('CT-49E263FB25EB-P2')).toBeInTheDocument()
  })

  it('chỉ dựng nội dung soạn thảo khi thẻ đang mở', () => {
    const { rerender } = render(
      <ClassTestPaperAccordionItem isOpen={false} onOpen={jest.fn()} paper={paper()}>
        <div>Các phần và câu hỏi</div>
      </ClassTestPaperAccordionItem>,
    )
    expect(screen.queryByText('Các phần và câu hỏi')).not.toBeInTheDocument()

    rerender(
      <ClassTestPaperAccordionItem isOpen onOpen={jest.fn()} paper={paper()}>
        <div>Các phần và câu hỏi</div>
      </ClassTestPaperAccordionItem>,
    )
    expect(screen.getByText('Các phần và câu hỏi')).toBeInTheDocument()
  })

  it('bấm vào đầu thẻ đang đóng thì mở thẻ đó', async () => {
    const user = userEvent.setup()
    const onOpen = jest.fn()
    render(<ClassTestPaperAccordionItem isOpen={false} onOpen={onOpen} paper={paper()} />)

    await user.click(screen.getByRole('button', { expanded: false }))

    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  /** Luôn phải có đúng một mã đề đang mở, nếu không lại mơ hồ "đang sửa đề nào". */
  it('không gập lại được thẻ đang mở', async () => {
    const user = userEvent.setup()
    const onOpen = jest.fn()
    render(<ClassTestPaperAccordionItem isOpen onOpen={onOpen} paper={paper()} />)

    const header = screen.getByRole('button', { expanded: true })
    expect(header).toBeDisabled()
    await user.click(header)

    expect(onOpen).not.toHaveBeenCalled()
  })

  it('nút thao tác nằm trong đầu thẻ, không trôi ra ngoài', () => {
    const { container } = render(
      <ClassTestPaperAccordionItem
        actions={<button type="button">Khoá để phân đề</button>}
        isOpen={false}
        onOpen={jest.fn()}
        paper={paper()}
      />,
    )

    const lockButton = screen.getByRole('button', { name: 'Khoá để phân đề' })
    expect(container.firstChild).toContainElement(lockButton)
  })

  it('cảnh báo ô câu hỏi còn trống', () => {
    render(
      <ClassTestPaperAccordionItem
        isOpen={false}
        onOpen={jest.fn()}
        paper={paper({
          sections: [
            {
              id: 'sec-1',
              items: [
                { id: 'item-1', order: 1, questionId: 'q-1', sectionId: 'sec-1' },
                { id: 'item-2', order: 2, questionId: null, sectionId: 'sec-1' },
              ],
              order: 1,
              title: 'Life Around',
            },
          ],
        } as Partial<ExamPaperDto>)}
      />,
    )

    expect(screen.getByText(/Còn 1 ô chưa có câu hỏi/)).toBeInTheDocument()
  })

  it('mã đề đã khoá hiện là sẵn sàng phân đề', () => {
    render(<ClassTestPaperAccordionItem isOpen={false} onOpen={jest.fn()} paper={paper({ status: 'LOCKED' })} />)

    expect(screen.getByText('Sẵn sàng phân đề')).toBeInTheDocument()
  })
})
