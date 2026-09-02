// Phần của giáo viên đã dồn về feature `grading` (vòng chấm APPEAL) — ở đây chỉ còn
// màn quản lý đơn của quản trị trường.
export {
  SchoolAdminReevaluationPage,
  SchoolAdminReevaluationDetailPage,
} from './pages/ReevaluationPages'

// ---------------------------------------------------------------------------
// Bề mặt dùng lại cho `features/classTestGrading` — bài kiểm tra trên lớp do chính
// giáo viên tạo bài duyệt đơn và tự nhận chấm phúc khảo (BE: `authorizeSchoolAdminOrClassTestChair`).
// ---------------------------------------------------------------------------
export * from './types'
export {
  reevaluationKeys,
  useAppealQuery,
  useAppealReviewersQuery,
} from './api/useReevaluationQueries'
export {
  useApproveAndClaimMutation,
  useApproveMutation,
  useAssignMutation,
  useRejectMutation,
} from './api/useReevaluationMutations'
export {
  examAppealKeys,
  fetchExamAppeals,
  useExamAppealsQuery,
} from './api/useExamAppealsQuery'
export type { FetchExamAppealsInput } from './api/useExamAppealsQuery'
export { ApproveDialog } from './components/ApproveDialog'
export { RejectDialog } from './components/RejectDialog'
