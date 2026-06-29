import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { SchoolAdminLayout } from '@/app/layouts/SchoolAdminLayout'
import { SystemAdminLayout } from '@/app/layouts/SystemAdminLayout'
import { TeacherLayout } from '@/app/layouts/TeacherLayout'
import { RequireRole } from './RequireRole'
import { PageLoader } from '@/shared/ui/PageLoader'

const HomePage = lazy(() =>
  import('@/features/home').then((module) => ({ default: module.HomePage })),
)

const LoginPage = lazy(() =>
  import('@/features/auth').then((module) => ({ default: module.LoginPage })),
)

const RegisterPage = lazy(() =>
  import('@/features/auth').then((module) => ({ default: module.RegisterPage })),
)

const ResetPasswordPage = lazy(() =>
  import('@/features/auth').then((module) => ({
    default: module.ResetPasswordPage,
  })),
)

const SetupPasswordPage = lazy(() =>
  import('@/features/auth').then((module) => ({
    default: module.SetupPasswordPage,
  })),
)

const SystemAdminDashboardPage = lazy(() =>
  import('@/features/dashboard').then((module) => ({
    default: module.SystemAdminDashboardPage,
  })),
)

const SchoolAdminDashboardPage = lazy(() =>
  import('@/features/dashboard').then((module) => ({
    default: module.SchoolAdminDashboardPage,
  })),
)

