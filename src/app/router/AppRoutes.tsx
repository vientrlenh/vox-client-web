import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { AppLayout } from '@/app/layouts/AppLayout'
import { PageLoader } from '@/shared/ui/PageLoader'

const HomePage = lazy(() =>
  import('@/features/home').then((module) => ({ default: module.HomePage })),
)

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
