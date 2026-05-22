import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import { HomePage } from './HomePage'

describe('HomePage', () => {
  it('renders the landing page with primary calls to action', () => {
    const { container } = renderWithProviders(<HomePage />)

    expect(
      screen.getByRole('heading', {
        name: /đánh giá kỹ năng nói thông minh hơn/i,
      }),
    ).toBeInTheDocument()
    expect(container.firstElementChild).toHaveClass('min-h-screen')
    expect(
      screen.getAllByRole('link', { name: /dùng thử miễn phí/i })[0],
    ).toHaveAttribute('href', '/register')
    expect(
      screen.getByRole('link', { name: /đăng nhập/i }),
    ).toHaveAttribute('href', '/login')
    expect(
      screen.getByRole('link', { name: /liên hệ tư vấn/i }),
    ).toHaveAttribute('href', '/contact')
  })
})