const SystemAdminRegistrationsPage = lazy(() =>
  import('@/features/registration').then((module) => ({
    default: module.SystemAdminRegistrationsPage,
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

const TeacherQuestionBanksPage = lazy(() =>
  import('@/features/question-bank').then((module) => ({
    default: module.TeacherQuestionBanksPage,
  })),
)

const SchoolAdminQuestionBanksPage = lazy(() =>
  import('@/features/question-bank').then((module) => ({
    default: module.SchoolAdminQuestionBanksPage,
  })),
)

const SystemAdminQuestionBanksPage = lazy(() =>
  import('@/features/question-bank').then((module) => ({
    default: module.SystemAdminQuestionBanksPage,
  })),
)

const TeacherQuestionBankDetailPage = lazy(() =>
  import('@/features/question-bank').then((module) => ({
    default: module.TeacherQuestionBankDetailPage,
  })),
)

const SchoolAdminQuestionBankDetailPage = lazy(() =>
  import('@/features/question-bank').then((module) => ({
    default: module.SchoolAdminQuestionBankDetailPage,
  })),
)

const SystemAdminQuestionBankDetailPage = lazy(() =>
  import('@/features/question-bank').then((module) => ({
    default: module.SystemAdminQuestionBankDetailPage,
  })),
)

const TeacherQuestionTopicsPage = lazy(() =>
  import('@/features/question-topic').then((module) => ({
    default: module.TeacherQuestionTopicsPage,
  })),
)

const SchoolAdminQuestionTopicsPage = lazy(() =>
  import('@/features/question-topic').then((module) => ({
    default: module.SchoolAdminQuestionTopicsPage,
  })),
)

const SystemAdminQuestionTopicsPage = lazy(() =>
  import('@/features/question-topic').then((module) => ({
    default: module.SystemAdminQuestionTopicsPage,
  })),
)

const TeacherQuestionTopicDetailPage = lazy(() =>
  import('@/features/question-topic').then((module) => ({
    default: module.TeacherQuestionTopicDetailPage,
  })),
)

const SchoolAdminQuestionTopicDetailPage = lazy(() =>
  import('@/features/question-topic').then((module) => ({
    default: module.SchoolAdminQuestionTopicDetailPage,
  })),
)

const SystemAdminQuestionTopicDetailPage = lazy(() =>
  import('@/features/question-topic').then((module) => ({
    default: module.SystemAdminQuestionTopicDetailPage,
  })),
)

const TeacherMyQuestionsPage = lazy(() =>
  import('@/features/question').then((module) => ({
    default: module.TeacherMyQuestionsPage,
  })),
)

const TeacherQuestionsPage = lazy(() =>
  import('@/features/question').then((module) => ({
    default: module.TeacherQuestionsPage,
  })),
)

const TeacherCreateQuestionPage = lazy(() =>
  import('@/features/question').then((module) => ({
    default: module.TeacherCreateQuestionPage,
  })),
)

const TeacherEditQuestionPage = lazy(() =>
  import('@/features/question').then((module) => ({
    default: module.TeacherEditQuestionPage,
  })),
)

const TeacherQuestionDetailPage = lazy(() =>
  import('@/features/question').then((module) => ({
    default: module.TeacherQuestionDetailPage,
  })),
)

const TeacherReviewQuestionsPage = lazy(() =>
  import('@/features/question').then((module) => ({
    default: module.TeacherReviewQuestionsPage,
  })),
)

const SchoolAdminQuestionsPage = lazy(() =>
  import('@/features/question').then((module) => ({
    default: module.SchoolAdminQuestionsPage,
  })),
)

const SchoolAdminCreateQuestionPage = lazy(() =>
  import('@/features/question').then((module) => ({
    default: module.SchoolAdminCreateQuestionPage,
  })),
)

const SchoolAdminEditQuestionPage = lazy(() =>
  import('@/features/question').then((module) => ({
    default: module.SchoolAdminEditQuestionPage,
  })),
)

const SchoolAdminQuestionDetailPage = lazy(() =>
  import('@/features/question').then((module) => ({
    default: module.SchoolAdminQuestionDetailPage,
  })),
)

const SchoolAdminReviewQuestionsPage = lazy(() =>
  import('@/features/question').then((module) => ({
    default: module.SchoolAdminReviewQuestionsPage,
  })),
)

const SystemAdminQuestionsPage = lazy(() =>
  import('@/features/question').then((module) => ({
    default: module.SystemAdminQuestionsPage,
  })),
)

const SystemAdminCreateQuestionPage = lazy(() =>
  import('@/features/question').then((module) => ({
    default: module.SystemAdminCreateQuestionPage,
  })),
)

const SystemAdminEditQuestionPage = lazy(() =>
  import('@/features/question').then((module) => ({
    default: module.SystemAdminEditQuestionPage,
  })),
)

const SystemAdminQuestionDetailPage = lazy(() =>
  import('@/features/question').then((module) => ({
    default: module.SystemAdminQuestionDetailPage,
  })),
)

const SystemAdminReviewQuestionsPage = lazy(() =>
  import('@/features/question').then((module) => ({
    default: module.SystemAdminReviewQuestionsPage,
  })),
)

const SchoolAdminExamsPage = lazy(() =>
  import('@/features/exam').then((module) => ({
    default: module.SchoolAdminExamsPage,
  })),
)

const SchoolAdminExamDetailPage = lazy(() =>
  import('@/features/exam').then((module) => ({
    default: module.SchoolAdminExamDetailPage,
  })),
)

const SchoolAdminBlueprintsPage = lazy(() =>
  import('@/features/exam').then((module) => ({
    default: module.SchoolAdminBlueprintsPage,
  })),
)

const SchoolAdminBlueprintDetailPage = lazy(() =>
  import('@/features/exam').then((module) => ({
    default: module.SchoolAdminBlueprintDetailPage,
  })),
)

const SchoolAdminClassTestsPage = lazy(() =>
  import('@/features/exam').then((module) => ({
    default: module.SchoolAdminClassTestsPage,
  })),
)

const SchoolAdminClassTestDetailPage = lazy(() =>
  import('@/features/exam').then((module) => ({
    default: module.SchoolAdminClassTestDetailPage,
  })),
)

const TeacherExamsPage = lazy(() =>
  import('@/features/exam').then((module) => ({
    default: module.TeacherExamsPage,
  })),
)

const TeacherExamDetailPage = lazy(() =>
  import('@/features/exam').then((module) => ({
    default: module.TeacherExamDetailPage,
  })),
)

const TeacherBlueprintsPage = lazy(() =>
  import('@/features/exam').then((module) => ({
    default: module.TeacherBlueprintsPage,
  })),
)

const TeacherBlueprintDetailPage = lazy(() =>
  import('@/features/exam').then((module) => ({
    default: module.TeacherBlueprintDetailPage,
  })),
)

const TeacherClassTestsPage = lazy(() =>
  import('@/features/exam').then((module) => ({
    default: module.TeacherClassTestsPage,
  })),
)

const TeacherClassTestCreatePage = lazy(() =>
  import('@/features/exam').then((module) => ({
    default: module.TeacherClassTestCreatePage,
  })),
)

const TeacherClassTestDetailPage = lazy(() =>
  import('@/features/exam').then((module) => ({
    default: module.TeacherClassTestDetailPage,
  })),
)

const SystemAdminExamsPage = lazy(() =>
  import('@/features/exam').then((module) => ({
    default: module.SystemAdminExamsPage,
  })),
)

const SystemAdminExamDetailPage = lazy(() =>
  import('@/features/exam').then((module) => ({
    default: module.SystemAdminExamDetailPage,
  })),
)

const SystemAdminBlueprintsPage = lazy(() =>
  import('@/features/exam').then((module) => ({
    default: module.SystemAdminBlueprintsPage,
  })),
)

const SystemAdminBlueprintDetailPage = lazy(() =>
  import('@/features/exam').then((module) => ({
    default: module.SystemAdminBlueprintDetailPage,
  })),
)

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
              path="system-admin/question-banks"
              element={<SystemAdminQuestionBanksPage />}
            />
            <Route
              path="system-admin/question-banks/:bankId"
              element={<SystemAdminQuestionBankDetailPage />}
            />
            <Route
              path="system-admin/question-topics"
              element={<SystemAdminQuestionTopicsPage />}
            />
            <Route
              path="system-admin/question-topics/:topicId"
              element={<SystemAdminQuestionTopicDetailPage />}
            />
            <Route
              path="system-admin/questions/all"
              element={<SystemAdminQuestionsPage />}
            />
            <Route
              path="system-admin/questions/create"
              element={<SystemAdminCreateQuestionPage />}
            />
            <Route
              path="system-admin/questions/:questionId"
              element={<SystemAdminQuestionDetailPage />}
            />
            <Route
              path="system-admin/questions/:questionId/edit"
              element={<SystemAdminEditQuestionPage />}
            />
            <Route
              path="system-admin/questions/review"
              element={<SystemAdminReviewQuestionsPage />}
            />
            <Route
              path="system-admin/exams"
              element={<SystemAdminExamsPage />}
            />
            <Route
              path="system-admin/exams/:examId"
              element={<SystemAdminExamDetailPage />}
            />
            <Route
              path="system-admin/blueprints"
              element={<SystemAdminBlueprintsPage />}
            />
            <Route
              path="system-admin/blueprints/:blueprintId"
              element={<SystemAdminBlueprintDetailPage />}
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
              path="school-admin/classes/:classId"
              element={<SchoolAdminClassDetailPage />}
            />
            <Route
              path="school-admin/question-banks"
              element={<SchoolAdminQuestionBanksPage />}
            />
            <Route
              path="school-admin/question-banks/:bankId"
              element={<SchoolAdminQuestionBankDetailPage />}
            />
            <Route
              path="school-admin/question-topics"
              element={<SchoolAdminQuestionTopicsPage />}
            />
            <Route
              path="school-admin/question-topics/:topicId"
              element={<SchoolAdminQuestionTopicDetailPage />}
            />
            <Route
              path="school-admin/questions/all"
              element={<SchoolAdminQuestionsPage />}
            />
            <Route
              path="school-admin/questions/create"
              element={<SchoolAdminCreateQuestionPage />}
            />
            <Route
              path="school-admin/questions/:questionId"
              element={<SchoolAdminQuestionDetailPage />}
            />
            <Route
              path="school-admin/questions/:questionId/edit"
              element={<SchoolAdminEditQuestionPage />}
            />
            <Route
              path="school-admin/questions/review"
              element={<SchoolAdminReviewQuestionsPage />}
            />
            <Route
              path="school-admin/exams"
              element={<SchoolAdminExamsPage />}
            />
            <Route
              path="school-admin/exams/:examId"
              element={<SchoolAdminExamDetailPage />}
            />
            <Route
              path="school-admin/blueprints"
              element={<SchoolAdminBlueprintsPage />}
            />
            <Route
              path="school-admin/blueprints/:blueprintId"
              element={<SchoolAdminBlueprintDetailPage />}
            />
            <Route
              path="school-admin/class-tests"
              element={<SchoolAdminClassTestsPage />}
            />
            <Route
              path="school-admin/class-tests/:examId"
              element={<SchoolAdminClassTestDetailPage />}
            />
          </Route>
        </Route>
        <Route element={<RequireRole role="TEACHER" />}>
          <Route element={<TeacherLayout />}>
            <Route
              path="teacher/question-banks"
              element={<TeacherQuestionBanksPage />}
            />
            <Route
              path="teacher/question-banks/:bankId"
              element={<TeacherQuestionBankDetailPage />}
            />
            <Route
              path="teacher/question-topics"
              element={<TeacherQuestionTopicsPage />}
            />
            <Route
              path="teacher/question-topics/:topicId"
              element={<TeacherQuestionTopicDetailPage />}
            />
            <Route
              path="teacher/questions/my"
              element={<TeacherMyQuestionsPage />}
            />
            <Route
              path="teacher/questions/all"
              element={<TeacherQuestionsPage />}
            />
            <Route
              path="teacher/questions/create"
              element={<TeacherCreateQuestionPage />}
            />
            <Route
              path="teacher/questions/:questionId"
              element={<TeacherQuestionDetailPage />}
            />
            <Route
              path="teacher/questions/:questionId/edit"
              element={<TeacherEditQuestionPage />}
            />
            <Route
              path="teacher/questions/review"
              element={<TeacherReviewQuestionsPage />}
            />
            <Route
              path="teacher/exams"
              element={<TeacherExamsPage />}
            />
            <Route
              path="teacher/exams/:examId"
              element={<TeacherExamDetailPage />}
            />
            <Route
              path="teacher/blueprints"
              element={<TeacherBlueprintsPage />}
            />
            <Route
              path="teacher/blueprints/:blueprintId"
              element={<TeacherBlueprintDetailPage />}
            />
            <Route
              path="teacher/class-tests"
              element={<TeacherClassTestsPage />}
            />
            <Route
              path="teacher/class-tests/create"
              element={<TeacherClassTestCreatePage />}
            />
            <Route
              path="teacher/class-tests/:examId"
              element={<TeacherClassTestDetailPage />}
            />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
