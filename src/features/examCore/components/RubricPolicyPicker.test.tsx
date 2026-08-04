import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { graphqlApiClient } from '@/shared/api/graphqlClient'
import { renderWithProviders } from '@/test/renderWithProviders'
import { RubricPolicyPicker, type RubricPolicySelection } from './RubricPolicyPicker'

const mockedPost = jest.spyOn(graphqlApiClient, 'post')

const rubric = { code: 'RB-01', frameworkId: 'fw-1', id: 'rubric-1', languageId: 'lang-1', name: 'Thang IELTS' }
const version = { code: 'V1', id: 'version-1', name: 'Bản 2026', rubricId: 'rubric-1', status: 'PUBLISHED', version: 1 }

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

/** Router theo tên operation vì component bắn 2 loại query khác nhau qua cùng một client. */
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

async function openPickerAndSelectVersion(onChange: (selection: RubricPolicySelection) => void) {
  const user = userEvent.setup()
  renderWithProviders(<RubricPolicyPicker languageId="lang-1" onChange={onChange} scope="teacher" />)

  await user.click(screen.getByRole('button', { name: 'Đổi chính sách đánh giá' }))
  await waitFor(() => expect(screen.getByLabelText(/Thang đánh giá/)).not.toBeDisabled())
  await user.selectOptions(screen.getByLabelText(/Thang đánh giá/), 'rubric-1')
  await waitFor(() => expect(screen.getByLabelText(/Phiên bản đã xuất bản/)).not.toBeDisabled())
  await user.selectOptions(screen.getByLabelText(/Phiên bản đã xuất bản/), 'version-1')
  return user
}

describe('RubricPolicyPicker', () => {
  beforeEach(() => {
    mockedPost.mockReset()
    mockGraphQL([policy('policy-1', 3)])
  })

  // Mặc định phải là "không đổi gì": form sửa gửi kèm assessmentPolicyId ngoài ý muốn sẽ ghi đè
  // chính sách đang dùng của một bài đã tồn tại.
  it('mặc định giữ nguyên chính sách hiện tại và không chọn gì', () => {
    const onChange = jest.fn()
    renderWithProviders(<RubricPolicyPicker languageId="lang-1" onChange={onChange} scope="teacher" />)

    expect(screen.getByText('Đang dùng chính sách đánh giá hiện tại.')).toBeInTheDocument()
    expect(onChange).toHaveBeenCalledWith({ assessmentPolicyId: null, isBlocked: false })
    expect(mockedPost).not.toHaveBeenCalled()
  })

  it('tự chọn khi chỉ có đúng một chính sách khớp', async () => {
    const onChange = jest.fn()
    await openPickerAndSelectVersion(onChange)

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({ assessmentPolicyId: 'policy-1', isBlocked: false }),
    )
    expect(await screen.findByText(/Sẽ đổi sang chính sách/)).toBeInTheDocument()
  })

  // Nhiều chính sách khớp mà tự chọn bừa một cái là chấm bài sai; phải chặn nút Lưu tới khi người
  // dùng chỉ định rõ.
  it('chặn lưu khi có nhiều chính sách khớp mà chưa chọn', async () => {
    mockGraphQL([policy('policy-1', 3), policy('policy-2', 4)])
    const onChange = jest.fn()
    const user = await openPickerAndSelectVersion(onChange)

    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith({ assessmentPolicyId: null, isBlocked: true }))
    expect(screen.getByText('Có 2 chính sách khớp — chọn một:')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Phiên bản 4/ }))

    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith({ assessmentPolicyId: 'policy-2', isBlocked: false }),
    )
  })

  it('cảnh báo khi không có chính sách nào đã xuất bản khớp', async () => {
    mockGraphQL([])
    await openPickerAndSelectVersion(jest.fn())

    expect(await screen.findByText(/Chưa có chính sách đánh giá đã xuất bản/)).toBeInTheDocument()
  })

  // Bỏ dở giữa chừng không được để lại trạng thái chặn: người dùng vẫn phải lưu được các thay đổi
  // khác của form.
  it('quay về giữ nguyên thì bỏ chọn và bỏ chặn', async () => {
    mockGraphQL([policy('policy-1', 3), policy('policy-2', 4)])
    const onChange = jest.fn()
    const user = await openPickerAndSelectVersion(onChange)
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith({ assessmentPolicyId: null, isBlocked: true }))

    await user.click(screen.getByRole('button', { name: 'Giữ nguyên chính sách hiện tại' }))

    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith({ assessmentPolicyId: null, isBlocked: false }))
    expect(screen.getByText('Đang dùng chính sách đánh giá hiện tại.')).toBeInTheDocument()
  })
})
