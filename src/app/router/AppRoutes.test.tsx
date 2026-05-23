import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import { AppRoutes } from './AppRoutes'

describe('AppRoutes', () => {
  it('renders the index route', async () => {
    renderWithProviders(<AppRoutes />)

    expect(
      await screen.findByRole('heading', {
        name: /đánh giá kỹ năng nói thông minh hơn/i,
      }),
    ).toBeInTheDocument()
  })

  it('renders the login route', async () => {
    renderWithProviders(<AppRoutes />, { route: '/login' })

    expect(
      await screen.findByRole('heading', { name: /đăng nhập/i }),
    ).toBeInTheDocument()
  })
})
