import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router";
import { SchoolAdminLayout } from "@/app/layouts/SchoolAdminLayout";
import { SystemAdminLayout } from "@/app/layouts/SystemAdminLayout";
import { TeacherLayout } from "@/app/layouts/TeacherLayout";
import { RequireRole } from "./RequireRole";
import { PageLoader } from "@/shared/ui/PageLoader";
import { OAuth2CallbackPage } from "@/features/auth/pages/OAuth2SuccessPage";
import { RequireAuth } from "./RequireAuth";
import { RoleLayout } from "../layouts/RoleLayout";

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

const TeacherDashboardPage = lazy(() =>
  import("@/features/dashboard").then((module) => ({
    default: module.TeacherDashboardPage,
  }))
)

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

// question-bank
const TeacherQuestionBanksPage = lazy(() =>
  import("@/features/question-bank").then((m) => ({ default: m.TeacherQuestionBanksPage })),
);
const TeacherQuestionBankDetailPage = lazy(() =>
  import("@/features/question-bank").then((m) => ({ default: m.TeacherQuestionBankDetailPage })),
);
const SchoolAdminQuestionBanksPage = lazy(() =>
  import("@/features/question-bank").then((m) => ({ default: m.SchoolAdminQuestionBanksPage })),
);
const SchoolAdminQuestionBankDetailPage = lazy(() =>
  import("@/features/question-bank").then((m) => ({ default: m.SchoolAdminQuestionBankDetailPage })),
);
const SystemAdminQuestionBanksPage = lazy(() =>
  import("@/features/question-bank").then((m) => ({ default: m.SystemAdminQuestionBanksPage })),
);
const SystemAdminQuestionBankDetailPage = lazy(() =>
  import("@/features/question-bank").then((m) => ({ default: m.SystemAdminQuestionBankDetailPage })),
);

// question-topic
const TeacherQuestionTopicsPage = lazy(() =>
  import("@/features/question-topic").then((m) => ({ default: m.TeacherQuestionTopicsPage })),
);
const TeacherQuestionTopicDetailPage = lazy(() =>
  import("@/features/question-topic").then((m) => ({ default: m.TeacherQuestionTopicDetailPage })),
);
const SchoolAdminQuestionTopicsPage = lazy(() =>
  import("@/features/question-topic").then((m) => ({ default: m.SchoolAdminQuestionTopicsPage })),
);
const SchoolAdminQuestionTopicDetailPage = lazy(() =>
  import("@/features/question-topic").then((m) => ({ default: m.SchoolAdminQuestionTopicDetailPage })),
);
const SystemAdminQuestionTopicsPage = lazy(() =>
  import("@/features/question-topic").then((m) => ({ default: m.SystemAdminQuestionTopicsPage })),
);
const SystemAdminQuestionTopicDetailPage = lazy(() =>
  import("@/features/question-topic").then((m) => ({ default: m.SystemAdminQuestionTopicDetailPage })),
);

// question
const TeacherMyQuestionsPage = lazy(() =>
  import("@/features/question").then((m) => ({ default: m.TeacherMyQuestionsPage })),
);
const TeacherQuestionsPage = lazy(() =>
  import("@/features/question").then((m) => ({ default: m.TeacherQuestionsPage })),
);
const TeacherReviewQuestionsPage = lazy(() =>
  import("@/features/question").then((m) => ({ default: m.TeacherReviewQuestionsPage })),
);
const TeacherCreateQuestionPage = lazy(() =>
  import("@/features/question").then((m) => ({ default: m.TeacherCreateQuestionPage })),
);
const TeacherEditQuestionPage = lazy(() =>
  import("@/features/question").then((m) => ({ default: m.TeacherEditQuestionPage })),
);
const TeacherQuestionDetailPage = lazy(() =>
  import("@/features/question").then((m) => ({ default: m.TeacherQuestionDetailPage })),
);
const TeacherQuestionImportPage = lazy(() =>
  import("@/features/question").then((m) => ({ default: m.TeacherQuestionImportPage })),
);
const SchoolAdminQuestionsPage = lazy(() =>
  import("@/features/question").then((m) => ({ default: m.SchoolAdminQuestionsPage })),
);
const SchoolAdminReviewQuestionsPage = lazy(() =>
  import("@/features/question").then((m) => ({ default: m.SchoolAdminReviewQuestionsPage })),
);
const SchoolAdminCreateQuestionPage = lazy(() =>
  import("@/features/question").then((m) => ({ default: m.SchoolAdminCreateQuestionPage })),
);
const SchoolAdminEditQuestionPage = lazy(() =>
  import("@/features/question").then((m) => ({ default: m.SchoolAdminEditQuestionPage })),
);
const SchoolAdminQuestionDetailPage = lazy(() =>
  import("@/features/question").then((m) => ({ default: m.SchoolAdminQuestionDetailPage })),
);
const SystemAdminQuestionsPage = lazy(() =>
  import("@/features/question").then((m) => ({ default: m.SystemAdminQuestionsPage })),
);
const SystemAdminReviewQuestionsPage = lazy(() =>
  import("@/features/question").then((m) => ({ default: m.SystemAdminReviewQuestionsPage })),
);
const SystemAdminCreateQuestionPage = lazy(() =>
  import("@/features/question").then((m) => ({ default: m.SystemAdminCreateQuestionPage })),
);
const SystemAdminEditQuestionPage = lazy(() =>
  import("@/features/question").then((m) => ({ default: m.SystemAdminEditQuestionPage })),
);
const SystemAdminQuestionDetailPage = lazy(() =>
  import("@/features/question").then((m) => ({ default: m.SystemAdminQuestionDetailPage })),
);
const SystemAdminQuestionImportPage = lazy(() =>
  import("@/features/question").then((m) => ({ default: m.SystemAdminQuestionImportPage })),
);

