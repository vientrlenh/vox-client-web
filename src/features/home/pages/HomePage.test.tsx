import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import { HomePage } from './HomePage'

describe('HomePage', () => {
  it('renders the Tailwind styled starter page', () => {
    const { container } = renderWithProviders(<HomePage />)

    expect(
      screen.getByRole('heading', { name: /vox client web/i }),
    ).toBeInTheDocument()
    expect(container.firstElementChild).toHaveClass('min-h-[calc(100vh-4rem)]')
  })
})
