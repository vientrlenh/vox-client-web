import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { renderWithProviders } from '@/test/renderWithProviders'
import { RubricPolicySelectField, type RubricPolicyChoice } from './RubricPolicySelectField'

const mockedPost = jest.spyOn(graphqlApiClient, 'post')

// Dạng dữ liệu của bản mẫu hệ thống (SystemRubricTemplateInitializer): mã SYS-<NGÔN NGỮ>-<KHỐI>,
// phiên bản lấy mã rubric + "-V1".
const rubric = {
  code: 'SYS-ENG-K10',
  frameworkId: 'fw-1',
  id: 'rubric-1',
  languageId: 'lang-1',
  name: 'Bộ tiêu chí nói Tiếng Anh - Khối 10',
}
const version = {
  code: 'SYS-ENG-K10-V1',
  id: 'version-1',
  name: 'Bộ tiêu chí nói Tiếng Anh - Khối 10',
  rubricId: 'rubric-1',
  status: 'PUBLISHED',
  version: 1,
}

function policy(id: string, version: number) {
  return {
    effectiveFrom: '2026-01-01T00:00:00Z',
    effectiveTo: null,
    id,
    languageId: 'lang-1',
    passingScore: 5,
    rubricVersionId: 'version-1',
    status: 'PUBLISHED',
    strictness: 'STANDARD',
    version,
  }
}

/** Router theo tên operation vì component bắn 3 loại query khác nhau qua cùng một client. */
function mockGraphQL(policies: ReturnType<typeof policy>[]) {
  mockedPost.mockImplementation((_url, body) => {
    const query = (body as { query: string }).query
    if (query.includes('searchTeacherRubrics')) {
      return Promise.resolve({ data: { data: { searchTeacherRubrics: { content: [rubric] } } } })
    }
    if (query.includes('viewTeacherRubricVersions')) {
      return Promise.resolve({ data: { data: { viewTeacherRubricVersions: { content: [version] } } } })
    }
    return Promise.resolve({ data: { data: { viewTeacherAssessmentPolicies: { content: policies } } } })
  })
}

function field(onChange: (choice: RubricPolicyChoice) => void, languageId: string | null) {
  return <RubricPolicySelectField languageId={languageId} onChange={onChange} requiresLanguage scope="teacher" />
}

function renderField(onChange: (choice: RubricPolicyChoice) => void, languageId: string | null = 'lang-1') {
  return renderWithProviders(field(onChange, languageId))
}

