import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router";
import { SystemAdminLayout } from "@/app/layouts/SystemAdminLayout";
import { RequireRole } from "./RequireRole";
import { PageLoader } from "@/shared/ui/PageLoader";

const HomePage = lazy(() =>
  import("@/features/home").then((module) => ({ default: module.HomePage })),
);

const LoginPage = lazy(() =>
  import("@/features/auth").then((module) => ({ default: module.LoginPage })),
);

const RegisterPage = lazy(() =>
  import("@/features/auth").then((module) => ({
    default: module.RegisterPage,
  })),
);

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
);

const SystemAdminRegistrationsPage = lazy(() =>
  import("@/features/registration").then((module) => ({
    default: module.SystemAdminRegistrationsPage,
  })),
);

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
