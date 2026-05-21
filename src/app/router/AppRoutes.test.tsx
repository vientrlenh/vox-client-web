import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import { AppRoutes } from './AppRoutes'

describe('AppRoutes', () => {
  it('renders the index route', async () => {
    renderWithProviders(<AppRoutes />)

    expect(
      await screen.findByRole('heading', { name: /vox client web/i }),
    ).toBeInTheDocument()
  })
})
