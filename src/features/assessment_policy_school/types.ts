// src/features/assessment_policy_school/types.ts

// ==========================================
// 1. ASSESSMENT POLICY (Thông tin chung)
// ==========================================
export type AssessmentPolicyStrictness = 'LENIENT' | 'STANDARD' | 'STRICT';

export type AssessmentPolicy = {
  id: string;
  languageId: string;
  frameworkVersionId: string;
  rubricVersionId: string;
  targetFrameworkBandId: string;
  passingScore?: number | null;
  strictness: AssessmentPolicyStrictness;
  version: number;
  status: string; // DRAFT, PUBLISHED, ARCHIVED
  effectiveFrom: string;
  effectiveTo?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  language?: { name: string } | null;
  frameworkVersion?: {
    code: string;
    name: string;
    version: number;
    status?: string;
    effectiveFrom?: string | null;
    effectiveTo?: string | null;
    resultBands?: { id: string; code: string; label: string; order: number }[];
  } | null;
  rubricVersion?: {
    code: string;
    name: string;
    version: number;
    status?: string;
    effectiveFrom?: string | null;
    effectiveTo?: string | null;
  } | null;
  targetFrameworkBand?: { code: string; label: string } | null;
  school?: { id: string; code?: string | null; name?: string | null } | null;
  // Chỉ School Admin mới có phạm vi áp dụng hẹp hơn (tất cả null = áp dụng toàn trường).
  schoolGradeLevel?: { id: string; code?: string | null; name?: string | null } | null;
  schoolGrade?: { id: string; code?: string | null; name?: string | null } | null;
  schoolClass?: { id: string; code?: string | null; name?: string | null } | null;
};

export type AssessmentPolicyPage = {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  content: AssessmentPolicy[];
};

// ==========================================
// 1b. ASSESSMENT POLICY DETAIL (trang chi tiết, thông tin đầy đủ hơn)
// ==========================================
export type AssessmentPolicyRelatedEntity = {
  id: string;
  code?: string | null;
  name?: string | null;
};

export type FrameworkVersionDetail = {
  id: string;
  code: string;
  name: string;
  version: number;
  status: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  resultBands?: { id: string; code: string; label: string; order: number }[];
};

export type RubricVersionDetail = {
  id: string;
  code: string;
  name: string;
  version: number;
  status: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
};

export type FrameworkResultBandDetail = {
  id: string;
  code: string;
  label: string;
  description?: string | null;
  order: number;
};

export type AssessmentPolicyDetail = Omit<
  AssessmentPolicy,
  'language' | 'frameworkVersion' | 'rubricVersion' | 'targetFrameworkBand' | 'school' | 'schoolGradeLevel' | 'schoolGrade' | 'schoolClass'
> & {
  schoolId?: string | null;
  school?: AssessmentPolicyRelatedEntity | null;
  schoolGradeLevel?: AssessmentPolicyRelatedEntity | null;
  schoolGrade?: AssessmentPolicyRelatedEntity | null;
  schoolClass?: AssessmentPolicyRelatedEntity | null;
  language?: AssessmentPolicyRelatedEntity | null;
  frameworkVersion?: FrameworkVersionDetail | null;
  rubricVersion?: RubricVersionDetail | null;
  targetFrameworkBand?: FrameworkResultBandDetail | null;
};

// ==========================================
// 2. OPTIONS DÙNG CHO DROPDOWN Ở FORM
// ==========================================
export type FrameworkOption = {
  id: string;
  name: string;
};

export type LanguageOption = {
  id: string;
  name: string;
};

export type FrameworkResultBandOption = {
  id: string;
  code: string;
  label: string;
  order: number;
};

export type FrameworkVersionOption = {
  id: string;
  code: string;
  name: string;
  version: number;
  status: string;
  resultBands?: FrameworkResultBandOption[];
};

export type FrameworkCriterionOption = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  order: number;
};

export type RubricOption = {
  id: string;
  code: string;
  name: string;
  frameworkId: string;
  languageId: string;
};

export type RubricVersionOption = {
  id: string;
  code: string;
  name: string;
  version: number;
  status: string;
};

// ==========================================
// 3. CREATE / UPDATE PAYLOAD
// ==========================================
export type CreateAssessmentPolicyPayload = {
  frameworkVersionId: string;
  rubricVersionIds: string[];
  languageId: string;
  targetFrameworkBandId: string;
  passingScore?: number;
  strictness?: AssessmentPolicyStrictness;
  effectiveFrom: string;
  effectiveTo?: string;
  // Tùy chọn: giới hạn phạm vi áp dụng hẹp hơn toàn trường — chỉ set 1 trong 3,
  // ứng với cấp hẹp nhất được chọn (chọn Lớp thì không cần set Khối/Niên khóa).
  schoolGradeLevelId?: string;
  schoolGradeId?: string;
  schoolClassId?: string;
};

export type UpdateAssessmentPolicyPayload = {
  targetFrameworkBandId: string;
  passingScore?: number;
  strictness?: AssessmentPolicyStrictness;
  effectiveFrom: string;
  effectiveTo?: string;
};

// ==========================================
// 4. IMPORT ASSESSMENT POLICY (Excel/CSV) - School Admin
// ==========================================
export type PreviewAssessmentPolicyImportResponse = {
  importSessionId: string;
  fileName: string;
  originalHeaders: string[];
  sampleRows: Record<string, string | null | undefined>[];
  suggestedMapping: Record<string, string | null | undefined>;
  totalRows: number;
  expiresAt: string | null;
};

export type AcceptAssessmentPolicyImportRequest = {
  confirmedMapping: Record<string, string>;
};

export type AcceptAssessmentPolicyImportResponse = {
  importSessionId: string;
  importedRows: number;
  invalidRows: number;
  skippedRows: number;
  status: string;
  totalRows: number;
};

export function formatAssessmentPolicyDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN');
}
