export { SchoolAdminGradingPage, TeacherGradingPage, TeacherGradingTaskPage } from './pages/GradingPages'

// ---------------------------------------------------------------------------
// Bề mặt dùng lại cho `features/classTestGrading`.
//
// Import QUA barrel này, đừng đâm thẳng vào đường dẫn nội bộ (`@/features/grading`
// chứ không phải `@/features/grading/components/...`): barrel là ranh giới công khai,
// đâm xuyên qua nó là biến mọi file nội bộ thành API công khai mà không ai định thế.
// ---------------------------------------------------------------------------

export { GradingTaskDetailView } from './pages/GradingPages'

export { ActionDialog, DeadlineField, ReasonField } from './components/ActionDialog'
export { AiEvaluationSummary } from './components/AiEvaluationSummary'
export { AiQualityPanel } from './components/AiQualityPanel'
export { CriterionScoreCard } from './components/CriterionScoreCard'
export { FinalizeExamDialog } from './components/FinalizeExamDialog'
export { GradedCriteriaSummary } from './components/GradedCriteriaSummary'
export { GradingDecisionDialog } from './components/GradingDecisionDialog'
export type { DecisionOutcome } from './components/GradingDecisionDialog'
export { GradingTurnList } from './components/GradingTurnList'
export { ResultHistoryDialog } from './components/ResultHistoryDialog'
export { RoundTypePicker } from './components/RoundTypePicker'
export { SegmentedControl } from './components/SegmentedControl'
export type { SegmentItem } from './components/SegmentedControl'
export { SubmitGradingDialog } from './components/SubmitGradingDialog'
export { ValidityRulesCard } from './components/ValidityRulesCard'

export * from './types'

export {
  fetchGradingTaskDetail,
  gradingKeys,
  useAiQualityReportQuery,
  useGradingAssignmentsQuery,
  useGradingStatsQuery,
  useGradingTaskDetailQuery,
  useResultStatusHistoryQuery,
} from './api/useGradingQueries'
export type { FetchGradingAssignmentsInput } from './api/useGradingQueries'

export {
  useClearInvalidResultMutation,
  useDeclineGradingAssignmentMutation,
  useInvalidateResultMutation,
  useRegradeResultMutation,
  useUpholdResultMutation,
} from './api/useGradingMutations'
export type { CriterionScoreInput, ItemGradeInput } from './api/useGradingMutations'

export { useGradingPreviewQuery } from './api/useGradingPreviewQuery'

export {
  downloadCsvBlob,
  type ExportExamScoresInput,
  useExportExamScoresExcelMutation,
  useExportExamScoresMutation,
  useFinalizeExamResultsMutation,
  useFinalizePreviewQuery,
} from './api/useExamResultMutations'
