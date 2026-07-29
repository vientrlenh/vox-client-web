import { QueryClient } from '@tanstack/react-query'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { renderWithProviders } from '@/test/renderWithProviders'
import { ImportCandidatesModal } from './ImportCandidatesModal'

const mockedPost = jest.spyOn(graphqlApiClient, 'post')

type GraphQLBody = { query: string; variables: Record<string, unknown> }

function bodies() {
  return mockedPost.mock.calls.map((call) => call[1] as GraphQLBody)
}

/** Kỳ thi tập trung bắn cả hai query song song, nên "call cuối" không xác định. */
function lastCallTo(field: string) {
  return bodies().filter((body) => body.query.includes(field)).at(-1)
}

function queriedFields() {
  return bodies().map((body) => body.query).join()
}

const schoolClass = {
  code: 'ENG-01',
  description: null,
  id: 'class-1',
  languageId: 'lang-1',
  name: 'Tiếng Anh 01',
  schoolGradeId: 'grade-1',
  schoolId: 'school-1',
  status: 'ACTIVE',
}

const grade = { code: 'NK-2026', id: 'grade-1', name: 'Niên khóa 2026', status: 'ACTIVE' }

function mockDirectory() {
  mockedPost.mockImplementation((_url, body) => {
    const { query } = body as GraphQLBody
    const payload = query.includes('examDirectoryGrades')
      ? { examDirectoryGrades: { content: [grade], page: 1, size: 8, totalElements: 1, totalPages: 1 } }
      : { examDirectoryClasses: { content: [schoolClass], page: 1, size: 8, totalElements: 1, totalPages: 1 } }
    return Promise.resolve({ data: { data: payload } })
  })
}

function renderModal(examKind: 'CENTRALIZED' | 'CLASS_TEST', overrides: Record<string, unknown> = {}) {
  return renderWithProviders(
    <ImportCandidatesModal
      examId="exam-1"
      examKind={examKind}
      onClose={jest.fn()}
      onImportClass={jest.fn()}
      onImportGrade={jest.fn()}
      {...overrides}
    />,
    // QueryClient của app retry 1 lần; chờ hết retry là quá timeout mặc định của findBy*.
    { queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
  )
}

describe('ImportCandidatesModal', () => {
  beforeEach(() => {
    mockedPost.mockReset()
    mockDirectory()
  })

  it('gọi danh bạ theo examId thay vì query quản trị của trường', async () => {
    renderModal('CENTRALIZED')

    await screen.findByText('Tiếng Anh 01')
    expect(lastCallTo('examDirectoryClasses')?.variables).toMatchObject({
      examId: 'exam-1',
      page: 1,
      search: null,
    })
    // Query cũ gated SCHOOL_ADMIN — chủ tịch hội đồng gọi vào là 403.
    expect(queriedFields()).not.toContain('schoolClasses(')
  })

  it('cho kỳ thi tập trung: có tab niên khóa và chọn được niên khóa', async () => {
    const user = userEvent.setup()
    const onImportGrade = jest.fn()
    renderModal('CENTRALIZED', { onImportGrade })

    await user.click(screen.getByRole('button', { name: 'Theo niên khóa' }))
    await user.click(await screen.findByRole('button', { name: /Niên khóa 2026/ }))

    expect(onImportGrade).toHaveBeenCalledWith('grade-1')
  })

  it('cho bài trên lớp: ẩn hẳn tab niên khóa và không gọi query niên khóa', async () => {
    renderModal('CLASS_TEST')

    await screen.findByText('Tiếng Anh 01')
    expect(screen.queryByRole('button', { name: 'Theo niên khóa' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Theo lớp' })).not.toBeInTheDocument()
    expect(queriedFields()).not.toContain('examDirectoryGrades')
  })

  it('hiện thông báo lỗi khi bị từ chối quyền, không phải "không tìm thấy"', async () => {
    mockedPost.mockResolvedValue({
      data: { errors: [{ extensions: { classification: 'FORBIDDEN' }, message: 'Quyền truy cập bị từ chối' }] },
    })

    renderModal('CENTRALIZED')

    expect(await screen.findByText('Quyền truy cập bị từ chối')).toBeInTheDocument()
    expect(screen.queryByText('Không tìm thấy lớp phù hợp.')).not.toBeInTheDocument()
  })

  it('đẩy từ khóa xuống server sau debounce thay vì lọc tại chỗ', async () => {
    const user = userEvent.setup()
    renderModal('CENTRALIZED')
    await screen.findByText('Tiếng Anh 01')

    await user.type(screen.getByPlaceholderText(/Tìm lớp/), 'anh')

    await waitFor(() =>
      expect(lastCallTo('examDirectoryClasses')?.variables).toMatchObject({ search: 'anh' }),
    )
  })
})
