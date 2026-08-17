/**
 * Khớp ASSIGNABLE_STATUSES của AssignExamCandidateScheduleUseCase: ca đã hoàn thành/dời/huỷ thì
 * backend từ chối xếp thí sinh, nên không đưa ra cho chọn.
 */
export const ASSIGNABLE_SCHEDULE_STATUSES = new Set(['DRAFT', 'PUBLISHED'])
