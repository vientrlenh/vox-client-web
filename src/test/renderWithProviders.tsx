import { QueryClientProvider } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { RenderOptions } from '@testing-library/react'
import type { PropsWithChildren, ReactElement } from 'react'
import { Provider as ReduxProvider } from 'react-redux'
import { MemoryRouter } from 'react-router'
import { createQueryClient } from '@/app/query/queryClient'
import { configureAppStore } from '@/app/store/store'
import type { AppStore } from '@/app/store/store'

type TestProviderOptions = {
  queryClient?: QueryClient
  route?: string
  store?: AppStore
}

type ExtendedRenderOptions = Omit<RenderOptions, 'wrapper'> & TestProviderOptions

export function createTestProviders({
  queryClient = createQueryClient(),
  route = '/',
  store = configureAppStore(),
}: TestProviderOptions = {}) {
  function Wrapper({ children }: PropsWithChildren) {
    return (
      <ReduxProvider store={store}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
        </QueryClientProvider>
      </ReduxProvider>
    )
  }

  return {
    queryClient,
    store,
    Wrapper,
  }
}

export function renderWithProviders(
  ui: ReactElement,
  { queryClient, route, store, ...renderOptions }: ExtendedRenderOptions = {},
) {
  const providers = createTestProviders({ queryClient, route, store })

  return {
    queryClient: providers.queryClient,
    store: providers.store,
    ...render(ui, { wrapper: providers.Wrapper, ...renderOptions }),
  }
}
