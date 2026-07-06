// src/features/rubric_system/types.ts

// ==========================================
// 1. RUBRIC (Thông tin chung)
// ==========================================
export type Rubric = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  languageId: string;
  frameworkId: string;
  ownerType: string;
  currentVersionId?: string | null;
  language?: { name: string } | null;
  framework?: { name: string } | null;
};

export type RubricPage = {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  content: Rubric[];
};

// ==========================================
// 2. RUBRIC VERSION (Phiên bản của Rubric)
// ==========================================
export type RubricVersion = {
  id: string;
  rubricId: string;
  version: number;
  code: string;
  name: string;
  description?: string | null;
  status: string; // DRAFT, PUBLISHED, ARCHIVED
  effectiveFrom: string;
  effectiveTo?: string | null;
  scoringScaleMin: number;
  scoringScaleMax: number;
  totalScoreMethod: string;
};

export type RubricVersionPage = {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  content: RubricVersion[];
};

// ==========================================
// 3. RUBRIC CRITERION (Tiêu chí chấm điểm)
// ==========================================
export type RubricCriterion = {
  id: string;
  rubricVersionId: string;
  frameworkCriterionId: string;
  code: string;
  name: string;
  description?: string | null;
  examplesJson?: string | null; // Chuỗi JSON từ backend
  weight: number;
  minScore: number;
  maxScore: number;
  order: number;
  isRequired: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type RubricCriterionPage = {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  content: RubricCriterion[];
};

// ==========================================
// 4. RUBRIC CRITERION BAND (Mức điểm chi tiết của Tiêu chí)
// ==========================================
export type RubricCriterionBand = {
  id: string;
  criterionId: string;
  code: string;
  scoreMin: number;
  scoreMax: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type RubricCriterionBandPage = {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  content: RubricCriterionBand[];
};

// ==========================================
// 5. RUBRIC RESULT BAND (Xếp loại kết quả cuối cùng)
// ==========================================
export type RubricResultBand = {
  id: string;
  rubricVersionId: string;
  code: string;
  name: string;
  description?: string | null;
  scoreMin: number;
  scoreMax: number;
  order: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type RubricResultBandPage = {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  content: RubricResultBand[];
};

// ==========================================
// 6. IMPORT RUBRIC VERSION (Excel/CSV) - System Admin
// ==========================================
export type PreviewRubricVersionImportResponse = {
  importSessionId: string;
  fileName: string;
  originalHeaders: string[];
  sampleRows: Record<string, string | null | undefined>[];
  suggestedMapping: Record<string, string | null | undefined>;
  totalRows: number;
  expiresAt: string | null;
};

export type AcceptRubricVersionImportRequest = {
  confirmedMapping: Record<string, string>;
};

export type AcceptRubricVersionImportResponse = {
  importSessionId: string;
  importedRows: number;
  invalidRows: number;
  skippedRows: number;
  status: string;
  totalRows: number;
};

// ==========================================
// 7. IMPORT RUBRIC CRITERION (Excel/CSV) - System Admin
// ==========================================
export type PreviewRubricCriterionImportResponse = {
  importSessionId: string;
  fileName: string;
  originalHeaders: string[];
  sampleRows: Record<string, string | null | undefined>[];
  suggestedMapping: Record<string, string | null | undefined>;
  totalRows: number;
  expiresAt: string | null;
};

export type AcceptRubricCriterionImportRequest = {
  confirmedMapping: Record<string, string>;
};

export type AcceptRubricCriterionImportResponse = {
  importSessionId: string;
  importedRows: number;
  invalidRows: number;
  skippedRows: number;
  status: string;
  totalRows: number;
};

// ==========================================
// 8. IMPORT RUBRIC CRITERION BAND (Excel/CSV) - System Admin
// ==========================================
export type PreviewRubricCriterionBandImportResponse = {
  sessionId: string;
  fileName: string;
  originalHeaders: string[];
  sampleRows: Record<string, string | null | undefined>[];
  suggestedMapping: Record<string, string | null | undefined>;
  totalRows: number;
  expiresAt: string | null;
};

export type AcceptRubricCriterionBandImportRequest = {
  confirmedMapping: Record<string, string>;
};

export type AcceptRubricCriterionBandImportResponse = {
  sessionId: string;
  importedRows: number;
  invalidRows: number;
  skippedRows: number;
  status: string;
  totalRows: number;
};

export function formatRubricImportDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN');
}
