import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router";
import { SchoolAdminLayout } from "@/app/layouts/SchoolAdminLayout";
import { SystemAdminLayout } from "@/app/layouts/SystemAdminLayout";
import { TeacherLayout } from "@/app/layouts/TeacherLayout";
import { RequireRole } from "./RequireRole";
import { PageLoader } from "@/shared/ui/PageLoader";
import { OAuth2CallbackPage } from "@/features/auth/pages/OAuth2SuccessPage";

const HomePage = lazy(() =>
  import("@/features/home").then((module) => ({ default: module.HomePage })),
);

const LoginPage = lazy(() =>
  import("@/features/auth").then((module) => ({ default: module.LoginPage })),
);

const RegisterPage = lazy(() =>
  import("@/features/registration").then((module) => ({
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

const ProfilePage = lazy(() => 
  import("@/features/profile").then((module) => ({
    default: module.ProfilePage
  }))
);

const SystemAdminDashboardPage = lazy(() =>
  import("@/features/dashboard").then((module) => ({
    default: module.SystemAdminDashboardPage,
  })),
);

const SchoolAdminDashboardPage = lazy(() =>
  import("@/features/dashboard").then((module) => ({
    default: module.SchoolAdminDashboardPage,
  })),
);

const SystemAdminRegistrationsPage = lazy(() =>
  import("@/features/registration").then((module) => ({
    default: module.SystemAdminRegistrationsPage,
  })),
);

const SystemAdminLanguagesPage = lazy(() =>
  import("@/features/languages").then((module) => ({
    default: module.SystemAdminLanguagesPage,
  })),
);

const SystemAdminSchoolDirectoryPage = lazy(() =>
  import('@/features/school-directory').then((module) => ({
    default: module.SystemAdminSchoolDirectoryPage,
  })),
)

const SystemAdminSchoolDirectoryImportPage = lazy(() =>
  import('@/features/school-directory').then((module) => ({
    default: module.SystemAdminSchoolDirectoryImportPage,
  })),
)

const SchoolAdminClassesPage = lazy(() =>
  import("@/features/classes").then((module) => ({
    default: module.SchoolAdminClassesPage,
  })),
);

const SchoolAdminClassDetailPage = lazy(() =>
  import("@/features/classes").then((module) => ({
    default: module.SchoolAdminClassDetailPage,
  })),
);

const SchoolAdminClassImportPage = lazy(() =>
  import("@/features/classes").then((module) => ({
    default: module.SchoolAdminClassImportPage,
  })),
);

const SchoolAdminClassUserImportPage = lazy(() =>
  import("@/features/classes").then((module) => ({
    default: module.SchoolAdminClassUserImportPage,
  })),
);

const SchoolAdminGradesPage = lazy(() =>
  import('@/features/grades').then((module) => ({
    default: module.SchoolAdminGradesPage,
  })),
)

const SchoolAdminGradeLevelDetailPage = lazy(() =>
  import('@/features/grades').then((module) => ({
    default: module.SchoolAdminGradeLevelDetailPage,
  })),
)

const SchoolAdminGradeLevelImportPage = lazy(() =>
  import('@/features/grades').then((module) => ({
    default: module.SchoolAdminGradeLevelImportPage,
  })),
)

const SchoolAdminGradeImportPage = lazy(() =>
  import('@/features/grades').then((module) => ({
    default: module.SchoolAdminGradeImportPage,
  })),
)

const SchoolAdminSchoolUsersPage = lazy(() =>
  import("@/features/school-users").then((module) => ({
    default: module.SchoolAdminSchoolUsersPage,
  })),
);

const SchoolAdminSchoolUserDetailPage = lazy(() =>
  import("@/features/school-users").then((module) => ({
    default: module.SchoolAdminSchoolUserDetailPage,
  })),
);

const SchoolAdminSchoolUserImportPage = lazy(() =>
  import("@/features/school-users").then((module) => ({
    default: module.SchoolAdminSchoolUserImportPage,
  })),
);

const SchoolAdminImportSessionsPage = lazy(() =>
  import("@/features/imports").then((module) => ({
    default: module.SchoolAdminImportSessionsPage,
  })),
);

const SchoolAdminImportSessionDetailPage = lazy(() =>
  import("@/features/imports").then((module) => ({
    default: module.SchoolAdminImportSessionDetailPage,
  })),
);

const SystemAdminSchoolsPage = lazy(() =>
  import("@/features/school").then((module) => ({
    default: module.SystemAdminSchoolsPage,
  })),
);

const TeacherMonitoringRoomsPage = lazy(() =>
  import("@/features/monitoring").then((module) => ({
    default: module.TeacherMonitoringRoomsPage,
  })),
);

const SchoolAdminMonitoringRoomsPage = lazy(() =>
  import("@/features/monitoring").then((module) => ({
    default: module.SchoolAdminMonitoringRoomsPage,
  })),
);

const MonitoringRoomPage = lazy(() =>
  import("@/features/monitoring").then((module) => ({
    default: module.MonitoringRoomPage,
  })),
);

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="oauth2-callback" element={<OAuth2CallbackPage/>}/>
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
            <Route
              path="system-admin/school-directory"
              element={<SystemAdminSchoolDirectoryPage />}
            />
            <Route
              path="system-admin/school-directory/import"
              element={<SystemAdminSchoolDirectoryImportPage />}
            />
            <Route
              path="system-admin/schools"
              element={<SystemAdminSchoolsPage />}
            />
            <Route
              path="system-admin/profile"
              element={<ProfilePage/>}
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
              path="school-admin/monitoring"
              element={<SchoolAdminMonitoringRoomsPage />}
            />
            <Route
              path="school-admin/monitoring/rooms/:roomId"
              element={<MonitoringRoomPage />}
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
              path="school-admin/classes/users/import"
              element={<SchoolAdminClassUserImportPage />}
            />
            <Route
              path="school-admin/classes/:classId/users/import"
              element={<SchoolAdminClassUserImportPage />}
            />
            <Route
              path="school-admin/grades"
              element={<SchoolAdminGradesPage />}
            />
            <Route
              path="school-admin/grades/import"
              element={<SchoolAdminGradeLevelImportPage />}
            />
            <Route
              path="school-admin/grades/:gradeLevelId/grades/import"
              element={<SchoolAdminGradeImportPage />}
            />
            <Route
              path="school-admin/grades/:gradeLevelId"
              element={<SchoolAdminGradeLevelDetailPage />}
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
            <Route
              path="school-admin/profile"
              element={<ProfilePage/>}
            />
          </Route>
        </Route>
        <Route element={<RequireRole role="TEACHER" />}>
          <Route element={<TeacherLayout />}>
            <Route
              path="teacher/monitoring"
              element={<TeacherMonitoringRoomsPage />}
            />
            <Route
              path="teacher/monitoring/rooms/:roomId"
              element={<MonitoringRoomPage />}
            />
            <Route
              path="teacher/profile"
              element={<ProfilePage/>}
            />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
