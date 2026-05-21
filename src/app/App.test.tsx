import { render, screen } from '@testing-library/react'
import { App } from './App'

describe('App', () => {
  it('renders the home route', async () => {
    render(<App />)

    expect(
      await screen.findByRole('heading', { name: /vox client web/i }),
    ).toBeInTheDocument()
  })
})