// exam: blueprints
const TeacherBlueprintsPage = lazy(() =>
  import("@/features/exam").then((m) => ({ default: m.TeacherBlueprintsPage })),
);
const TeacherBlueprintDetailPage = lazy(() =>
  import("@/features/exam").then((m) => ({ default: m.TeacherBlueprintDetailPage })),
);
const SchoolAdminBlueprintsPage = lazy(() =>
  import("@/features/exam").then((m) => ({ default: m.SchoolAdminBlueprintsPage })),
);
const SchoolAdminBlueprintDetailPage = lazy(() =>
  import("@/features/exam").then((m) => ({ default: m.SchoolAdminBlueprintDetailPage })),
);
const SystemAdminBlueprintsPage = lazy(() =>
  import("@/features/exam").then((m) => ({ default: m.SystemAdminBlueprintsPage })),
);
const SystemAdminBlueprintDetailPage = lazy(() =>
  import("@/features/exam").then((m) => ({ default: m.SystemAdminBlueprintDetailPage })),
);

// exam: exams
const TeacherExamsPage = lazy(() =>
  import("@/features/exam").then((m) => ({ default: m.TeacherExamsPage })),
);
const TeacherExamDetailPage = lazy(() =>
  import("@/features/exam").then((m) => ({ default: m.TeacherExamDetailPage })),
);
const TeacherExamPapersPage = lazy(() =>
  import("@/features/exam").then((m) => ({ default: m.TeacherExamPapersPage })),
);
const TeacherExamPaperDetailPage = lazy(() =>
  import("@/features/exam").then((m) => ({ default: m.TeacherExamPaperDetailPage })),
);
const TeacherExamPaperEditPage = lazy(() =>
  import("@/features/exam").then((m) => ({ default: m.TeacherExamPaperEditPage })),
);
const SchoolAdminExamsPage = lazy(() =>
  import("@/features/exam").then((m) => ({ default: m.SchoolAdminExamsPage })),
);
const SchoolAdminExamDetailPage = lazy(() =>
  import("@/features/exam").then((m) => ({ default: m.SchoolAdminExamDetailPage })),
);
const SystemAdminExamsPage = lazy(() =>
  import("@/features/exam").then((m) => ({ default: m.SystemAdminExamsPage })),
);
const SystemAdminExamDetailPage = lazy(() =>
  import("@/features/exam").then((m) => ({ default: m.SystemAdminExamDetailPage })),
);

// exam: class tests
const TeacherClassTestsPage = lazy(() =>
  import("@/features/exam").then((m) => ({ default: m.TeacherClassTestsPage })),
);
const TeacherClassTestCreatePage = lazy(() =>
  import("@/features/exam").then((m) => ({ default: m.TeacherClassTestCreatePage })),
);
const TeacherClassTestDetailPage = lazy(() =>
  import("@/features/exam").then((m) => ({ default: m.TeacherClassTestDetailPage })),
);
const SchoolAdminClassTestsPage = lazy(() =>
  import("@/features/exam").then((m) => ({ default: m.SchoolAdminClassTestsPage })),
);
const SchoolAdminClassTestDetailPage = lazy(() =>
  import("@/features/exam").then((m) => ({ default: m.SchoolAdminClassTestDetailPage })),
);

