import { render, screen } from '@testing-library/react'
import { App } from './App'

describe('App', () => {
  it('renders the home route', async () => {
    render(<App />)

    expect(
      await screen.findByRole('heading', {
        name: /đánh giá kỹ năng nói thông minh hơn/i,
      }),
    ).toBeInTheDocument()
  })
})
