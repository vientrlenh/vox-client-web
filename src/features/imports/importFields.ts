export type ImportField = {
  // Ghi chú thêm hiển thị dưới dạng tooltip cạnh lựa chọn cột — dùng cho các
  // trường có cú pháp riêng (VD: positiveSignals/negativeSignals) mà tên
  // trường không tự giải thích được.
  hint?: string
  isRequired: boolean
  label: string
  value: string
}

const FRAMEWORK_SIGNAL_HINT =
  'Cú pháp mỗi tín hiệu: code|description|importance|evidenceHint. Nhiều tín hiệu cách nhau bằng dấu ";". importance thuộc {HIGH, MEDIUM, LOW}. VD: CLR1|Phát âm rõ ràng|HIGH|Nghe được toàn bộ câu;CLR2|Ngập ngừng nhẹ|LOW|'

export const IMPORT_FIELDS_BY_TYPE: Record<string, ImportField[]> = {
  ASSESSMENT_POLICY: [
    { isRequired: true, label: 'Ngôn ngữ', value: 'language' },
    { isRequired: true, label: 'Phiên bản khung', value: 'frameworkVersion' },
    { isRequired: true, label: 'Phiên bản rubric', value: 'rubricVersion' },
    { isRequired: true, label: 'Band mục tiêu', value: 'targetFrameworkBand' },
    { isRequired: true, label: 'Ngày bắt đầu', value: 'effectiveFrom' },
    { isRequired: false, label: 'Ngày kết thúc', value: 'effectiveTo' },
    { isRequired: false, label: 'Điểm đạt', value: 'passingScore' },
    { isRequired: false, label: 'Mức độ nghiêm ngặt', value: 'strictness' },
    // Backend yêu cầu điền ít nhất một trong ba phạm vi dưới đây, nhưng không
    // trường nào bắt buộc riêng lẻ nên để isRequired: false.
    { isRequired: false, label: 'Khối', value: 'schoolGradeLevel' },
    { isRequired: false, label: 'Khối năm học', value: 'schoolGrade' },
    { isRequired: false, label: 'Lớp', value: 'schoolClass' },
  ],
  FRAMEWORK_CRITERION: [
    {
      hint: 'Phải khớp một FrameworkCriterionCode được backend cho phép; dòng có mã không hợp lệ sẽ bị đánh dấu lỗi.',
      isRequired: true,
      label: 'Mã tiêu chí (code)',
      value: 'code',
    },
    { isRequired: true, label: 'Tên tiêu chí', value: 'name' },
    { isRequired: false, label: 'Mô tả', value: 'description' },
    { isRequired: true, label: 'Thứ tự (order)', value: 'order' },
  ],
  FRAMEWORK_CRITERION_BAND: [
    { isRequired: true, label: 'Mã tiêu chí (criterionCode)', value: 'criterionCode' },
    { isRequired: true, label: 'Mã thang kết quả (resultBandCode)', value: 'resultBandCode' },
    { isRequired: false, label: 'Mô tả mức đánh giá (descriptor)', value: 'descriptor' },
    {
      hint: FRAMEWORK_SIGNAL_HINT,
      isRequired: false,
      label: 'Tín hiệu tích cực (positiveSignals)',
      value: 'positiveSignals',
    },
    {
      hint: FRAMEWORK_SIGNAL_HINT,
      isRequired: false,
      label: 'Tín hiệu tiêu cực (negativeSignals)',
      value: 'negativeSignals',
    },
  ],
  FRAMEWORK_RESULT_BAND: [
    { isRequired: true, label: 'Mã thang kết quả (code)', value: 'code' },
    { isRequired: true, label: 'Nhãn (label)', value: 'label' },
    { isRequired: false, label: 'Mô tả', value: 'description' },
    { isRequired: true, label: 'Thứ tự (order)', value: 'order' },
  ],
  FRAMEWORK_VERSION: [
    { isRequired: true, label: 'Số phiên bản (version)', value: 'version' },
    { isRequired: true, label: 'Tên phiên bản', value: 'name' },
    { isRequired: false, label: 'Mô tả', value: 'description' },
    { isRequired: true, label: 'Hiệu lực từ ngày', value: 'effectiveFrom' },
    { isRequired: false, label: 'Hiệu lực đến ngày', value: 'effectiveTo' },
  ],
  QUESTION_BANK: [
    { isRequired: true, label: 'Mã ngân hàng', value: 'code' },
    { isRequired: true, label: 'Tên ngân hàng', value: 'name' },
    { isRequired: false, label: 'Mô tả', value: 'description' },
    // Bắt buộc khi TẠO MỚI (question_banks.language_id không nullable); dòng cập nhật ngân
    // hàng đã có thì bỏ trống được và giữ nguyên ngôn ngữ cũ. Nhận cả mã ("en") lẫn tên đầy đủ.
    { isRequired: true, label: 'Ngôn ngữ', value: 'language' },
  ],
  QUESTION_TOPIC: [
    // Ngân hàng đích chọn ở màn upload rồi ghim vào phiên import, KHÔNG khai trong file —
    // nên không có cột nào cho nó ở đây.
    { isRequired: true, label: 'Mã chủ đề', value: 'code' },
    { isRequired: true, label: 'Tên chủ đề', value: 'name' },
    { isRequired: false, label: 'Mô tả', value: 'description' },
  ],
  QUESTION: [
    { isRequired: false, label: 'Mã câu hỏi', value: 'code' },
    { isRequired: true, label: 'Loại câu hỏi', value: 'type' },
    { isRequired: true, label: 'Nội dung câu hỏi', value: 'questionText' },
    { isRequired: false, label: 'Hướng dẫn', value: 'instructionText' },
    { isRequired: false, label: 'Gợi ý', value: 'promptText' },
    { isRequired: false, label: 'Văn bản chuẩn bị', value: 'preparationText' },
    {
      isRequired: true,
      label: 'Thời gian chuẩn bị (giây)',
      value: 'preparationTimeSeconds',
    },
    {
      isRequired: true,
      label: 'Thời gian trả lời tối thiểu (giây)',
      value: 'minResponseSeconds',
    },
    {
      isRequired: true,
      label: 'Thời gian trả lời tối đa (giây)',
      value: 'maxResponseSeconds',
    },
    { isRequired: false, label: 'Chia sẻ', value: 'sharing' },
    // Tài nguyên kèm câu hỏi. Bỏ trống "Loại tài nguyên" thì câu hỏi không có tài nguyên.
    // Có khai loại thì mô tả (ảnh) / bản chép lời (audio, video) là BẮT BUỘC — AI không nhìn
    // được ảnh và không nghe được tệp, nó chỉ biết qua mấy dòng chữ đó.
    { isRequired: false, label: 'Loại tài nguyên', value: 'assetType' },
    { isRequired: false, label: 'Đường dẫn tài nguyên', value: 'assetUrl' },
    { isRequired: false, label: 'Tiêu đề tài nguyên', value: 'assetTitle' },
    { isRequired: false, label: 'Văn bản thay thế', value: 'assetAltText' },
    { isRequired: false, label: 'Bản chép lời', value: 'assetTranscript' },
    { isRequired: false, label: 'Mô tả tài nguyên', value: 'assetDescription' },
    { isRequired: false, label: 'Thời lượng tài nguyên', value: 'assetDurationSeconds' },
    {
      isRequired: false,
      label: 'Nội dung mong đợi',
      value: 'evaluationExpectedContent',
    },
    { isRequired: false, label: 'Ý chính', value: 'evaluationKeyPoints' },
    {
      isRequired: false,
      label: 'Câu trả lời chấp nhận',
      value: 'evaluationAcceptableResponses',
    },
    {
      isRequired: false,
      label: 'Ví dụ lạc đề',
      value: 'evaluationOffTopicExamples',
    },
    {
      isRequired: false,
      label: 'Gợi ý chấm điểm',
      value: 'evaluationScoringHints',
    },
    {
      isRequired: false,
      label: 'Lỗi thường gặp',
      value: 'evaluationCommonMistakes',
    },
  ],
  RUBRIC_CRITERION: [
    {
      isRequired: true,
      label: 'Mã Khung tiêu chuẩn (VD: GRAMMAR, FLUENCY...)',
      value: 'frameworkCriterionCode',
    },
    { isRequired: true, label: 'Mã Code', value: 'code' },
    { isRequired: true, label: 'Tên Tiêu chí', value: 'name' },
    { isRequired: false, label: 'Mô tả', value: 'description' },
    { isRequired: true, label: 'Trọng số (Weight)', value: 'weight' },
    { isRequired: true, label: 'Điểm tối thiểu (Min)', value: 'minScore' },
    { isRequired: true, label: 'Điểm tối đa (Max)', value: 'maxScore' },
    { isRequired: true, label: 'Thứ tự (Order)', value: 'order' },
    { isRequired: false, label: 'Bắt buộc (true/false)', value: 'isRequired' },
    {
      isRequired: false,
      label: 'Ví dụ minh họa (cách nhau bằng dấu ";")',
      value: 'examples',
    },
  ],
  RUBRIC_CRITERION_BAND: [
    { isRequired: true, label: 'Mã Mức độ (Code)', value: 'code' },
    { isRequired: true, label: 'Điểm tối thiểu (Min)', value: 'scoreMin' },
    { isRequired: true, label: 'Điểm tối đa (Max)', value: 'scoreMax' },
  ],
  RUBRIC_RESULT_BAND: [
    { isRequired: true, label: 'Mã Band', value: 'code' },
    { isRequired: true, label: 'Tên Mức điểm', value: 'name' },
    { isRequired: false, label: 'Mô tả', value: 'description' },
    { isRequired: true, label: 'Điểm tối thiểu (Min)', value: 'scoreMin' },
    { isRequired: true, label: 'Điểm tối đa (Max)', value: 'scoreMax' },
    { isRequired: true, label: 'Thứ tự (Order)', value: 'order' },
  ],
  RUBRIC_VERSION: [
    { isRequired: true, label: 'Số Version', value: 'version' },
    { isRequired: true, label: 'Tên phiên bản', value: 'name' },
    { isRequired: false, label: 'Mô tả', value: 'description' },
    {
      isRequired: true,
      label: 'Cách tính tổng điểm',
      value: 'totalScoreMethod',
    },
    { isRequired: true, label: 'Điểm tối thiểu', value: 'scoringScaleMin' },
    { isRequired: true, label: 'Điểm tối đa', value: 'scoringScaleMax' },
    { isRequired: true, label: 'Áp dụng từ ngày', value: 'effectiveFrom' },
    { isRequired: false, label: 'Đến ngày', value: 'effectiveTo' },
  ],
  SCHOOL_CLASS: [
    { isRequired: true, label: 'Mã lớp', value: 'code' },
    { isRequired: true, label: 'Tên lớp', value: 'name' },
    { isRequired: true, label: 'Mã ngôn ngữ', value: 'languageCode' },
    { isRequired: true, label: 'Mã khối lớp', value: 'schoolGradeCode' },
    { isRequired: false, label: 'Mô tả', value: 'description' },
  ],
  SCHOOL_CLASS_USER: [
    { isRequired: true, label: 'Email', value: 'email' },
    { isRequired: true, label: 'Mã lớp', value: 'classCode' },
  ],
  SCHOOL_DIRECTORY: [
    { isRequired: true, label: 'Mã trường', value: 'code' },
    { isRequired: true, label: 'Tên trường', value: 'name' },
    { isRequired: false, label: 'Mã tỉnh', value: 'provinceCode' },
    { isRequired: false, label: 'Tên tỉnh', value: 'provinceName' },
    { isRequired: false, label: 'Tên quận/huyện', value: 'districtName' },
    { isRequired: false, label: 'Domain', value: 'domain' },
    { isRequired: false, label: 'Địa chỉ', value: 'address' },
    { isRequired: false, label: 'Nguồn gốc', value: 'origin' },
  ],
  SCHOOL_GRADE: [
    // Backend bắt buộc schoolGradeLevelCode để biết năm học thuộc khối nào.
    { isRequired: true, label: 'Mã khối', value: 'schoolGradeLevelCode' },
    { isRequired: true, label: 'Mã năm học', value: 'code' },
    { isRequired: true, label: 'Tên năm học', value: 'name' },
    { isRequired: true, label: 'Ngày bắt đầu', value: 'startDate' },
    { isRequired: true, label: 'Ngày kết thúc', value: 'endDate' },
    { isRequired: false, label: 'Mô tả', value: 'description' },
  ],
  SCHOOL_ROOM: [
    { isRequired: true, label: 'Mã phòng', value: 'code' },
    { isRequired: true, label: 'Tên phòng', value: 'name' },
    { isRequired: false, label: 'Mô tả', value: 'description' },
  ],
  USER: [
    { isRequired: true, label: 'Email', value: 'email' },
    { isRequired: true, label: 'Họ tên', value: 'fullName' },
    { isRequired: true, label: 'Vai trò', value: 'roleCode' },
    { isRequired: true, label: 'Số điện thoại', value: 'phone' },
    { isRequired: true, label: 'Ngày sinh', value: 'dateOfBirth' },
    { isRequired: true, label: 'Ngày bắt đầu', value: 'startDate' },
    { isRequired: true, label: 'Ngày kết thúc', value: 'endDate' },
    { isRequired: true, label: 'Địa chỉ', value: 'address' },
  ],
}

export function getImportFields(type?: string | null): ImportField[] {
  const normalized = type?.trim().toUpperCase()

  if (!normalized) {
    return []
  }

  return IMPORT_FIELDS_BY_TYPE[normalized] ?? []
}

export function getMissingRequiredFields(
  fields: ImportField[],
  mapping: Record<string, string>,
) {
  const mappedFields = new Set(
    Object.values(mapping)
      .map((value) => value.trim())
      .filter(Boolean),
  )

  return fields.filter(
    (field) => field.isRequired && !mappedFields.has(field.value),
  )
}
