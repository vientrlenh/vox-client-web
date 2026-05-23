import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { PageLoader } from '@/shared/ui/PageLoader'

const HomePage = lazy(() =>
  import('@/features/home').then((module) => ({ default: module.HomePage })),
)

const LoginPage = lazy(() =>
  import('@/features/auth').then((module) => ({ default: module.LoginPage })),
)

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
