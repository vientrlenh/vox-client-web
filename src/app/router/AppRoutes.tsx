import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { SchoolAdminLayout } from '@/app/layouts/SchoolAdminLayout'
import { SystemAdminLayout } from '@/app/layouts/SystemAdminLayout'
import { RequireRole } from './RequireRole'
import { PageLoader } from '@/shared/ui/PageLoader'


const HomePage = lazy(() =>
  import("@/features/home").then((module) => ({ default: module.HomePage })),
);

const LoginPage = lazy(() =>
  import("@/features/auth").then((module) => ({ default: module.LoginPage })),
);

const RegisterPage = lazy(() =>
  import('@/features/registration').then((module) => ({
    default: module.RegisterPage,
  })),
)


const ResetPasswordPage = lazy(() =>
  import("@/features/auth").then((module) => ({
    default: module.ResetPasswordPage,
  })),
);

const SetupPasswordPage = lazy(() =>
  import("@/features/auth").then((module) => ({
    default: module.SetupPasswordPage,
  })),
);

const SystemAdminDashboardPage = lazy(() =>
  import("@/features/dashboard").then((module) => ({
    default: module.SystemAdminDashboardPage,
  })),
)

const SchoolAdminDashboardPage = lazy(() =>
  import('@/features/dashboard').then((module) => ({
    default: module.SchoolAdminDashboardPage,
  })),
)

const SystemAdminRegistrationsPage = lazy(() =>
  import("@/features/registration").then((module) => ({
    default: module.SystemAdminRegistrationsPage,
  })),
)

const SystemAdminLanguagesPage = lazy(() =>
  import('@/features/languages').then((module) => ({
    default: module.SystemAdminLanguagesPage,
  })),
)

const SchoolAdminClassesPage = lazy(() =>
  import('@/features/classes').then((module) => ({
    default: module.SchoolAdminClassesPage,
  })),
)

const SchoolAdminClassDetailPage = lazy(() =>
  import('@/features/classes').then((module) => ({
    default: module.SchoolAdminClassDetailPage,
  })),
)

const SchoolAdminClassImportPage = lazy(() =>
  import('@/features/classes').then((module) => ({
    default: module.SchoolAdminClassImportPage,
  })),
)

const SchoolAdminClassUserImportPage = lazy(() =>
  import('@/features/classes').then((module) => ({
    default: module.SchoolAdminClassUserImportPage,
  })),
)

const SchoolAdminSchoolUsersPage = lazy(() =>
  import('@/features/school-users').then((module) => ({
    default: module.SchoolAdminSchoolUsersPage,
  })),
)

const SchoolAdminSchoolUserDetailPage = lazy(() =>
  import('@/features/school-users').then((module) => ({
    default: module.SchoolAdminSchoolUserDetailPage,
  })),
)

const SchoolAdminSchoolUserImportPage = lazy(() =>
  import('@/features/school-users').then((module) => ({
    default: module.SchoolAdminSchoolUserImportPage,
  })),
)

const SchoolAdminImportSessionsPage = lazy(() =>
  import('@/features/imports').then((module) => ({
    default: module.SchoolAdminImportSessionsPage,
  })),
)

const SchoolAdminImportSessionDetailPage = lazy(() =>
  import('@/features/imports').then((module) => ({
    default: module.SchoolAdminImportSessionDetailPage,
  })),
)


const SystemAdminSchoolsPage = lazy(() =>
  import("@/features/school").then((module) => ({
    default: module.SystemAdminSchoolsPage,
  })),
);

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="setup-password" element={<SetupPasswordPage />} />
        <Route element={<RequireRole role="SYSTEM_ADMIN" />}>
          <Route element={<SystemAdminLayout />}>
            <Route
              path="system-admin/dashboard"
              element={<SystemAdminDashboardPage />}
            />
            <Route
              path="system-admin/registrations"
              element={<SystemAdminRegistrationsPage />}
            />
            <Route
              path="system-admin/languages"
              element={<SystemAdminLanguagesPage />}
            />
          </Route>
        </Route>
        <Route element={<RequireRole role="SCHOOL_ADMIN" />}>
          <Route element={<SchoolAdminLayout />}>
            <Route
              path="school-admin/dashboard"
              element={<SchoolAdminDashboardPage />}
            />
            <Route
              path="school-admin/classes"
              element={<SchoolAdminClassesPage />}
            />
            <Route
              path="school-admin/classes/import"
              element={<SchoolAdminClassImportPage />}
            />
            <Route
              path="school-admin/classes/:classId/users/import"
              element={<SchoolAdminClassUserImportPage />}
            />
            <Route
              path="school-admin/students"
              element={<SchoolAdminSchoolUsersPage />}
            />
            <Route
              path="school-admin/students/import"
              element={<SchoolAdminSchoolUserImportPage />}
            />
            <Route
              path="school-admin/students/:userId"
              element={<SchoolAdminSchoolUserDetailPage />}
            />
            <Route
              path="school-admin/imports"
              element={<SchoolAdminImportSessionsPage />}
            />
            <Route
              path="school-admin/imports/:sessionId"
              element={<SchoolAdminImportSessionDetailPage />}
            />
            <Route
              path="school-admin/classes/:classId"
              element={<SchoolAdminClassDetailPage />}
            />
            {/* Đăng ký route mới tại đây */}
            <Route
              path="system-admin/schools"
              element={<SystemAdminSchoolsPage />}
            />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
