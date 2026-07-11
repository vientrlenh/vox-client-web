import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { renderWithProviders } from '@/test/renderWithProviders'
import { __resetReevaluationStore } from '../mock/reevaluationStore'
import {
  SchoolAdminReevaluationDetailPage,
  SchoolAdminReevaluationPage,
  TeacherReevaluationPage,
} from './ReevaluationPages'

beforeEach(() => {
  __resetReevaluationStore()
})

describe('SchoolAdminReevaluationPage', () => {
  it('hiển thị tiêu đề, thống kê và danh sách yêu cầu từ dữ liệu mẫu', async () => {
    renderWithProviders(<SchoolAdminReevaluationPage />)

    expect(
      screen.getByRole('heading', { name: 'Yêu cầu phúc khảo' }),
    ).toBeInTheDocument()

    // Dòng dữ liệu mẫu xuất hiện sau khi query mock resolve.
    expect(await screen.findByText('Nguyễn Minh An')).toBeInTheDocument()
    expect(screen.getByText('Hoàng Nam')).toBeInTheDocument()
  })

  it('lọc theo trạng thái "Đã công bố"', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SchoolAdminReevaluationPage />)

    await screen.findByText('Nguyễn Minh An')
    await user.click(screen.getByRole('button', { name: /Đã công bố/ }))

    // Chỉ còn yêu cầu đã công bố (Hoàng Nam), yêu cầu chờ duyệt biến mất.
    expect(screen.getByText('Hoàng Nam')).toBeInTheDocument()
    expect(screen.queryByText('Nguyễn Minh An')).not.toBeInTheDocument()
  })
})

describe('SchoolAdminReevaluationDetailPage', () => {
  it('duyệt một yêu cầu chờ duyệt sẽ chuyển sang màn phân công', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <Routes>
        <Route
          element={<SchoolAdminReevaluationDetailPage />}
          path="/school-admin/reevaluation/:requestId"
        />
      </Routes>,
      { route: '/school-admin/reevaluation/PK-2401' },
    )

    const approve = await screen.findByRole('button', { name: /Duyệt & phân công/ })
    await user.click(approve)

    expect(
      await screen.findByRole('heading', { name: 'Phân công giám khảo chấm lại' }),
    ).toBeInTheDocument()
  })
})

describe('TeacherReevaluationPage', () => {
  it('hiển thị các bài được phân công cho giáo viên hiện tại', async () => {
    renderWithProviders(<TeacherReevaluationPage />)

    expect(
      screen.getByRole('heading', { name: 'Bài được phân công chấm lại' }),
    ).toBeInTheDocument()

    // t1 (Trần Thu Hà) được giao PK-2404 (đang chấm) và PK-2405 (đã nộp).
    const duy = await screen.findByText('Vũ Đức Duy')
    expect(duy).toBeInTheDocument()
    const row = duy.closest('tr') as HTMLElement
    expect(within(row).getByRole('button', { name: /Chấm ngay/ })).toBeInTheDocument()

    await waitFor(() => expect(screen.getByText('Đặng Thảo My')).toBeInTheDocument())
  })
})
