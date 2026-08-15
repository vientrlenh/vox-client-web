// src/features/rubrics/types.ts

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
  createdAt?: string | null;
  /**
   * Phiên bản mẫu mà bản này được sao ra; null/thiếu nghĩa là do chính trường soạn.
   *
   * Chỉ dùng để đánh dấu xuất xứ. Không tra ngược ra tên bản mẫu được: các cổng đọc rubric của hệ
   * thống chỉ mở cho SYSTEM_ADMIN, nên phía trường chỉ biết "đây là bản sao", không biết sao từ đâu.
   */
  sourceRubricVersionId?: string | null;
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
// 3b. FRAMEWORK OPTIONS (dùng cho dropdown chọn Framework Criterion)
// ==========================================
export type FrameworkVersionOption = {
  id: string;
  code: string;
  name: string;
  version: number;
  status: string;
};

export type FrameworkCriterionOption = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  order: number;
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
// 6. IMPORT RUBRIC VERSION (Excel/CSV) - School Admin
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

export function formatRubricImportDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN');
}

// ==========================================
// 7. IMPORT RUBRIC CRITERION (Excel/CSV) - School Admin
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
// 8. IMPORT RUBRIC RESULT BAND (Excel/CSV) - School Admin
// ==========================================
export type PreviewRubricResultBandImportResponse = {
  sessionId: string;
  fileName: string;
  originalHeaders: string[];
  sampleRows: Record<string, string | null | undefined>[];
  suggestedMapping: Record<string, string | null | undefined>;
  totalRows: number;
  expiresAt: string | null;
};

export type AcceptRubricResultBandImportRequest = {
  confirmedMapping: Record<string, string>;
};

export type AcceptRubricResultBandImportResponse = {
  sessionId: string;
  importedRows: number;
  invalidRows: number;
  skippedRows: number;
  status: string;
  totalRows: number;
};

// ==========================================
// 9. IMPORT RUBRIC CRITERION BAND (Excel/CSV) - School Admin
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

// ==========================================
// TRỌNG SỐ & PHƯƠNG PHÁP TÍNH ĐIỂM
// ==========================================

/**
 * Backend lưu trọng số dưới dạng PHÂN SỐ (0.2 nghĩa là 20%), không phải số phần trăm.
 *
 * Quy ước do đường import file đặt ra (`RubricCriterionImportCommitHandler` chia 100 trước khi lưu)
 * và phép kiểm lúc publish dựa vào. Giao diện quy đổi ở hai đầu để người dùng luôn làm việc với
 * phần trăm — trước đây bảng tiêu chí in thẳng `{weight}%`, nên một cấu hình ĐÚNG (0.2) lại hiện ra
 * thành "0.2%", còn người gõ "20" theo dấu phần trăm đó thì lưu sai 100 lần.
 *
 * Cột `weight` là numeric(6,2), nên phần trăm luôn là số nguyên.
 */
export function weightToPercent(weight: number | null | undefined): number {
  if (weight === null || weight === undefined || Number.isNaN(weight)) {
    return 0;
  }
  return Math.round(weight * 100);
}

export function percentToWeight(percent: number): number {
  return Math.round(percent) / 100;
}

/**
 * Hai giá trị của `totalScoreMethod` KHÔNG phải hai phép tính khác nhau — điểm một câu luôn là
 * `Σ(điểm × trọng số) / Σtrọng số`. Chúng khác nhau ở ràng buộc tổng trọng số lúc publish, tức khác
 * ở CÁCH KHAI:
 *
 * - `SUM` (phân bổ): mỗi tiêu chí chiếm một phần trăm của tổng, cộng lại đúng 100%.
 * - `WEIGHTED_AVERAGE` (trung bình): mọi tiêu chí cân bằng ở 100%, gộp lại thành trung bình cộng.
 *
 * Cả hai đều chấm mỗi tiêu chí trên TOÀN thang của phiên bản.
 */
export const RUBRIC_ALLOCATION_METHOD = 'SUM';
export const RUBRIC_AVERAGE_METHOD = 'WEIGHTED_AVERAGE';

/** Tổng phần trăm mà chế độ phân bổ phải đạt đúng. */
export const RUBRIC_ALLOCATION_TOTAL_PERCENT = 100;

/** Trọng số chế độ trung bình gán cho mọi tiêu chí (100%). */
export const RUBRIC_AVERAGE_WEIGHT = 1;

export function isAllocationMethod(method?: string | null): boolean {
  return method === RUBRIC_ALLOCATION_METHOD;
}

export function rubricTotalScoreMethodLabel(method?: string | null): string {
  if (method === RUBRIC_ALLOCATION_METHOD) return 'Phân bổ trọng số';
  if (method === RUBRIC_AVERAGE_METHOD) return 'Trung bình';
  return method ?? '—';
}

export function rubricTotalScoreMethodHint(method?: string | null): string {
  if (method === RUBRIC_ALLOCATION_METHOD) {
    return 'Mỗi tiêu chí chiếm một phần trăm của tổng điểm, cộng lại phải đúng 100%.';
  }
  if (method === RUBRIC_AVERAGE_METHOD) {
    return 'Mọi tiêu chí cân bằng nhau; điểm phiên bản là trung bình cộng của các tiêu chí.';
  }
  return '';
}
