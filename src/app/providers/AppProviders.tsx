import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import type { PropsWithChildren } from 'react'
import { Provider as ReduxProvider } from 'react-redux'
import { BrowserRouter } from 'react-router'
import { queryClient } from '@/app/query/queryClient'
import { store } from '@/app/store/store'
import { appConfig } from '@/shared/config/env'

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ReduxProvider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{children}</BrowserRouter>
        {appConfig.enableQueryDevtools ? (
          <ReactQueryDevtools initialIsOpen={false} />
        ) : null}
      </QueryClientProvider>
    </ReduxProvider>
  )
}