const SchoolAdminRubricsPage = lazy(() =>
  import("@/features/rubrics_school").then((module) => ({
    default: module.SchoolAdminRubricsPage,
  })),
);

const SchoolAdminRubricDetailPage = lazy(() =>
  import("@/features/rubrics_school").then((module) => ({
    default: module.SchoolAdminRubricDetailPage,
  })),
);

const SchoolAdminRubricVersionDetailPage = lazy(() =>
  import("@/features/rubrics_school").then((module) => ({
    default: module.SchoolAdminRubricVersionDetailPage,
  })),
);

const SchoolAdminRubricCriterionDetailPage = lazy(() =>
  import("@/features/rubrics_school").then((module) => ({
    default: module.SchoolAdminRubricCriterionDetailPage,
  })),
);

const SchoolAdminRubricVersionImportPage = lazy(() =>
  import("@/features/rubrics_school").then((module) => ({
    default: module.SchoolAdminRubricVersionImportPage,
  })),
);

const SchoolAdminRubricCriterionImportPage = lazy(() =>
  import("@/features/rubrics_school").then((module) => ({
    default: module.SchoolAdminRubricCriterionImportPage,
  })),
);

const SchoolAdminRubricResultBandImportPage = lazy(() =>
  import("@/features/rubrics_school").then((module) => ({
    default: module.SchoolAdminRubricResultBandImportPage,
  })),
);

const SchoolAdminRubricCriterionBandImportPage = lazy(() =>
  import("@/features/rubrics_school").then((module) => ({
    default: module.SchoolAdminRubricCriterionBandImportPage,
  })),
);

const SystemAdminRubricsPage = lazy(() =>
  import("@/features/rubric_system").then((module) => ({
    default: module.SystemAdminRubricsPage,
  })),
);

const SystemAdminAssessmentPoliciesPage = lazy(() =>
  import("@/features/assessment_policy_system").then((module) => ({
    default: module.SystemAdminAssessmentPoliciesPage,
  })),
);

const SystemAdminAssessmentPolicyDetailPage = lazy(() =>
  import("@/features/assessment_policy_system").then((module) => ({
    default: module.SystemAdminAssessmentPolicyDetailPage,
  })),
);

const SystemAdminAssessmentPolicyImportPage = lazy(() =>
  import("@/features/assessment_policy_system").then((module) => ({
    default: module.SystemAdminAssessmentPolicyImportPage,
  })),
);

const SystemAdminRubricDetailPage = lazy(() =>
  import("@/features/rubric_system").then((module) => ({
    default: module.SystemAdminRubricDetailPage,
  })),
);

const SystemAdminRubricVersionDetailPage = lazy(() =>
  import("@/features/rubric_system").then((module) => ({
    default: module.SystemAdminRubricVersionDetailPage,
  })),
);

const SystemAdminRubricCriterionDetailPage = lazy(() =>
  import("@/features/rubric_system").then((module) => ({
    default: module.SystemAdminRubricCriterionDetailPage,
  })),
);

const SystemAdminRubricVersionImportPage = lazy(() =>
  import("@/features/rubric_system").then((module) => ({
    default: module.SystemAdminRubricVersionImportPage,
  })),
);

const SystemAdminRubricCriterionImportPage = lazy(() =>
  import("@/features/rubric_system").then((module) => ({
    default: module.SystemAdminRubricCriterionImportPage,
  })),
);

const SystemAdminRubricCriterionBandImportPage = lazy(() =>
  import("@/features/rubric_system").then((module) => ({
    default: module.SystemAdminRubricCriterionBandImportPage,
  })),
);

const SchoolAdminAssessmentPoliciesPage = lazy(() =>
  import("@/features/assessment_policy_school").then((module) => ({
    default: module.SchoolAdminAssessmentPoliciesPage,
  })),
);

const SchoolAdminAssessmentPolicyDetailPage = lazy(() =>
  import("@/features/assessment_policy_school").then((module) => ({
    default: module.SchoolAdminAssessmentPolicyDetailPage,
  })),
);

