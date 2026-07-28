// Nguồn sự thật duy nhất cho enum ImportType / ImportSessionStatus của backend.
// Giá trị phải khớp tuyệt đối tên enum, backend dùng valueOf và sẽ trả
// "Loại import không hợp lệ" / "Trạng thái import không hợp lệ" nếu sai.

export const IMPORT_TYPE_VALUES = [
  'USER',
  'SCHOOL_CLASS',
  'SCHOOL_CLASS_USER',
  'SCHOOL_DIRECTORY',
  'SCHOOL_GRADE_LEVEL',
  'SCHOOL_GRADE',
  'SCHOOL_ROOM',
  'QUESTION',
  'RUBRIC_VERSION',
  'RUBRIC_CRITERION',
  'RUBRIC_CRITERION_BAND',
  'RUBRIC_RESULT_BAND',
  'ASSESSMENT_POLICY',
] as const

export type ImportTypeValue = (typeof IMPORT_TYPE_VALUES)[number]

export const IMPORT_TYPE_LABELS: Record<ImportTypeValue, string> = {
  ASSESSMENT_POLICY: 'Chính sách đánh giá',
  QUESTION: 'Câu hỏi',
  RUBRIC_CRITERION: 'Tiêu chí rubric',
  RUBRIC_CRITERION_BAND: 'Mức điểm tiêu chí',
  RUBRIC_RESULT_BAND: 'Mức điểm kết quả',
  RUBRIC_VERSION: 'Phiên bản rubric',
  SCHOOL_CLASS: 'Lớp học',
  SCHOOL_CLASS_USER: 'Học viên trong lớp',
  SCHOOL_DIRECTORY: 'Danh mục trường',
  SCHOOL_GRADE: 'Năm học',
  SCHOOL_GRADE_LEVEL: 'Khối',
  SCHOOL_ROOM: 'Phòng học',
  USER: 'Người dùng',
}

export type ImportTypeGroup = {
  label: string
  types: ImportTypeValue[]
}

export const IMPORT_TYPE_GROUPS: ImportTypeGroup[] = [
  {
    label: 'Trường học',
    types: [
      'SCHOOL_CLASS',
      'SCHOOL_CLASS_USER',
      'USER',
      'SCHOOL_GRADE_LEVEL',
      'SCHOOL_GRADE',
      'SCHOOL_ROOM',
      'SCHOOL_DIRECTORY',
    ],
  },
  {
    label: 'Rubric',
    types: [
      'RUBRIC_VERSION',
      'RUBRIC_CRITERION',
      'RUBRIC_CRITERION_BAND',
      'RUBRIC_RESULT_BAND',
    ],
  },
  {
    label: 'Khác',
    types: ['QUESTION', 'ASSESSMENT_POLICY'],
  },
]

export const IMPORT_STATUS_VALUES = [
  'PREVIEWED',
  'QUEUED',
  'VALIDATING',
  'IMPORTING',
  'COMPLETED',
  'FAILED',
  'EXPIRED',
  'CANCELLED',
] as const

export type ImportStatusValue = (typeof IMPORT_STATUS_VALUES)[number]

export type ImportStatusDisplay = {
  className: string
  label: string
}

export const IMPORT_STATUS_DISPLAY: Record<
  ImportStatusValue,
  ImportStatusDisplay
> = {
  CANCELLED: {
    className: 'border-slate-200 bg-slate-100 text-slate-600',
    label: 'Đã hủy',
  },
  COMPLETED: {
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    label: 'Hoàn tất',
  },
  EXPIRED: {
    className: 'border-amber-200 bg-amber-50 text-amber-700',
    label: 'Hết hạn',
  },
  FAILED: {
    className: 'border-red-200 bg-red-50 text-red-700',
    label: 'Thất bại',
  },
  IMPORTING: {
    className: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    label: 'Đang import',
  },
  PREVIEWED: {
    className: 'border-blue-200 bg-blue-50 text-blue-700',
    label: 'Đang preview',
  },
  QUEUED: {
    className: 'border-amber-200 bg-amber-50 text-amber-700',
    label: 'Đang chờ',
  },
  VALIDATING: {
    className: 'border-sky-200 bg-sky-50 text-sky-700',
    label: 'Đang kiểm tra',
  },
}

export function normalizeImportKey(value?: string | null) {
  return value?.trim().toUpperCase() ?? ''
}