/** Mở dialog chọn rubric, bấm đúng dòng rồi Xác nhận -- dialog phải đóng lại sau đó. */
async function pickRubricViaDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Chọn thang đánh giá' }))
  const dialog = await screen.findByRole('dialog')
  await user.click(within(dialog).getByText(rubric.name, { selector: 'td' }))
  await user.click(within(dialog).getByRole('button', { name: 'Xác nhận' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
}

/** Mở dialog chọn phiên bản (rubric đã chọn từ trước), bấm dòng rồi Xác nhận. */
async function pickVersionViaDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Chọn phiên bản' }))
  const dialog = await screen.findByRole('dialog')
  await user.click(within(dialog).getByText('v1'))
  await user.click(within(dialog).getByRole('button', { name: 'Xác nhận' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
}

async function pickRubricAndVersion(onChange: (choice: RubricPolicyChoice) => void) {
  const user = userEvent.setup()
  const rendered = renderField(onChange)

  await pickRubricViaDialog(user)
  await pickVersionViaDialog(user)
  return { rendered, user }
}

describe('RubricPolicySelectField', () => {
  beforeEach(() => {
    mockedPost.mockReset()
    mockGraphQL([policy('policy-1', 3)])
  })

  // Form tạo phải bị chặn từ đầu: bài không có chính sách thì tính xong ca thi không sinh được kết
  // quả nào để chấm.
  it('chặn submit khi chưa chọn gì', () => {
    const onChange = jest.fn()
    renderField(onChange)

    expect(onChange).toHaveBeenCalledWith({ assessmentPolicyId: null, isBlocked: true, rubricVersionId: null })
  })

  it('không cho chọn rubric khi form chưa chọn ngôn ngữ', () => {
    renderField(jest.fn(), null)

    expect(screen.getByRole('button', { name: 'Chọn ngôn ngữ trước' })).toBeDisabled()
    expect(mockedPost).not.toHaveBeenCalled()
  })

  it('đi tuần tự rubric -> phiên bản -> chính sách và tự chọn khi chỉ có một bản khớp', async () => {
    const onChange = jest.fn()
    // Phiên bản chỉ mở sau khi chọn rubric: nút vẫn bị khoá cho tới lúc đó.
    renderField(onChange)
    expect(screen.getByRole('button', { name: 'Chọn thang đánh giá trước' })).toBeDisabled()

    const user = userEvent.setup()
    await pickRubricViaDialog(user)
    expect(screen.getByRole('button', { name: `${rubric.name} (${rubric.code})` })).toBeInTheDocument()

    await pickVersionViaDialog(user)
    expect(
      screen.getByRole('button', { name: `v1 · ${version.code} · ${version.name}` }),
    ).toBeInTheDocument()

    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith({
        assessmentPolicyId: 'policy-1',
        isBlocked: false,
        rubricVersionId: 'version-1',
      }),
    )
    expect(screen.getByRole('button', { name: /Phiên bản 3/, pressed: true })).toBeInTheDocument()
  })

  // Nhiều chính sách khớp mà tự chọn bừa một cái là chấm bài sai; phải chặn tới khi người dùng chỉ rõ.
  it('chặn khi có nhiều chính sách khớp mà chưa chọn', async () => {
    mockGraphQL([policy('policy-1', 3), policy('policy-2', 4)])
    const onChange = jest.fn()
    const { user } = await pickRubricAndVersion(onChange)

    await waitFor(() => expect(screen.getByText('Có 2 chính sách khớp — chọn một trước khi tạo.')).toBeInTheDocument())
    expect(onChange).toHaveBeenLastCalledWith({
      assessmentPolicyId: null,
      isBlocked: true,
      rubricVersionId: 'version-1',
    })

    await user.click(screen.getByRole('button', { name: /Phiên bản 4/ }))

    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith({
        assessmentPolicyId: 'policy-2',
        isBlocked: false,
        rubricVersionId: 'version-1',
      }),
    )
  })

  it('cảnh báo và vẫn chặn khi không có chính sách nào đã xuất bản khớp', async () => {
    mockGraphQL([])
    const onChange = jest.fn()
    await pickRubricAndVersion(onChange)

    expect(await screen.findByText(/Chưa có chính sách đánh giá đã xuất bản/)).toBeInTheDocument()
    expect(onChange).toHaveBeenLastCalledWith({
      assessmentPolicyId: null,
      isBlocked: true,
      rubricVersionId: 'version-1',
    })
  })

  // Chính sách lọc theo (ngôn ngữ, phiên bản rubric). Giữ lại lựa chọn cũ khi đổi ngôn ngữ là gắn cho
  // kỳ thi một chính sách của ngôn ngữ khác -- server chỉ kiểm PUBLISHED + đúng trường nên nó lọt.
  it('xoá hết lựa chọn khi form đổi ngôn ngữ', async () => {
    mockGraphQL([policy('policy-1', 3), policy('policy-2', 4)])
    const onChange = jest.fn()
    const { rendered, user } = await pickRubricAndVersion(onChange)
    await user.click(screen.getByRole('button', { name: /Phiên bản 4/ }))
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ isBlocked: false })))

    rendered.rerender(field(onChange, 'lang-2'))

    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith({ assessmentPolicyId: null, isBlocked: true, rubricVersionId: null }),
    )
    expect(screen.getByRole('button', { name: 'Chọn thang đánh giá' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Chọn thang đánh giá trước' })).toBeDisabled()
  })
})