const SchoolAdminAssessmentPolicyImportPage = lazy(() =>
  import("@/features/assessment_policy_school").then((module) => ({
    default: module.SchoolAdminAssessmentPolicyImportPage,
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
        <Route element={<RequireAuth/>}>
          <Route element={<RoleLayout/>}>
              <Route
                path="profile"
                element={<ProfilePage/>}
              />
          </Route>
        </Route>
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
            <Route path="system-admin/question-banks" element={<SystemAdminQuestionBanksPage />} />
            <Route path="system-admin/question-banks/:bankId" element={<SystemAdminQuestionBankDetailPage />} />
            <Route path="system-admin/question-topics" element={<SystemAdminQuestionTopicsPage />} />
            <Route path="system-admin/question-topics/:topicId" element={<SystemAdminQuestionTopicDetailPage />} />
            <Route path="system-admin/questions/all" element={<SystemAdminQuestionsPage />} />
            <Route path="system-admin/questions/review" element={<SystemAdminReviewQuestionsPage />} />
            <Route path="system-admin/questions/import" element={<SystemAdminQuestionImportPage />} />
            <Route path="system-admin/questions/create" element={<SystemAdminCreateQuestionPage />} />
            <Route path="system-admin/questions/:questionId/edit" element={<SystemAdminEditQuestionPage />} />
            <Route path="system-admin/questions/:questionId" element={<SystemAdminQuestionDetailPage />} />
            <Route path="system-admin/blueprints" element={<SystemAdminBlueprintsPage />} />
            <Route path="system-admin/blueprints/:blueprintId" element={<SystemAdminBlueprintDetailPage />} />
            <Route path="system-admin/exams" element={<SystemAdminExamsPage />} />
            <Route path="system-admin/exams/:examId" element={<SystemAdminExamDetailPage />} />
            <Route
              path="system-admin/rubrics"
              element={<SystemAdminRubricsPage />}
            />
            <Route
              path="system-admin/rubrics/:rubricId"
              element={<SystemAdminRubricDetailPage />}
            />
            <Route
              path="system-admin/rubrics/:rubricId/versions/import"
              element={<SystemAdminRubricVersionImportPage />}
            />
            <Route
              path="system-admin/rubrics/:rubricId/versions/:versionId"
              element={<SystemAdminRubricVersionDetailPage />}
            />
            <Route
              path="system-admin/rubrics/:rubricId/versions/:versionId/criteria/import"
              element={<SystemAdminRubricCriterionImportPage />}
            />
            <Route
              path="system-admin/rubrics/:rubricId/versions/:versionId/criteria/:criterionId"
              element={<SystemAdminRubricCriterionDetailPage />}
            />
            <Route
              path="system-admin/rubrics/:rubricId/versions/:versionId/criteria/:criterionId/bands/import"
              element={<SystemAdminRubricCriterionBandImportPage />}
            />
            <Route
              path="system-admin/assessment-policies"
              element={<SystemAdminAssessmentPoliciesPage />}
            />
            <Route
              path="system-admin/assessment-policies/import"
              element={<SystemAdminAssessmentPolicyImportPage />}
            />
            <Route
              path="system-admin/assessment-policies/:policyId"
              element={<SystemAdminAssessmentPolicyDetailPage />}
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
            <Route path="school-admin/question-banks" element={<SchoolAdminQuestionBanksPage />} />
            <Route path="school-admin/question-banks/:bankId" element={<SchoolAdminQuestionBankDetailPage />} />
            <Route path="school-admin/question-topics" element={<SchoolAdminQuestionTopicsPage />} />
            <Route path="school-admin/question-topics/:topicId" element={<SchoolAdminQuestionTopicDetailPage />} />
            <Route path="school-admin/questions/all" element={<SchoolAdminQuestionsPage />} />
            <Route path="school-admin/questions/review" element={<SchoolAdminReviewQuestionsPage />} />
            <Route path="school-admin/questions/create" element={<SchoolAdminCreateQuestionPage />} />
            <Route path="school-admin/questions/:questionId/edit" element={<SchoolAdminEditQuestionPage />} />
            <Route path="school-admin/questions/:questionId" element={<SchoolAdminQuestionDetailPage />} />
            <Route path="school-admin/blueprints" element={<SchoolAdminBlueprintsPage />} />
            <Route path="school-admin/blueprints/:blueprintId" element={<SchoolAdminBlueprintDetailPage />} />
            <Route path="school-admin/exams" element={<SchoolAdminExamsPage />} />
            <Route path="school-admin/exams/:examId" element={<SchoolAdminExamDetailPage />} />
            <Route path="school-admin/class-tests" element={<SchoolAdminClassTestsPage />} />
            <Route path="school-admin/class-tests/:examId" element={<SchoolAdminClassTestDetailPage />} />
          </Route>
        </Route>
        <Route element={<RequireRole role="TEACHER" />}>
          <Route element={<TeacherLayout />}>
            <Route
              path="teacher/dashboard"
              element={<TeacherDashboardPage/>}
            />
            <Route
              path="teacher/monitoring"
              element={<TeacherMonitoringRoomsPage />}
            />
            <Route
              path="teacher/monitoring/rooms/:roomId"
              element={<MonitoringRoomPage />}
            />
            <Route path="teacher/question-banks" element={<TeacherQuestionBanksPage />} />
            <Route path="teacher/question-banks/:bankId" element={<TeacherQuestionBankDetailPage />} />
            <Route path="teacher/question-topics" element={<TeacherQuestionTopicsPage />} />
            <Route path="teacher/question-topics/:topicId" element={<TeacherQuestionTopicDetailPage />} />
            <Route path="teacher/questions/my" element={<TeacherMyQuestionsPage />} />
            <Route path="teacher/questions/all" element={<TeacherQuestionsPage />} />
            <Route path="teacher/questions/review" element={<TeacherReviewQuestionsPage />} />
            <Route path="teacher/questions/import" element={<TeacherQuestionImportPage />} />
            <Route path="teacher/questions/create" element={<TeacherCreateQuestionPage />} />
            <Route path="teacher/questions/:questionId/edit" element={<TeacherEditQuestionPage />} />
            <Route path="teacher/questions/:questionId" element={<TeacherQuestionDetailPage />} />
            <Route path="teacher/blueprints" element={<TeacherBlueprintsPage />} />
            <Route path="teacher/blueprints/:blueprintId" element={<TeacherBlueprintDetailPage />} />
            <Route path="teacher/exams" element={<TeacherExamsPage />} />
            <Route path="teacher/exams/:examId/papers/:paperId/edit" element={<TeacherExamPaperEditPage />} />
            <Route path="teacher/exams/:examId/papers/:paperId" element={<TeacherExamPaperDetailPage />} />
            <Route path="teacher/exams/:examId/papers" element={<TeacherExamPapersPage />} />
            <Route path="teacher/exams/:examId" element={<TeacherExamDetailPage />} />
            <Route path="teacher/class-tests/create" element={<TeacherClassTestCreatePage />} />
            <Route path="teacher/class-tests/:examId" element={<TeacherClassTestDetailPage />} />
            <Route path="teacher/class-tests" element={<TeacherClassTestsPage />} />
            <Route
              path="school-admin/rubrics"
              element={<SchoolAdminRubricsPage />}
            />
            <Route
              path="school-admin/rubrics/:rubricId"
              element={<SchoolAdminRubricDetailPage />}
            />
            <Route
              path="school-admin/rubrics/:rubricId/versions/import"
              element={<SchoolAdminRubricVersionImportPage />}
            />
            <Route
              path="school-admin/rubrics/:rubricId/versions/:versionId"
              element={<SchoolAdminRubricVersionDetailPage />}
            />
            <Route
              path="school-admin/rubrics/:rubricId/versions/:versionId/criteria/import"
              element={<SchoolAdminRubricCriterionImportPage />}
            />
            <Route
              path="school-admin/rubrics/:rubricId/versions/:versionId/bands/import"
              element={<SchoolAdminRubricResultBandImportPage />}
            />
            <Route
              path="school-admin/rubrics/:rubricId/versions/:versionId/criteria/:criterionId"
              element={<SchoolAdminRubricCriterionDetailPage />}
            />
            <Route
              path="school-admin/rubrics/:rubricId/versions/:versionId/criteria/:criterionId/bands/import"
              element={<SchoolAdminRubricCriterionBandImportPage />}
            />
            <Route
              path="school-admin/assessment-policies"
              element={<SchoolAdminAssessmentPoliciesPage />}
            />
            <Route
              path="school-admin/assessment-policies/import"
              element={<SchoolAdminAssessmentPolicyImportPage />}
            />
            <Route
              path="school-admin/assessment-policies/:policyId"
              element={<SchoolAdminAssessmentPolicyDetailPage />}
            />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
