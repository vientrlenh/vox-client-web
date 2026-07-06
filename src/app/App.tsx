import { AppProviders } from './providers/AppProviders'
import { AuthProvider } from './providers/AuthProvider'
import { AppRoutes } from './router/AppRoutes'

export function App() {
  return (
    <AppProviders>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </AppProviders>
  )
}
