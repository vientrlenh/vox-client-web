// src/features/rubrics_school/components/clonePolicySelection.ts

/**
 * Lựa chọn của trường cho MỘT chính sách mẫu được sao kèm bộ tiêu chí.
 *
 * Tách khỏi {@link ClonePolicyTemplateRow} vì react-refresh yêu cầu file component chỉ export
 * component.
 */
export type ClonePolicySelection = {
  gradeLevelId: string;
  schoolGradeId: string;
  schoolClassId: string;
  effectiveFrom: string;
  effectiveTo: string;
};

export const EMPTY_POLICY_SELECTION: ClonePolicySelection = {
  gradeLevelId: '',
  schoolGradeId: '',
  schoolClassId: '',
  effectiveFrom: '',
  effectiveTo: '',
};
